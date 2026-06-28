import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Converts `amount` from one ISO-4217 currency to another using live rates
   * from the Open Exchange Rates API.
   *
   * WHY TWO-STEP (via USD)?
   * The free plan only provides USD as the base currency.  We normalise every
   * conversion through USD so any currency pair is supported.
   *
   * @param amount       - Numeric amount to convert
   * @param from         - Source currency code (e.g. "EUR")
   * @param to           - Target currency code (e.g. "CAD")
   * @returns            - Converted amount rounded to 2 decimal places
   */
  async convert(amount: number, from: string, to: string): Promise<number> {
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();

    this.logger.log(
      `[convertCurrencies] Tool called — ${amount} ${fromUpper} → ${toUpper}`,
    );

    try {
      const appId = this.configService.get<string>('OPEN_EXCHANGE_APP_ID');
      const url = `https://openexchangerates.org/api/latest.json?app_id=${appId}&base=USD`;

      this.logger.log(`[convertCurrencies] Calling Open Exchange Rates API...`);
      const response = await firstValueFrom(this.httpService.get(url));

      // Log API metadata so we know the rate is live and not cached/hallucinated
      const { timestamp, base, disclaimer } = response.data as {
        timestamp: number;
        base: string;
        disclaimer?: string;
        rates: Record<string, number>;
      };
      const rateDate = new Date(timestamp * 1000).toISOString();
      this.logger.log(
        `[convertCurrencies] Live rates received — base: ${base}, as of: ${rateDate}`,
      );

      const rates = response.data.rates as Record<string, number>;

      // Validate that both currency codes exist in the response
      if (!rates[fromUpper]) {
        throw new Error(`Unknown source currency code: "${fromUpper}"`);
      }
      if (!rates[toUpper]) {
        throw new Error(`Unknown target currency code: "${toUpper}"`);
      }

      // Log the two specific rates being used so we can verify them
      this.logger.log(
        `[convertCurrencies] Rate used: 1 USD = ${rates[fromUpper]} ${fromUpper} | 1 USD = ${rates[toUpper]} ${toUpper}`,
      );

      // Step 1: source currency → USD  (normalise through the API base)
      const amountInUsd = amount / rates[fromUpper];

      // Step 2: USD → target currency
      const result = parseFloat((amountInUsd * rates[toUpper]).toFixed(2));

      this.logger.log(
        `[convertCurrencies] Result: ${amount} ${fromUpper} = ${result} ${toUpper}` +
          ` (via USD: ${amountInUsd.toFixed(6)} USD)`,
      );

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`[convertCurrencies] Conversion failed: ${message}`);
      throw new InternalServerErrorException(
        'Failed to convert currencies. Please try again later.',
      );
    }
  }
}
