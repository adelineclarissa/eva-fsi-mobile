# EVA Banking App

A sleek, premium AI-powered mobile banking app built with React Native (Expo) and a Node.js backend featuring a fully functional AI assistant powered by Claude.

---

## Features

### Core Banking

- **Dashboard** — Balance overview, quick actions, beneficiary shortcuts, live currency rates
- **AI Assistant (EVA)** — Conversational banking with real tool calling via Claude
- **Transfer Flow** — 3-step transfer with beneficiary selection and confirmation
- **Account Cards** — Visual account overview with full transaction history
- **Profile** — Security score, settings, member info

### AI Chatbot Capabilities

| Feature            | Description              | Example Prompt             |
| ------------------ | ------------------------ | -------------------------- |
| **Balance Check**  | Query checking & savings | "What's my balance?"       |
| **Fund Transfer**  | Execute real transfers   | "Send $200 to John"        |
| **Exchange Rates** | Live currency conversion | "Convert 500 SGD to USD"   |
| **RAG / PDF Q&A**  | Upload & query documents | "Summarize this policy"    |
| **Transactions**   | View history             | "Show recent transactions" |
| **Beneficiaries**  | List saved contacts      | "Who can I send money to?" |

### Design

- Dark mode by default
- Premium glassmorphism cards
- Smooth Reanimated animations
- Linear gradient accents
- Haptic feedback throughout
- Streaming AI responses
- Skeleton loading & pull-to-refresh

---

## Tech Stack

| Layer      | Technology                           |
| ---------- | ------------------------------------ |
| Frontend   | React Native (Expo SDK 52)           |
| Navigation | Expo Router (file-based)             |
| State      | Zustand                              |
| Animations | React Native Reanimated 3            |
| Styling    | NativeWind v4 (Tailwind)             |
| Gestures   | React Native Gesture Handler         |
| Backend    | Node.js + Express                    |
| AI         | Anthropic Claude (claude-sonnet-4-6) |
| RAG        | TF-IDF in-memory (swap for Pinecone) |
| PDF        | pdf-parse                            |

---

## Project Structure

```
BankingApp/
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx          # Root layout
│   │   ├── transfer.tsx         # Transfer modal screen
│   │   └── (tabs)/
│   │       ├── _layout.tsx      # Tab bar
│   │       ├── index.tsx        # Home Dashboard
│   │       ├── chat.tsx         # AI Assistant
│   │       ├── cards.tsx        # Accounts & Transactions
│   │       └── profile.tsx      # User Profile
│   ├── components/
│   │   ├── ui/                  # BalanceCard, QuickActions, etc.
│   │   ├── chat/                # ChatBubble, TypingIndicator, etc.
│   │   └── common/              # GlassCard
│   ├── store/
│   │   ├── accountStore.ts      # Account & transaction state
│   │   └── chatStore.ts         # Chat session state
│   ├── services/
│   │   └── apiService.ts        # Backend API calls
│   ├── constants/
│   │   ├── colors.ts            # Design tokens
│   │   └── mockData.ts          # Initial data
│   ├── types/index.ts
│   └── utils/formatters.ts
│
└── backend/
    └── src/
        ├── server.ts            # Express entry point
        ├── routes/
        │   ├── chat.ts          # POST /chat, /chat/stream
        │   ├── balance.ts       # GET /balance
        │   ├── transfer.ts      # POST /transfer
        │   ├── exchange.ts      # GET /exchange-rates
        │   └── upload.ts        # POST /upload
        ├── services/
        │   ├── llm.ts           # Claude + tool calling
        │   ├── tools.ts         # Tool implementations
        │   └── rag.ts           # Vector search (TF-IDF)
        └── data/mockData.ts     # Mock accounts & transactions
```

---

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator or Expo Go app

---

### 1. Backend Setup

```bash
cd BankingApp/backend
npm install
cp .env.example .env
```

Edit `.env`:

```env
PORT=3001
ANTHROPIC_API_KEY=sk-ant-...     # Required — get from console.anthropic.com
EXCHANGE_RATE_API_KEY=...         # Optional — free at exchangerate-api.com
```

