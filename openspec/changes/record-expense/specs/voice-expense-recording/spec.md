# Spec Delta

## Purpose

Enables users to record a financial expense by speaking naturally; the system extracts entities via AI, clarifies missing fields conversationally using Draft Slot-Filling, and commits the expense only after explicit user confirmation.

## ADDED Requirements

### Requirement: Voice capture initiates expense recording
The app SHALL provide a push-to-talk (hold-to-speak) control that captures microphone audio and streams it in real time to Deepgram Nova-3 STT via WebSocket while the user is holding the control.

#### Scenario: User holds mic button
- **WHEN** the user presses and holds the voice record button
- **THEN** the system opens a Deepgram STT WebSocket connection and begins streaming PCM audio, displaying an interim live transcript on screen

#### Scenario: User releases mic button
- **WHEN** the user releases the voice record button
- **THEN** the system closes the audio stream, finalises the transcript, and forwards it to the expense AI pipeline

#### Scenario: Microphone permission denied
- **WHEN** the user attempts to initiate voice recording without microphone permission granted
- **THEN** the system SHALL display an error message and NOT attempt to open an audio stream

---

### Requirement: AI extracts expense entities from transcript
The AI pipeline in the Supabase Edge Function SHALL attempt to extract the following fields from the transcript: `amount`, `description`, `categoryId`, `budgetId`, `spendingType`, and `dateSpent`.

#### Scenario: All entities present in one utterance
- **WHEN** the transcript contains a recognisable amount, description, category or budget reference, and spending intent
- **THEN** the AI SHALL call `propose_expense` with all resolved fields populated and return the proposal to the client

#### Scenario: Implicit entity resolution via semantic inference
- **WHEN** the transcript mentions a merchant or item (e.g., "Starbucks", "Shell gasoline") that semantically matches a user category or budget name/notes
- **THEN** the AI SHALL resolve the matching `categoryId` and `budgetId` using the user's injected context list and world knowledge, without requiring the user to name the category or budget explicitly

#### Scenario: Explicit entity naming by user
- **WHEN** the user explicitly names a category or budget (e.g., "under Food budget", "from Commute budget")
- **THEN** the AI SHALL match the named entity to the exact record ID from the injected context and use that ID in the proposal

---

### Requirement: Draft Slot-Filling maintains conversational state across turns
The client SHALL maintain a transient `ExpenseDraft` JSON object in memory for the duration of an active voice session. On every turn after the first, the client SHALL send the current draft alongside the new transcript to the Edge Function. The Edge Function SHALL bind the user's response to the draft context, NOT treat it as a new unrelated expense entry.

#### Scenario: Second turn carries draft context
- **WHEN** the user answers a clarification question (e.g., says "210 pesos" after being asked "How much was the Starbucks coffee?")
- **AND** the client sends the active `ExpenseDraft` (containing description, categoryId, budgetId, spendingType) together with the new transcript
- **THEN** the Edge Function SHALL merge the user's answer into the draft fields and produce a completed `propose_expense` call, NOT start a new extraction from scratch

#### Scenario: Draft is cleared on session end
- **WHEN** the user confirms an expense, discards the session, or closes the voice modal
- **THEN** the in-memory `ExpenseDraft` SHALL be cleared and the next voice session starts with an empty draft

---

### Requirement: AI asks clarifying questions when entities cannot be resolved
When one or more required fields (`amount`, `description`, `categoryId`, `budgetId`) cannot be resolved from the transcript and draft, the AI SHALL call `ask_clarification` instead of `propose_expense`, causing the system to ask the user a targeted follow-up question.

#### Scenario: Amount is missing
- **WHEN** the transcript mentions a merchant but no monetary amount, and the draft has no amount
- **THEN** the AI SHALL call `ask_clarification` with `missingEntity: "amount"` and a natural-language question (e.g., "How much did you spend at Starbucks?")
- **AND** Deepgram Aura TTS SHALL speak the question aloud to the user

