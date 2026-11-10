# ExpenseFlow — AI Agent & Developer Guidelines

ExpenseFlow is an intelligent, voice-first personal finance mobile application built with **React Native / Expo**, **Supabase**, and **Deepgram**. Users can effortlessly record expenses, auto-categorize spending, construct budgets, manage multiple accounts, log income, track savings goals, and ask natural language financial questions through a conversational AI voice assistant.

---

## 1. Core Tech Stack & Dependencies

- **Framework**: Expo SDK 58+ with Continuous Native Generation (CNG) and Expo Router (Typed Routes enabled).
- **Runtime & React**: React 19 / React Native 0.88+.
- **Styling**: **NativeWind v4** + **React Native Reusables** (RNR / Radix primitives + `lucide-react-native`).
- **Backend & Database**: **Supabase** (PostgreSQL, Row Level Security, Realtime, Supabase Auth, Edge Functions).
- **Voice & AI Engine**:
  - **Speech-to-Text (STT)**: Deepgram Nova-3 (`model=nova-3`) over WebSocket for real-time live streaming transcription.
  - **Text-to-Speech (TTS)**: Deepgram Aura (`POST /v1/speak` or WebSocket) for realistic spoken audio feedback.
  - **Reasoning & Tool Calling**: Supabase Edge Functions orchestrating LLM (Gemini 2.0 / OpenAI) structured function calls.
- **State & Server Cache**: TanStack Query (React Query) for remote data fetching, mutation, and cache invalidation.
- **Local Secure Storage**: `expo-secure-store` for Supabase authentication tokens.

---

## 2. Visual Design System & Theme

ExpenseFlow uses a **Strict Dark Theme** with a sophisticated, high-contrast palette:

- **Primary Background**: `bg-slate-950` (`#020617`) — Never use pure black (`#000000`) or light backgrounds for main screens.
- **Card & Surface Backgrounds**: `bg-slate-900` (`#0f172a`) or `bg-slate-900/80` with backdrop blur.
- **Borders & Dividers**: `border-slate-800` (`#1e293b`) or `border-slate-800/70`.
- **Primary Text**: `text-white` (`#ffffff`) for titles, headers, and values.
- **Muted / Secondary Text**: `text-slate-400` (`#94a3b8`) for labels, dates, and hints.
- **Financial Status Accents**:
  - **Income & Savings Positive**: `emerald-500` / `emerald-400` (`#10b981`)
  - **Expenses & Warnings**: `rose-500` / `rose-400` (`#f43f5e`)
  - **Budgets & Neutral**: `sky-500` or `indigo-400`
  - **AI Voice Accent / Glow**: `cyan-400` / `violet-500` gradient for the voice button, active recording aura, and waveforms.
- **UI Components**: Use React Native Reusables components (Button, Card, Input, Dialog, BottomSheet, Badge, Progress) styled with Tailwind/NativeWind utility classes.

---

## 3. Navigation Hierarchy & Screen Architecture

The app uses **Expo Router** file-based navigation in `src/app/`.

```
src/app/
├── _layout.tsx                 # Root layout: Auth provider, QueryClientProvider, Theme setup
├── (auth)/                     # Upfront Authentication flow
│   ├── _layout.tsx
│   ├── sign-in.tsx             # Email / Social Sign-In (Google, Apple)
│   ├── sign-up.tsx             # Account registration
│   └── onboarding.tsx          # Initial setup wizard (base currency, initial accounts)
├── (tabs)/                     # Main 5-Slot Bottom Tab Bar
│   ├── _layout.tsx             # Tab bar config with custom prominent center mic button
│   ├── index.tsx               # 1. Dashboard: Net worth, monthly summary, quick action cards
│   ├── transactions.tsx        # 2. Transactions: Filterable list, categories, date pickers
│   ├── voice-trigger.tsx       # 3. Center Mic: Intercepted to push to /conversation
│   ├── budgets.tsx             # 4. Budgets: Monthly limits, category progress bars, alerts
│   └── accounts.tsx            # 5. Accounts: Checking, Cash, Credit Cards with balance breakdown
├── savings/                    # Dedicated Savings Goals Screen
│   ├── _layout.tsx
│   └── index.tsx               # Savings goals list, progress tracking, deposit modal
└── conversation/               # AI Voice Assistant Thread UI
    ├── _layout.tsx
    └── index.tsx               # Full-screen conversational thread with real-time mic controls
```

### Bottom Tab Bar Layout
1. **Dashboard** (`/(tabs)/`)
2. **Transactions** (`/(tabs)/transactions`)
3. **✦ Center Mic Button**: Elevated, glowing circular button with `cyan/indigo` gradient. Tapping navigates immediately to `/conversation`.
4. **Budgets** (`/(tabs)/budgets`)
5. **Accounts** (`/(tabs)/accounts`): Displays bank accounts, cash, credit cards; includes a prominent header/card linking directly to **Savings Goals** (`/savings`).

---

## 4. AI Voice Assistant Pipeline & Interaction Model