Start the backend:

```bash
npm run dev
```

Verify: `curl http://localhost:3001/health`

---

### 2. Frontend Setup

```bash
cd BankingApp/frontend
npm install
cp .env.example .env
```

Edit `.env`:

```env
# For iOS Simulator / web:
EXPO_PUBLIC_API_URL=http://localhost:3001

# For physical device (replace with your machine's IP):
EXPO_PUBLIC_API_URL=http://192.168.x.x:3001
```

Find your IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`

Start the app:

```bash
npx expo start
```

Press:

- `i` — iOS Simulator
- `a` — Android Emulator
- Scan QR with Expo Go app for physical device

---

## API Reference

### POST `/chat`

```json
{
  "message": "What's my balance?",
  "sessionId": "session_abc123"
}
```

Response:

```json
{
  "reply": "Your checking account has $12,580.50...",
  "toolsUsed": ["check_balance"],
  "sessionId": "session_abc123"
}
```

### POST `/chat/stream`

Server-Sent Events streaming. Same body as `/chat`.

Events: `token`, `tool`, `complete`, `error`

### GET `/balance`

Returns user profile, all accounts, and total balance.

### POST `/transfer`

```json
{
  "toBeneficiaryName": "John Smith",
  "amount": 100,
  "currency": "USD",
  "fromAccount": "checking"
}
```

### GET `/exchange-rates?from=USD&to=EUR&amount=100`

Returns live exchange rate and optional conversion.

### POST `/upload`

Multipart form with `file` (PDF). Returns document ID and chunk count.

---

## AI Tool Calling

The AI uses Claude's native tool calling to execute banking operations:

```
User: "Transfer $500 to Sarah"
  ↓
Claude detects intent → calls transfer_funds tool
  ↓
Tool executes → updates balance in memory
  ↓
Claude responds with confirmation
  ↓
Frontend refreshes account state
```

Available tools:

- `check_balance(account_type)`
- `transfer_funds(to, amount, currency, from)`
- `get_exchange_rate(from, to, amount?)`
- `search_documents(query)` — RAG
- `get_transaction_history(limit?)`
- `get_beneficiaries()`

---

## RAG Pipeline

Upload a PDF → backend parses text → chunks into ~500-word segments → stored in memory.

During chat, when the AI calls `search_documents`:

1. Query is compared to all chunks via TF-IDF scoring
2. Top 3 relevant chunks are retrieved
3. Context is injected into the prompt
4. Claude answers based on the document

**To use a real vector DB** (Pinecone, Chroma, Weaviate):
Replace `src/services/rag.ts` with your embedding + vector DB calls.

---

## Mock Data

The app ships with realistic mock data:

- **Accounts**: Checking ($12,580.50), Savings ($45,230.00)
- **Transactions**: 10 sample transactions across categories
- **Beneficiaries**: John Smith, Sarah Johnson, Mike Chen, Emma Wilson, David Lee

Data persists in-memory for the backend session.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                | Required | Description                       |
| ----------------------- | -------- | --------------------------------- |
| `ANTHROPIC_API_KEY`     | ✅       | Claude API key                    |
| `PORT`                  | ❌       | Server port (default: 3001)       |
| `EXCHANGE_RATE_API_KEY` | ❌       | Live rates (falls back to cached) |
| `CORS_ORIGIN`           | ❌       | Allowed origin                    |

### Frontend (`frontend/.env`)

| Variable              | Required | Description |
| --------------------- | -------- | ----------- |
| `EXPO_PUBLIC_API_URL` | ✅       | Backend URL |

---

## Upgrading RAG to Production

Replace the in-memory TF-IDF with real embeddings:

```typescript
// In services/rag.ts — replace computeTFIDF with:
import { OpenAI } from "openai";
// or use @anthropic-ai/sdk for embeddings via Voyage AI

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding;
}
```

Then replace the similarity function with cosine similarity on vectors and store in Pinecone.

---

## Credits

Built with Claude claude-sonnet-4-6 · Expo · React Native · NativeWind
