import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty({
    example: 'I am looking for a phone',
    description: 'User enquiry',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({
    example: 'session-123',
    description: 'Optional session identifier to maintain conversation history',
    required: false,
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
