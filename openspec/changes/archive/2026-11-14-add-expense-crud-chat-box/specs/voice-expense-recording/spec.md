# Spec Delta

## MODIFIED Requirements

### Requirement: Voice capture initiates expense recording
The app SHALL provide a push-to-talk (hold-to-speak) control positioned at the center bottom of the root screen that records microphone audio locally while held, and sends the audio buffer to the Supabase Edge Function upon release. The Edge Function SHALL transcribe the audio using the official Deepgram JavaScript SDK (`@deepgram/sdk`) with model `nova-3` and `smart_format: true`.

#### Scenario: User holds mic button
- **WHEN** the user presses and holds the center-bottom voice record button
- **THEN** the system begins recording microphone audio locally and displays recording feedback and animation on screen

#### Scenario: User releases mic button
- **WHEN** the user releases the voice record button
- **THEN** the system finalises the audio recording, transmits the audio payload to the Edge Function, transcribes it via the Deepgram JS SDK (`nova-3`), appends the transcribed user utterance into the chat stream, and forwards the transcript to the expense AI pipeline

#### Scenario: Microphone permission denied
- **WHEN** the user attempts to initiate voice recording without microphone permission granted
- **THEN** the system SHALL display an error message in the chat container and NOT attempt to record audio

### Requirement: Confirmation card displays the AI proposal before any database write
The client SHALL present a dark-theme interactive confirmation card directly inline within the conversational chat stream showing the AI-proposed expense fields. No database write SHALL occur until the user explicitly confirms.

#### Scenario: Confirmation card displayed
- **WHEN** the AI returns a `record_expense` result
- **THEN** the client SHALL display an inline confirmation card inside the chat stream with the following editable fields: amount, description, category (dropdown populated from user's categories), budget (dropdown populated from user's budgets showing remaining balance), spendingType (needs / wants toggle), and dateSpent

#### Scenario: User edits a field before confirming
- **WHEN** the user changes any field on the confirmation card (e.g., selects a different category from the dropdown)
- **THEN** the updated field value SHALL be used in the final commit payload

#### Scenario: User discards the proposal
- **WHEN** the user taps "Discard" or dismisses the confirmation card
- **THEN** the in-memory draft SHALL be cleared, the card is dismissed or marked cancelled in the chat history, and no data SHALL be written to the database

## ADDED Requirements

### Requirement: Root screen hosts conversational chat stream
The root screen SHALL provide a scrollable chatbox container that displays the chronological turn-by-turn transcribed conversation between the user and the AI assistant, rendering user voice transcripts and assistant responses in distinct message bubbles.

#### Scenario: User speech transcribed and rendered in chat
- **WHEN** the audio recording completes and transcription succeeds
- **THEN** a user message bubble containing the exact transcript text SHALL be appended to the chat stream and automatically scrolled into view

#### Scenario: Assistant clarification rendered in chat
- **WHEN** the AI assistant responds with an `ask_clarification` action
- **THEN** an assistant message bubble containing the clarification question and interactive quick-reply chips for suggested options SHALL be appended to the chat stream

#### Scenario: Expense confirmation completed receipt rendered in chat
- **WHEN** the user confirms an expense and the transaction is committed
- **THEN** a success receipt card or message bubble summarizing the recorded expense SHALL be appended to the chat stream

### Requirement: Root screen operates without tab navigation links
The application root screen SHALL present the conversational expense chat interface and center-bottom microphone without rendering a bottom tab navigation bar or tab navigation links.

#### Scenario: User navigates to root screen
- **WHEN** an authenticated user opens or navigates to the root application screen
- **THEN** the interface renders the full-height chatbox container and center-bottom microphone control without displaying tab bar items or tab triggers

### Requirement: Voice query retrieves expense records and budget summaries (Read)
The system SHALL support voice queries allowing users to retrieve spending summaries, budget status, or lists of recent expenses, rendering the results inline within the chat stream.

#### Scenario: User queries total spending
- **WHEN** the user asks a question about spending (e.g., "How much did I spend on Food this month?")
- **THEN** the AI pipeline invokes `query_expenses` with matching filter parameters, retrieves the records, and renders a summary card with formatted totals in the chat stream

#### Scenario: User queries recent expenses list
- **WHEN** the user asks to see recent transactions (e.g., "Show my last 5 expenses")
- **THEN** the system fetches the recent expense rows and displays an inline list card showing dates, descriptions, categories, and amounts

### Requirement: Voice command proposes expense update (Update)
The system SHALL allow users to modify an existing expense by voice, presenting an interactive update card for review before applying changes to the database.

#### Scenario: User requests modification of an existing expense
- **WHEN** the user speaks an update request (e.g., "Change yesterday's Starbucks to 220 pesos")
- **THEN** the AI resolves the target expense ID and the new field values, and presents an inline update confirmation card showing the changes

#### Scenario: User confirms update
- **WHEN** the user confirms the update proposal
- **THEN** the client updates the expense in the database, recalculates and updates the budget current balance if the amount or budget changed, and appends an updated receipt bubble

### Requirement: Voice command proposes expense deletion (Delete)
The system SHALL allow users to delete an existing expense by voice, requiring explicit confirmation before removing the record and refunding any associated budget.

#### Scenario: User requests expense deletion
- **WHEN** the user speaks a deletion command (e.g., "Delete my last expense")
- **THEN** the AI identifies the target expense and presents an inline deletion confirmation card warning the user

#### Scenario: User confirms deletion
- **WHEN** the user taps "Delete" on the confirmation card
- **THEN** the client deletes the expense from the database, refunds the deleted amount back to the associated budget if present, and updates the chat card to show the item has been deleted
