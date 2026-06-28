import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Input payload for chat request.
 *
 * Represents a user message and optional session context for multi-turn
 * conversations. Used by ChatController to validate incoming HTTP POST requests.
 *
 * @class ChatRequestDto
 */
export class ChatRequestDto {
  /**
   * User's enquiry message.
   *
   * Non-empty string containing the user's natural language request.
   * Will be processed by ChatService for semantic understanding and tool routing.
   *
   * @example "I am looking for a phone"
   */
  @ApiProperty({
    example: 'I am looking for a phone',
    description: 'User enquiry',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  /**
   * Conversation session identifier (optional).
   *
   * If provided, maintains multi-turn context within the session.
   * Defaults to 'default' if omitted. Use for stateful dialogues across requests.
   *
   * @example "session-123"
   */
  @ApiProperty({
    example: 'session-123',
    description: 'Optional session identifier to maintain conversation history',
    required: false,
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
