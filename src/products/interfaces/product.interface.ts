/**
 * Product data structure representing a catalog entry.
 *
 * Represents a single row from the products_list.csv catalog.
 * All fields are strings because csv-parse returns raw text values.
 * Numeric interpretation (e.g., parsing `price` as a number) is intentionally
 * deferred to the consumer layer, since `price` can be a range
 * (e.g., "350.0 - 365.0 USD") and requires domain-aware parsing.
 *
 * @interface Product
 */
export interface Product {
  displayTitle: string;
  embeddingText: string;
  url: string;
  imageUrl: string;
  productType: string;
  discount: string;
  price: string;
  variants: string;
  createDate: string;
}
