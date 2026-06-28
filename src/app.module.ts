import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { CurrencyModule } from './currency/currency.module';
import { CurrenService } from './curren/curren.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ProductsModule,
    CurrencyModule,
  ],
  controllers: [AppController],
  providers: [AppService, CurrenService],
})
export class AppModule {}