#### Scenario: Category is ambiguous between multiple options
- **WHEN** the transcript or draft description could plausibly belong to more than one of the user's categories
- **THEN** the AI SHALL call `ask_clarification` with `missingEntity: "category"`, the question text, and a `suggestedOptions` array of matching category names
- **AND** the client SHALL display the options as quick-reply chips the user can tap or speak

#### Scenario: Expense type maps to no existing category or budget
- **WHEN** the inferred expense type (e.g., "dental cleanup") does not match any of the user's categories or budgets
- **THEN** the AI SHALL call `ask_clarification` informing the user that no matching category exists and offering to create one, or to pick an existing one

#### Scenario: Clarification answer is received
- **WHEN** the user speaks or taps a clarification answer
- **THEN** the client SHALL append the answer to the in-memory turn history, attach the current `ExpenseDraft`, and re-invoke the Edge Function pipeline
- **AND** the pipeline SHALL attempt to resolve all remaining missing fields before issuing another `ask_clarification` or returning `propose_expense`

---

### Requirement: Confirmation card displays the AI proposal before any database write
The client SHALL present a dark-theme interactive confirmation card showing the AI-proposed expense fields. No database write SHALL occur until the user explicitly confirms.

#### Scenario: Confirmation card displayed
- **WHEN** the AI returns a `propose_expense` result
- **THEN** the client SHALL display a confirmation card with the following editable fields: amount, description, category (dropdown populated from user's categories), budget (dropdown populated from user's budgets showing remaining balance), spendingType (needs / wants toggle), and dateSpent

#### Scenario: User edits a field before confirming
- **WHEN** the user changes any field on the confirmation card (e.g., selects a different category from the dropdown)
- **THEN** the updated field value SHALL be used in the final commit payload

#### Scenario: User discards the proposal
- **WHEN** the user taps "Discard" or dismisses the confirmation card
- **THEN** the in-memory draft SHALL be cleared and no data SHALL be written to the database

---

### Requirement: Expense is committed atomically to the database on confirmation
On user confirmation the system SHALL commit the expense to the database in a single atomic transaction that inserts into `expenses` and, when a `budgetId` is present, deducts the amount from `budgets.currentAmount`.

#### Scenario: Successful commit with budget deduction
- **WHEN** the user confirms the expense and `budgetId` is set with sufficient balance
- **THEN** an `expenses` row SHALL be inserted and `budgets.currentAmount` SHALL be decremented by `amount` in a single transaction
- **AND** the client SHALL show a success state and invalidate the relevant TanStack Query caches for expenses and budgets

#### Scenario: Budget balance insufficient
- **WHEN** `budgets.currentAmount` is less than the expense `amount` at commit time
- **THEN** the transaction SHALL be rolled back, no expense row SHALL be inserted, and the client SHALL display an error message indicating insufficient budget balance

#### Scenario: Expense committed without a budget
- **WHEN** the user confirms the expense and `budgetId` is null (no budget selected)
- **THEN** only the `expenses` row SHALL be inserted with `budget_id = null`; no budget deduction occurs

---

### Requirement: AI spoken feedback via Deepgram Aura TTS
The Edge Function SHALL generate a short spoken summary using Deepgram Aura TTS after each successful `propose_expense` resolution and after each `ask_clarification` question, returning the audio to the client for playback.

#### Scenario: Proposal spoken summary
- **WHEN** `propose_expense` is called with all required fields
- **THEN** the Edge Function SHALL generate and return a TTS audio buffer summarising the proposed expense (e.g., "Got it! ₱210 for Starbucks coffee under Daily Food.")
- **AND** the client SHALL play the audio before or while the confirmation card renders

#### Scenario: Clarification question spoken aloud
- **WHEN** `ask_clarification` is called
- **THEN** the Edge Function SHALL return the clarification question as a TTS audio buffer
- **AND** the client SHALL play the audio and simultaneously display the question text and any `suggestedOptions` chips
