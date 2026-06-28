import OpenAI from 'openai';

export const chatTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'searchProducts',
      description:
        'Search for products based on a query. Returns a list of products.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search term, e.g., "phone", "watch"',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'convertCurrencies',
      description: 'Convert an amount from one currency to another.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'The numerical amount' },
          fromCurrency: {
            type: 'string',
            description: 'Source currency code (e.g., "USD")',
          },
          toCurrency: {
            type: 'string',
            description: 'Target currency code (e.g., "EUR")',
          },
        },
        required: ['amount', 'fromCurrency', 'toCurrency'],
      },
    },
  },
];
