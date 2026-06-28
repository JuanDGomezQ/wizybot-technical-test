import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty({
    example: 'I am looking for a phone',
    description: 'User enquiry',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