### Real-Time Live Streaming STT
1. User enters `/conversation` and taps or holds the microphone button.
2. `expo-audio` records linear PCM/Opus chunks and streams them via WebSocket to Deepgram Nova-3 (`wss://api.deepgram.com/v1/listen?model=nova-3`).
3. Deepgram streams transcript chunks back; text renders live in real time in the user's speech bubble.
4. When speech stops or user releases the button, Deepgram detects utterance end and finalizes the user message.

### AI Processing & Tool Execution
1. The finalized transcript is submitted to the Supabase Edge Function (`/functions/v1/assistant-chat`).
2. The Edge Function runs an LLM (Gemini 2.0 / OpenAI) with structured tool definitions.
3. The LLM streams back a conversational response and/or tool call payloads.
4. Spoken audio feedback is generated via Deepgram Aura TTS and streamed to the client for immediate playback.

### In-Chat Interactive Action Cards
Financial data must **never** be silently mutated without clear visibility.
- When the AI generates a tool action (e.g. `record_expense`), the UI renders an **Interactive Action Card** inside the chat bubble displaying:
  - Action Type (Expense, Income, Budget, Transfer, Savings)
  - Amount & Currency
  - Category (with icon)
  - Source Account
  - Date & Merchant / Note
- The card contains two actions:
  - **[Confirm]**: Commits the mutation to Supabase and updates account balances.
  - **[Edit]**: Opens a fast bottom-sheet form to tweak values.
- The user can also confirm verbally (e.g., *"Yes, record it"* or *"Change the amount to $30"*).

### Supported AI Tool Definitions
- `record_expense(amount, category, account_id, note?, date?)`
- `record_income(amount, source_category, account_id, savings_goal_id?, note?, date?)`
- `transfer_funds(from_account_id, to_account_id, amount, note?)`
- `create_budget(category, amount, period: 'monthly'|'weekly')`
- `update_budget(budget_id, amount)`
- `create_account(name, type: 'checking'|'cash'|'credit'|'savings', initial_balance)`
- `create_savings_goal(name, target_amount, target_date?)`
- `query_financial_summary(type: 'spending'|'balance'|'budget_status'|'savings_progress', time_range?)`

---

## 5. Supabase Database Schema & Architecture

All tables reside in PostgreSQL with **Row Level Security (RLS)** enabled, ensuring users can only read and write their own rows (`auth.uid() = user_id`).

### Key Tables
- **`profiles`**: `id (UUID, references auth.users)`, `email`, `base_currency (e.g. 'USD')`, `created_at`, `updated_at`.
- **`accounts`**: `id`, `user_id`, `name`, `type ('checking' | 'cash' | 'credit' | 'savings')`, `balance (NUMERIC(12,2))`, `is_archived (BOOLEAN)`, `color_tag`, `created_at`.
- **`categories`**: `id`, `user_id (nullable for system defaults)`, `name`, `icon`, `type ('expense' | 'income')`, `color`.
- **`transactions`**: `id`, `user_id`, `account_id`, `category_id`, `type ('expense' | 'income' | 'transfer')`, `amount (NUMERIC(12,2))`, `destination_account_id (for transfers)`, `savings_goal_id (optional allocation)`, `note`, `date (TIMESTAMPTZ)`, `created_at`.
- **`budgets`**: `id`, `user_id`, `category_id`, `amount (NUMERIC(12,2))`, `period ('monthly' | 'weekly')`, `start_date`, `created_at`.
- **`savings_goals`**: `id`, `user_id`, `name`, `target_amount (NUMERIC(12,2))`, `current_amount (NUMERIC(12,2))`, `target_date (DATE)`, `status ('active' | 'completed' | 'paused')`, `created_at`.
- **`conversations`**: `id`, `user_id`, `title`, `created_at`, `updated_at`.
- **`messages`**: `id`, `conversation_id`, `sender ('user' | 'assistant' | 'system')`, `content (TEXT)`, `action_payload (JSONB for interactive cards)`, `action_status ('pending' | 'confirmed' | 'rejected')`, `created_at`.

---

## 6. Developer Guidelines & Expo Rules

### Expo SDK 58 Discipline
- Expo ships breaking changes every SDK release. **Do not guess APIs.**
- When installing dependencies, **always** run:
  ```bash
  npx expo install <package-name>
  ```
- Before declaring tasks complete, verify:
  ```bash
  npx expo lint
  npx tsc --noEmit
  npx expo-doctor
  ```
- Never hand-edit `android/` or `ios/` folders; configure native settings through `app.json` plugins.

### Styling & Component Conventions
- Use Tailwind classes via NativeWind v4 (`className="..."`).
- Keep components modular under `src/components/` and shared hooks under `src/hooks/`.
- Ensure all touch targets on mobile meet the minimum 44x44pt accessibility rule.
- Use `react-native-safe-area-context` to handle notches and navigation bars seamlessly.
- Wrap lists in `@shopify/flash-list` or optimized `FlatList` for smooth 60/120fps scrolling.

### State & Data Conventions
- Encapsulate all Supabase database calls in custom React Query hooks under `src/services/` or `src/hooks/api/`.
- Use optimistic updates for transaction creation and balance adjustments to guarantee instant perceived performance.
- Invalidate relevant Query Keys (`['accounts']`, `['transactions']`, `['budgets']`, `['savings']`) upon successful mutations.
