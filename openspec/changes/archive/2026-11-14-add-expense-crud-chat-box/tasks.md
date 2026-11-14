# Tasks

## 1. Tab Navigation Removal

- [x] 1.1 Update `src/app/(tabs)/_layout.tsx` to remove `NativeTabs` and tab triggers, rendering `<Slot />` without a bottom tab bar, and verify no tab navigation bar is rendered.

## 2. Conversational Chat State & Components

- [x] 2.1 Define chat message data models and conversational state hook (`ChatMessage` types, user/assistant turns, clarification chips, and confirmation cards) and verify type safety with `npx tsc --noEmit`.
- [x] 2.2 Create the chat message bubble components (`UserBubble`, `AssistantBubble`, quick-reply clarification chips, and success receipt card) adhering to dark theme styling (`bg-slate-900`, `border-slate-800`, `text-white`), verifying component rendering.
- [x] 2.3 Integrate `ExpenseConfirmationCard` inline within the chat message stream so proposals can be reviewed, edited, discarded, or confirmed in-place without opening a modal, verifying confirmation callback triggers.

## 3. Center-Bottom Microphone Control

- [x] 3.1 Create `CenterMicButton` in `src/components/voice/` positioned at the center bottom with pulse/glow animations during recording, exceeding the 44x44pt accessibility touch target, and verify push-to-talk and tap-to-record behavior.

## 4. Root Screen Replacement & Integration

- [x] 4.1 Remove existing boilerplate components (`AnimatedIcon`, `HintRow`, dev menu hints, `WebBadge`, and floating `VoiceFab`) from `src/app/(tabs)/index.tsx`.
- [x] 4.2 Assemble the full-screen conversational chat container and center-bottom mic in `src/app/(tabs)/index.tsx`, connecting audio recording to user transcript bubbles and assistant responses.
- [x] 4.3 Implement auto-scroll to the bottom of the chat list on new turns or status updates, ensuring generous bottom padding so the center-bottom mic does not obscure the latest message.

## 5. Verification & Testing

- [x] 5.1 Run `npx tsc --noEmit` to verify strict TypeScript compilation with zero type errors.
- [x] 5.2 Run `npx expo lint` to verify clean ESLint compliance across all modified and new files.

## 6. Edge Function CRUD Tools

- [x] 6.1 Add `query_expenses`, `update_expense`, and `delete_expense` tools to `ASSISTANT_TOOLS` in `supabase/functions/_shared/openai.ts` and verify tool schemas.
- [x] 6.2 Update prompt instructions in `supabase/functions/_shared/prompts/expense-assistant.md` and database context in `database.ts` to include recent expenses for reference resolution (e.g., "last expense").

## 7. Conversational State & Direct DB CRUD Handlers

- [x] 7.1 Extend `ChatMessage` types and action response types in `src/types/expense.ts` to support query results, update proposals, and delete proposals.
- [x] 7.2 Implement direct Supabase handlers for `query_expenses`, `update_expense`, and `delete_expense` in `src/hooks/use-voice-session.ts` and `src/hooks/use-expense-chat.ts`.

## 8. Inline Chat CRUD Components

- [x] 8.1 Build `ExpenseListCard` to display query results (totals and recent transaction lists) inside the chat stream.
- [x] 8.2 Build `ExpenseUpdateCard` and `ExpenseDeleteCard` with human-in-the-loop confirmation buttons and wire them into `src/components/voice/chat-message-item.tsx`.

## 9. Verification & Testing

- [x] 9.1 Run `npx tsc --noEmit` to verify strict TypeScript compilation across all new files.
- [x] 9.2 Run `npx expo lint` to verify clean ESLint compliance with zero errors and warnings.
