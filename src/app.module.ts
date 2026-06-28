import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { ProductsModule } from './products/products.module';
import { CurrencyModule } from './currency/currency.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ChatModule,
    ProductsModule,
    CurrencyModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
