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

  async convert(amount: number, from: string, to: string): Promise<number> {
    try {
      const appId = this.configService.get<string>('OPEN_EXCHANGE_APP_ID');
      const url = `https://openexchangerates.org/api/latest.json?app_id=${appId}&base=USD`;
      // Open Exchange HTTP petition
      const response = await firstValueFrom(this.httpService.get(url));
      const rates = response.data.rates;

      // Check if the provided currency codes are valid
      if (!rates[from] || !rates[to]) {
        throw new Error(`Invalid currency codes provided: ${from} or ${to}`);
      }

      // Normalization logic in two steps
      // (due to the free account restriction to directly convert between non-USD currencies)
      // Step 1: Convert the source currency to USD
      const amountInUsd = amount / rates[from];

      // Step 2: Convert the USD amount to the target currency
      const result = amountInUsd * rates[to];

      // Round the result to 2 decimal places and return it
      return parseFloat(result.toFixed(2));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`Currency conversion failed: ${message}`);
      throw new InternalServerErrorException(
        'Failed to convert currencies. Please try again later.',
      );
    }
  }
}
