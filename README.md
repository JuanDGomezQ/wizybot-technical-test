# Wizybot Chatbot API

An AI-powered chatbot built with NestJS that demonstrates OpenAI's Function Calling capabilities. The API accepts natural language enquiries and intelligently routes them to specialized tools for product search and currency conversion.

## Prerequisites

### Required Software

- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher

### Required Environment Variables

The following API keys must be configured:

- `OPENAI_API_KEY` — Your OpenAI API key (https://platform.openai.com/api-keys)
- `OPEN_EXCHANGE_RATES_APP_ID` — Your Open Exchange Rates API ID (https://openexchangerates.org/signup/free)
- `PORT` — Server port (default: 3000, optional)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/wizybot-chatbot.git
cd wizybot-chatbot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your actual credentials:

```env
OPENAI_API_KEY=sk-your_actual_key_here
OPEN_EXCHANGE_RATES_APP_ID=your_actual_id_here
PORT=3000
```

## How to Run

Start the application in development mode with hot-reload:

```bash
npm run start:dev
```

The server will start at `http://localhost:3000`

Expected console output:

```
[Nest] 12345 - 06/28/2026, 10:30:15 AM LOG [NestFactory] Starting Nest application...
Product catalog ready — 90 products loaded into memory.
[Nest] 12345 - 06/28/2026, 10:30:16 AM LOG [NestFactory] Nest application successfully started +1ms
Application is running on: http://localhost:3000
Swagger UI is running on: http://localhost:3000/api
```

For production:

```bash
npm run build
npm run start:prod
```

## API Documentation & Usage

### Endpoint: POST /chat

**URL:** `http://localhost:3000/chat`

**Request Body:**

```json
{
  "message": "I am looking for a phone"
}
```

**Response:**

```json
{
  "response": "I found some great phones for you! The iPhone 12 is priced at $900 USD and comes in Black, Blue, Red, and Green with 64GB or 128GB capacity. The iPhone 13 is priced at $1,099 USD..."
}
```

### Example: cURL Request

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the price of the watch in Euros?"
  }'
```

### Interactive API Documentation

Visit the Swagger UI to explore and test the API:

**[http://localhost:3000/api](http://localhost:3000/api)**

## Architecture (Brief)

The application uses a **ChatService orchestrator** that implements the OpenAI Function Calling pattern:

1. **Request Reception** — ChatController receives user message via POST `/chat`
2. **LLM Invocation** — ChatService sends message + tool definitions to OpenAI
3. **Tool Routing** — Based on OpenAI's response:
   - `searchProducts` tool queries the CSV product catalog (in-memory)
   - `convertCurrencies` tool calls Open Exchange Rates API for live rates
4. **Multi-turn Loop** — If the model requests multiple tools sequentially, the loop continues until completion
5. **Response** — Final conversational answer returned to user

**Key Design Choice:** This implementation uses **OpenAI's Function Calling API** (not the Agents API), providing explicit control over tool execution, validation, and error handling.
