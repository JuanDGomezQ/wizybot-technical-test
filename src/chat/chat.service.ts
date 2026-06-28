import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ProductsService } from '../products/products.service';
import { CurrencyService } from '../currency/currency.service';
import { chatTools } from './tools/chat.tools';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatMemoryService } from './chat-memory.service';

/** Maximum number of tool-call iterations before bailing out. */
const MAX_LOOP_ITERATIONS = 5;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly productsService: ProductsService,
    private readonly currencyService: CurrencyService,
    private readonly chatMemoryService: ChatMemoryService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Main entry point for the chatbot pipeline.
   *
   * Implements the two-call (multi-turn) tool-use loop:
   *   1. Send user message + available tools to OpenAI.
   *   2. If the model requests a tool, execute it locally and feed the result back.
   *   3. Repeat until the model returns a final text response (finish_reason === 'stop').
   *
   * WHY TYPE NARROWING ON toolCall.type?
   * openai SDK v6.x defines ChatCompletionMessageToolCall as a discriminated union:
   *   | ChatCompletionMessageFunctionToolCall  (type: 'function') → has .function
   *   | ChatCompletionMessageCustomToolCall    (type: 'custom')   → has .custom
   * TypeScript cannot guarantee .function exists on the union, so we must narrow
   * with `toolCall.type === 'function'` before accessing it — or the compiler
   * throws TS2339.  In practice, our chatTools only define 'function' tools, so
   * the 'custom' branch will never execute at runtime.
   *
   * @param userMessage - Raw user enquiry string from the HTTP request
   * @returns           - Final natural-language response from the LLM
   */
  async chat(dto: ChatRequestDto): Promise<string> {
    const { message: userMessage, sessionId = 'default' } = dto;
    this.logger.log(
      `[chat] New request — session: "${sessionId}", msg: "${userMessage}"`,
    );
    const history = this.chatMemoryService.getHistory(sessionId);
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      ...history,
      { role: 'user', content: userMessage },
    ];

    let iteration = 0;

    while (iteration < MAX_LOOP_ITERATIONS) {
      iteration++;
      this.logger.log(
        `[chat] OpenAI call — iteration ${iteration}/${MAX_LOOP_ITERATIONS}`,
      );

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: chatTools,
        tool_choice: 'auto',
      });

      const choice = response.choices[0];
      const message = choice.message;
      const finishReason = choice.finish_reason;

      this.logger.log(
        `[chat] OpenAI responded — finish_reason: "${finishReason}", ` +
          `tool_calls: ${message.tool_calls?.length ?? 0}`,
      );

      // Always append the assistant turn to maintain a valid conversation history
      messages.push(message);

      // CASE 1: Final answer — the model is done, return the text response.
      if (finishReason === 'stop') {
        const finalText = message.content ?? '';
        this.chatMemoryService.saveHistory(sessionId, messages);
        this.logger.log(
          `[chat] Final answer produced after ${iteration} iteration(s).`,
        );
        this.logger.log(
          `[chat] Response preview: "${finalText.slice(0, 120).replace(/\n/g, ' ')}` +
            `${finalText.length > 120 ? '…' : ''}"`,
        );
        return finalText;
      }

      // CASE 2: Tool call — the model wants to use one or more tools.
      if (finishReason === 'tool_calls' && message.tool_calls) {
        // Log tool names — TYPE NARROWING required here (see JSDoc above)
        const toolNames = message.tool_calls.map((tc) =>
          tc.type === 'function'
            ? tc.function.name
            : `custom:${tc.custom.name}`,
        );
        this.logger.log(
          `[chat] Model requested ${message.tool_calls.length} tool(s): [${toolNames.join(', ')}]`,
        );

        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== 'function') {
            this.logger.warn(
              `[chat] Received unexpected tool type "${toolCall.type}" — skipping.`,
            );
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                error: `Tool type "${toolCall.type}" is not supported.`,
              }),
            });
            continue;
          }
          const toolName = toolCall.function.name;
          const toolCallId = toolCall.id;
          let args: Record<string, unknown>;
          try {
            args = JSON.parse(toolCall.function.arguments) as Record<
              string,
              unknown
            >;
          } catch {
            this.logger.error(
              `[chat] Failed to parse arguments for "${toolName}": ` +
                toolCall.function.arguments,
            );
            args = {};
          }

          this.logger.log(
            `[chat] Executing tool "${toolName}" with args: ${JSON.stringify(args)}`,
          );

          let toolResult: unknown;

          // Route to the correct local service
          if (toolName === 'searchProducts') {
            const query = String(args['query'] ?? '');
            toolResult = this.productsService.search(query);
          } else if (toolName === 'convertCurrencies') {
            const amount = Number(args['amount']);
            const fromCurrency = String(args['fromCurrency']);
            const toCurrency = String(args['toCurrency']);
            toolResult = await this.currencyService.convert(
              amount,
              fromCurrency,
              toCurrency,
            );
          } else {
            this.logger.warn(`[chat] Unknown tool requested: "${toolName}"`);
            toolResult = { error: `Tool "${toolName}" is not available.` };
          }

          this.logger.log(
            `[chat] Tool "${toolName}" result sent to LLM: ${JSON.stringify(toolResult)}`,
          );

          // Append tool result — required format by the OpenAI Chat API
          messages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            content: JSON.stringify(toolResult),
          });
        }

        // Continue the loop — the model will now produce a follow-up response
        continue;
      }

      // CASE 3: Unexpected finish reason (e.g. 'length', 'content_filter')
      this.logger.warn(
        `[chat] Unexpected finish_reason "${finishReason}" on iteration ${iteration}.`,
      );
      break;
    }

    // Reached the iteration cap without a 'stop' response
    this.logger.error(
      `[chat] Exceeded ${MAX_LOOP_ITERATIONS} iterations without a final answer.`,
    );
    return "I'm sorry, I couldn't process your request at this time. Please try again.";
  }
}
