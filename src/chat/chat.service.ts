import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ProductsService } from '../products/products.service';
import { CurrencyService } from '../currency/currency.service';
import { chatTools } from './tools/chat.tools';

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private productsService: ProductsService,
    private currencyService: CurrencyService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  async chat(userMessage: string): Promise<string> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'user', content: userMessage },
    ];

    let loopCount = 0;
    while (loopCount < 5) {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: chatTools,
      });

      const message = response.choices[0].message;
      messages.push(message);

      if (message.content) return message.content;

      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          const funcObj =
            (toolCall as any).function ?? (toolCall as any).tool ?? null;
          const funcName = funcObj?.name ?? (toolCall as any).name;
          const funcArgsRaw =
            funcObj?.arguments ??
            (toolCall as any).arguments ??
            (toolCall as any).args ??
            '{}';
          let args: any;
          try {
            args =
              typeof funcArgsRaw === 'string'
                ? JSON.parse(funcArgsRaw)
                : funcArgsRaw;
          } catch {
            args = funcArgsRaw;
          }

          let result: any;

          if (funcName === 'searchProducts') {
            result = this.productsService.search(args.query);
          } else if (funcName === 'convertCurrencies') {
            result = await this.currencyService.convert(
              args.amount,
              args.fromCurrency,
              args.toCurrency,
            );
          }

          messages.push({
            role: 'tool',
            tool_call_id: (toolCall as any).id,
            content: JSON.stringify(result),
          });
        }
      }
      loopCount++;
    }
    return "I'm sorry, I couldn't process your request.";
  }
}
