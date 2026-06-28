import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync'; // Usamos versión sincrónica para el startup
import { Product } from './interfaces/product.interface';

@Injectable()
export class ProductsService implements OnModuleInit {
  private products: Product[] = [];

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    // 1. Cargamos el CSV al iniciar la app
    const filePath = path.join(process.cwd(), 'data', 'products_list.csv');
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    this.products = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });
    console.log(`Loaded ${this.products.length} products into memory.`);
  }

  // Note: Given the small dataset (90 items), an in-memory keyword scoring algorithm is used for optimal performance and simplicity.
  // For a production-scale catalog, this could be replaced with a Vector Database (like Qdrant) and an embedding model (RAG pipeline) to support semantic search
  search(query: string): Product[] {
    const stopWords = ['a', 'the', 'is', 'for', 'my', 'looking', 'in', 'of'];
    const queryTokens = query
      .toLowerCase()
      .split(' ')
      .filter((token) => !stopWords.includes(token));

    // Scoring: Sum points for each search word that appears in the product text
    const scoredProducts = this.products.map((product) => {
      const text = product.embeddingText.toLowerCase();
      const score = queryTokens.reduce(
        (acc, token) => (text.includes(token) ? acc + 1 : acc),
        0,
      );
      return { product, score };
    });

    // Return the top 2 products with the highest score, filtering out those with a score of 0
    return scoredProducts
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((item) => item.product);
  }
}
