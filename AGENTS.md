# AGENTS.md — ExpenseFlow

> Operational context, development workflows, architecture guidelines, and safety guardrails for AI coding agents working on the ExpenseFlow codebase.

---

## 1. Project Overview

**ExpenseFlow** is an intelligent, voice-first personal finance mobile application built with **React Native / Expo SDK 58**, **Supabase**, **Deepgram**, and **OpenAI**. It combines real-time streaming speech recognition, conversational AI reasoning, and automated financial tracking to deliver a hands-free personal finance experience.

### Core Architecture Pillars
- **Voice-First Input**: Real-time speech-to-text live streaming via Deepgram Nova-3.
- **AI Financial Reasoning**: Natural language understanding, entity extraction, and structured tool calling powered by OpenAI.
- **Spoken Audio Feedback**: Natural voice responses generated via Deepgram Aura TTS.
- **Human-in-the-Loop Mutations**: Interactive confirmation cards ensuring financial records are never mutated silently.
- **Cloud Backend & Sync**: Persistent storage, authentication, and Row Level Security on Supabase.

---

## 2. Feature Specifications & OpenSpec

This project uses **OpenSpec** (`openspec/`) as the source of truth for feature specifications, schemas, tool definitions, and implementation tasks.

- **Feature Workflows & Schemas**: Consult `openspec/specs/` and active changes in `openspec/changes/` for specific feature requirements, tool calling schemas, and acceptance criteria.
- **Implementing Features**: Follow OpenSpec change tasks (`tasks.md`) when building or modifying features.
- **Single Source of Truth**: Database schemas are managed via Supabase migrations and generated types (`src/types/database.types.ts`), not hardcoded in documentation.

---

## 3. Essential Commands & Development Workflow

All agents must use the following commands to build, run, test, and verify changes.

### 3.1 Package Management
```bash
# Install dependencies
npm install

# ALWAYS install native / Expo packages with expo install (prevents SDK mismatches)
npx expo install <package-name>
```

### 3.2 Local Development Server
```bash
# Start Metro bundler
npx expo start

# Platform targets
npm run android   # Android emulator / device
npm run ios       # iOS simulator / device
npm run web       # Web preview
```

### 3.3 Quality & Verification Suite
> [!IMPORTANT]
> Always run the type check and linter before declaring any task complete.

```bash
# Strict TypeScript check
npx tsc --noEmit

# ESLint check
npx expo lint

# Dependency and environment health check
npx expo-doctor
```

### 3.4 Supabase & Edge Functions
```bash
# Start local Supabase instance
npx supabase start

# Deploy Edge Function
npx supabase functions deploy assistant-chat

# Regenerate database types
npx supabase gen types typescript --local > src/types/database.types.ts
```

---

## 4. Tech Stack & Dependencies

- **Framework**: Expo SDK 58+ with Continuous Native Generation (CNG) and Expo Router (Typed Routes enabled).
- **Runtime & Core**: React 19 / React Native 0.88+.
- **Styling**: NativeWind v4 + Tailwind CSS utility classes.
- **UI Primitives**: React Native Reusables (RNR / Radix-style primitives) + `lucide-react-native`.
- **Backend & Database**: Supabase (PostgreSQL, Row Level Security, Realtime, Supabase Auth).
- **Speech & Audio**: Deepgram Nova-3 (STT WebSocket streaming) and Deepgram Aura (TTS audio feedback).
- **AI Reasoning**: OpenAI models (hosted in Supabase Edge Functions) for reasoning and structured tool calling.
- **State Management**: TanStack Query v5 (React Query) for remote cache, queries, and optimistic updates.
- **Secure Storage**: `expo-secure-store` for persisting auth credentials.

---

## 5. Visual Design System & Theme

ExpenseFlow enforces a **Strict Dark Theme**:

- **Primary Background**: `bg-slate-950` (`#020617`) — Never use pure black (`#000000`) or light backgrounds for main screens.
- **Card & Surface Backgrounds**: `bg-slate-900` (`#0f172a`) or `bg-slate-900/80` with backdrop blur.
- **Borders & Dividers**: `border-slate-800` (`#1e293b`) or `border-slate-800/70`.
- **Primary Text**: `text-white` (`#ffffff`) for titles, headers, and values.
- **Muted Text**: `text-slate-400` (`#94a3b8`) for labels, dates, secondary text.
- **Financial Status Accents**:
  - **Positive (Income & Savings)**: `emerald-500` / `emerald-400` (`#10b981`)
  - **Negative / Warning (Expenses)**: `rose-500` / `rose-400` (`#f43f5e`)
  - **Neutral / Budgets**: `sky-500` (`#0ea5e9`) or `indigo-400` (`#818cf8`)
  - **AI Voice Glow**: `cyan-400` (`#22d3ee`) to `violet-500` (`#8b5cf6`) gradient.

### Mobile UX & Accessibility
- **Touch Targets**: Minimum 44x44pt on all interactive elements.
- **Safe Areas**: Use `react-native-safe-area-context` to pad notches and system bars.
- **List Performance**: Use `@shopify/flash-list` or optimized `FlatList` with `estimatedItemSize`.

---

## 6. Code Style & Engineering Conventions

### 6.1 TypeScript
- Strict mode is enforced. Do not use `any`.
- Always use Expo Router typed routes (e.g., `router.push('/(tabs)/transactions')`).
- Derive data models from Supabase generated types (`src/types/database.types.ts`).

### 6.2 State & Data Fetching (TanStack Query)
- Encapsulate Supabase database calls in custom React Query hooks under `src/hooks/api/` or `src/services/`.
- Use structured, consistent query keys for predictable cache invalidation.
- Apply optimistic updates on mutations for instant perceived UI feedback.

### 6.3 Security & Database Access
- Enforce Supabase Row Level Security (RLS) on every table and query (`auth.uid() = user_id`).
- Store Supabase auth session tokens using `expo-secure-store`.

---

## 7. Agent Boundaries & Critical Guardrails

### ALWAYS
1. **Verify Before Completion**: Run `npx tsc --noEmit` and `npx expo lint` before declaring any task complete.
2. **Install Native Modules via Expo**: Always use `npx expo install <package>` rather than `npm install` for Expo or native packages.
3. **Human-in-the-Loop for Financial Mutations**: Require explicit user review/confirmation via interactive UI cards before committing financial transactions or account changes.
4. **Follow OpenSpec for Feature Scope**: Consult active OpenSpec changes and specs rather than improvising unapproved feature workflows.
5. **Preserve Codebase Integrity**: Never remove unrelated comments, type definitions, or documentation.

### NEVER
1. **NEVER Hand-Edit Native Folders**: Never modify files in `android/` or `ios/`. Configure native project settings exclusively via `app.json` plugins using Expo Continuous Native Generation (CNG).
2. **NEVER Expose Backend Secrets**: Never expose `OPENAI_API_KEY`, Supabase `SERVICE_ROLE_KEY`, or Deepgram API keys in client-side code. Keep all secrets in Supabase Edge Functions / server environments.
3. **NEVER Break the Dark Theme**: Never introduce pure white screens, pure black surfaces, or light-theme components.
4. **NEVER Guess Expo SDK 58 APIs**: Consult official Expo SDK 58 documentation when utilizing unfamiliar APIs.
5. **NEVER Silently Mutate User Financial Data**: Financial writes must never execute without explicit user confirmation.
