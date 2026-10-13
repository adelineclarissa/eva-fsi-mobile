# EVA Banking App

A mobile banking app with a built-in AI assistant (EVA), built with React Native and Expo. The UI is in Bahasa Indonesia.

The app has no backend of its own. It talks directly to two hosted services:

- **FSI API** — the AI chat assistant
- **Bank API** — the customer's profile and accounts

---

## Features

- **Beranda (Home)** — balance card, account switcher, quick actions, beneficiary shortcuts, currency rates
- **Aktivitas (Activity)** — accounts and transaction history
- **Asisten AI (AI Assistant)** — chat with EVA to check balances, ask about exchange rates, and start transfers
- **Profil (Profile)** — user info and settings
- **QRIS scanner** — the center tab button opens the camera to scan QRIS codes, or shows your own QRIS to receive payments
- **Transfer flow** — pick a beneficiary, enter an amount, confirm, then save or share the receipt

### How a transfer from chat works

1. The user asks EVA to send money (for example, "Transfer 100 ribu ke Budi").
2. The FSI API replies with a JSON action payload: `{ "action": "transfer", "data": { ... } }`.
3. The app finds matching beneficiaries and asks the user to pick one.
4. The app opens the transfer screen with the details filled in.
5. When the transfer completes or is cancelled, the app reports the result back to EVA, which confirms it in the chat.

---

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Framework  | React Native 0.81 + Expo SDK 54     |
| Navigation | Expo Router 6 (file-based)          |
| State      | Zustand                             |
| Styling    | NativeWind 4 (Tailwind)             |
| Animations | React Native Reanimated 4           |
| Camera     | expo-camera (QRIS scanning)         |
| Builds     | EAS Build                           |

---

## Project Structure

```
.
├── app/                     # Screens (Expo Router)
│   ├── _layout.tsx          # Root layout
│   ├── transfer.tsx         # Transfer flow + receipt
│   ├── scan-qris.tsx        # QRIS scanner / receive
│   └── (tabs)/
│       ├── _layout.tsx      # Custom tab bar with center QRIS button
│       ├── index.tsx        # Beranda (Home)
│       ├── cards.tsx        # Aktivitas (Activity)
│       ├── chat.tsx         # Asisten AI (AI Assistant)
│       └── profile.tsx      # Profil (Profile)
├── components/
│   ├── ui/                  # BalanceCard, QuickActions, AccountSwitcher, ...
│   ├── chat/                # ChatBubble, BeneficiarySelector, SuggestedPrompts, ...
│   └── common/              # GlassCard
├── services/
│   ├── fsiApi.ts            # AI chat client (FSI API)
│   └── bankApi.ts           # Profile & accounts client (Bank API)
├── store/
│   ├── accountStore.ts      # Accounts, transactions, beneficiaries
│   └── chatStore.ts         # Chat session state
├── constants/               # Colors and mock data
├── types/                   # Shared TypeScript types
├── utils/                   # Formatters
├── assets/                  # App icon, splash
├── app.json                 # Expo config
├── eas.json                 # EAS build profiles
└── Dockerfile, docker-compose.yml   # Optional: run the Expo dev server in Docker
```

---

## Data Sources

| Data                     | Source                                |
| ------------------------ | ------------------------------------- |
| User profile             | Bank API (`/api/customer/user/:id`)   |
| Accounts & balances      | Bank API (`/api/customer/user/:id/accounts`) |
| AI chat replies          | FSI API (`POST /fsi/api/v1/chat`)     |
| Transactions             | Mock data (`constants/mockData.ts`)   |
| Beneficiaries            | Mock data (`constants/mockData.ts`)   |

---

## Getting Started

### Prerequisites

- Node.js 20+
- An Android emulator, iOS Simulator (macOS), or a phone with a development build installed

### Install and run

```bash
npm install
npx expo start
```

Then press `a` for Android or `i` for iOS, or scan the QR code with your phone.

### Environment variables

Create a `.env` file in the repo root (it is git-ignored):

```env
EXPO_PUBLIC_FSI_API_URL=https://api.epsindo.ai/fsi/api/v1/chat
EXPO_PUBLIC_FSI_API_KEY=your-fsi-api-key
EXPO_PUBLIC_FSI_USER_ID=USR001
EXPO_PUBLIC_BANK_API_URL=https://api.epsindo.ai/bank-api
EXPO_PUBLIC_BANK_API_TOKEN=your-bank-api-token
```

| Variable                     | Description                                   |
| ---------------------------- | --------------------------------------------- |
| `EXPO_PUBLIC_FSI_API_URL`    | AI chat endpoint                              |
| `EXPO_PUBLIC_FSI_API_KEY`    | Sent as the `X-API-Key` header to the FSI API |
| `EXPO_PUBLIC_FSI_USER_ID`    | Customer ID used by both APIs                 |
| `EXPO_PUBLIC_BANK_API_URL`   | Bank API base URL                             |
| `EXPO_PUBLIC_BANK_API_TOKEN` | Sent as a Bearer token to the Bank API        |

`eas.json` also defines `EXPO_PUBLIC_STT_WS_URL` and `EXPO_PUBLIC_TTS_WS_URL` (speech-to-text / text-to-speech), but the app doesn't use them yet.

> **Note:** `EXPO_PUBLIC_*` variables are bundled into the app, so anyone with the APK can read them. Don't put secrets here that shouldn't be public.

### Run in Docker (optional)

```bash
docker compose up
```

This starts the Expo dev server on port 8081 using the host network, so the QR code shows your machine's local IP.

---

## Building

Builds use [EAS Build](https://docs.expo.dev/build/introduction/). Profiles are defined in `eas.json`:

| Profile       | Output         | Use for                     |
| ------------- | -------------- | --------------------------- |
| `development` | APK (dev client) | Local development         |
| `preview`     | APK            | Internal testing            |
| `production`  | AAB            | Google Play release         |

```bash
eas build --platform android --profile preview
```
