import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Chat with Wizybot' })
  @ApiBody({ type: ChatRequestDto })
  @ApiResponse({ status: 200, description: 'LLM response' })
  async chat(@Body() chatRequest: ChatRequestDto) {
    const response = await this.chatService.chat(chatRequest);

    return { response };
  }
}
