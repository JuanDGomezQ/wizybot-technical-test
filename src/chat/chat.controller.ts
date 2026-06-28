import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * HTTP endpoint to process user messages through the chatbot pipeline.
   *
   * @param chatRequest - Request payload with user message and optional sessionId
   * @returns Response object with `response` field containing the LLM's final text
   * @throws BadRequestException if request validation fails
   */
  @Post()
  @ApiOperation({
    summary: 'Send a message to the AI agent',
    description:
      'Processes a natural language query, performs tool calls (search/currency) if needed, and returns a conversational response.',
  })
  @ApiBody({ type: ChatRequestDto })
  @ApiResponse({
    status: 200,
    description: 'The AI response has been generated.',
  })
  async chat(@Body() chatRequest: ChatRequestDto) {
    const response = await this.chatService.chat(chatRequest);

    return { response };
  }
}
