import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatMemoryService } from './chat-memory.service';
import { ProductsModule } from '../products/products.module';
import { CurrencyModule } from '../currency/currency.module';

@Module({
  imports: [ProductsModule, CurrencyModule],
  controllers: [ChatController],
  providers: [ChatService, ChatMemoryService],
})
export class ChatModule {}
