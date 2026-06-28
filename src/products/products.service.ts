import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { Product } from './interfaces/product.interface';

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);
  private products: Product[] = [];

  /**
   * Initialize the product catalog on module startup (NestJS lifecycle hook).
   *
   * Loads the CSV product catalog into memory during application bootstrap.
   * Called automatically by NestJS after the module is instantiated.
   * Failures here prevent the application from starting.
   *
   * @throws Error if CSV file cannot be read or parsed.
   */
  onModuleInit(): void {
    this.products = this.loadProducts();
    this.logger.log(
      `Product catalog ready — ${this.products.length} products loaded into memory.`,
    );
  }

  /**
   * Search the product catalog using semantic token matching.
   *
   * Tokenizes the query, removes stopwords, and performs substring-based scoring
   * against embeddings text to retrieve up to 2 matching products.
   *
   * @param query - Semantic search query string (pre-distilled from user message by OpenAI)
   * @returns Up to 2 products ranked by embedding token relevance, sorted descending.
   *          Returns empty array if no products match after stopword filtering.
   * @throws Does not throw; returns empty array on zero matches or invalid input.
   */
  search(query: string): Product[] {
    this.logger.log(`🔍 [searchProducts] Tool called — raw query: "${query}"`);

    // Tokens that carry no product-matching signal
    const STOP_WORDS = new Set([
      'a',
      'an',
      'the',
      'is',
      'are',
      'for',
      'my',
      'me',
      'i',
      'to',
      'in',
      'of',
      'on',
      'at',
      'and',
      'or',
      'but',
      'it',
      'its',
      'looking',
      'need',
      'want',
      'find',
      'get',
      'buy',
      'much',
      'does',
      'how',
      'what',
      'cost',
      'price',
      'do',
      'am',
      'many',
      'costs',
      'euros',
      'dollars',
      'canadian',
      'usd',
      'eur',
      'cad',
    ]);

    const queryTokens = query
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

    if (queryTokens.length === 0) {
      this.logger.warn(
        `[searchProducts] No meaningful tokens in query "${query}" after filtering — returning empty.`,
      );
      return [];
    }

    this.logger.log(
      `[searchProducts] Effective search tokens: [${queryTokens.join(', ')}]`,
    );

    const allScored = this.products.map((product) => {
      const haystack = product.embeddingText.toLowerCase();
      const score = queryTokens.reduce(
        (acc, token) => (haystack.includes(token) ? acc + 1 : acc),
        0,
      );
      return { product, score };
    });

    const hits = allScored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const top2 = hits.slice(0, 2).map((item) => item.product);

    // Detailed log of what is actually being returned to the LLM
    if (top2.length === 0) {
      this.logger.warn(
        `[searchProducts] 0 products matched tokens [${queryTokens.join(', ')}] — LLM will respond without product context.`,
      );
    } else {
      this.logger.log(
        `[searchProducts] Returning ${top2.length} product(s) to LLM:`,
      );
      top2.forEach((p, i) => {
        this.logger.log(
          `   ${i + 1}. "${p.displayTitle}" | price: ${p.price} | type: ${p.productType}`,
        );
      });
    }

    return top2;
  }
  // Private — CSV ingestion
  /**
   * Load and parse the product catalog from CSV file with RFC-4180 repairs.
   *
   * Reads CSV, normalizes malformed escape sequences, parses rows, and validates
   * required fields (displayTitle, price). Silently skips invalid rows.
   *
   * @returns Array of validated Product objects indexed in memory.
   * @throws Error if file cannot be read or CSV parsing fails after normalization.
   */
  private loadProducts(): Product[] {
    const filePath = path.join(process.cwd(), 'data', 'products_list.csv');

    let rawContent: string;
    try {
      rawContent = fs.readFileSync(filePath, 'utf-8');
      this.logger.log(`[loadProducts] File read successfully: ${filePath}`);
    } catch (err) {
      this.logger.error(
        `[loadProducts] Cannot read catalog at "${filePath}"`,
        err,
      );
      throw err;
    }

    // Escape unescaped inch-marks that break the RFC-4180 parser
    const normalizedContent = rawContent.replace(/(\d)"(?![,\n\r])/g, '$1""');

    let rawRows: Record<string, string>[];
    try {
      rawRows = parse(normalizedContent, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
      }) as Record<string, string>[];
      this.logger.log(
        `[loadProducts] CSV parsed — ${rawRows.length} raw rows found.`,
      );
    } catch (err) {
      this.logger.error(
        `[loadProducts] CSV parsing failed after normalization.`,
        err,
      );
      throw err;
    }

    const validProducts: Product[] = [];
    let skippedCount = 0;

    for (const row of rawRows) {
      const title = row['displayTitle']?.trim();
      const price = row['price']?.trim();

      if (!title || !price) {
        this.logger.warn(
          `[loadProducts] Skipping malformed row (missing title or price): ${JSON.stringify(row)}`,
        );
        skippedCount++;
        continue;
      }

      validProducts.push({
        displayTitle: title,
        embeddingText: row['embeddingText'] ?? '',
        url: row['url'] ?? '',
        imageUrl: row['imageUrl'] ?? '',
        productType: row['productType'] ?? '',
        discount: row['discount'] ?? '0',
        price,
        variants: row['variants'] ?? '',
        createDate: row['createDate'] ?? '',
      });
    }

    if (skippedCount > 0) {
      this.logger.warn(
        `[loadProducts] Skipped ${skippedCount} invalid row(s).`,
      );
    }

    return validProducts;
  }
}
