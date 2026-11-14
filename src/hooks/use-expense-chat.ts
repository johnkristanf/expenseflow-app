import { useCallback, useState } from 'react';
import { useVoiceSession } from '@/hooks/use-voice-session';
import {
  AssistantChatResponse,
  ChatMessage,
  ClarificationPayload,
  DeleteExpensePayload,
  QueryExpensesPayload,
  RecordExpensePayload,
  UpdateExpensePayload,
} from '@/types/expense';

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome-msg',
  sender: 'assistant',
  text: 'Hi! You can speak to record, view, edit, or delete expenses (e.g., "Spent 250 for groceries", "Show my recent expenses", "Change my last expense").',
  timestamp: new Date().toISOString(),
  type: 'text',
};

export function useExpenseChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);

  const handleUserTranscript = useCallback((transcript: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sender: 'user',
        text: transcript,
        timestamp: new Date().toISOString(),
        type: 'text',
      },
    ]);
  }, []);

  const session = useVoiceSession({
    onUserTranscript: handleUserTranscript,
    onAssistantResponse: async (response: AssistantChatResponse) => {
      if (response.action === 'ask_clarification') {
        const payload = response.payload as ClarificationPayload;
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            sender: 'assistant',
            text: payload.question,
            timestamp: new Date().toISOString(),
            type: 'clarification',
            clarification: payload,
          },
        ]);
      } else if (response.action === 'record_expense') {
        const payload = response.payload as RecordExpensePayload;
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            sender: 'assistant',
            text: 'Here is your expense proposal. Please review and confirm:',
            timestamp: new Date().toISOString(),
            type: 'confirmation',
            proposal: payload,
            status: 'pending',
          },
        ]);
      } else if (response.action === 'query_expenses') {
        const payload = response.payload as QueryExpensesPayload;
        const res = await session.queryExpenses(payload);
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            sender: 'assistant',
            text: `Found ${res.expenses.length} transaction(s):`,
            timestamp: new Date().toISOString(),
            type: 'query_result',
            queryPayload: payload,
            queryResults: res.expenses,
            totalAmount: res.total,
          },
        ]);
      } else if (response.action === 'update_expense') {
        const payload = response.payload as UpdateExpensePayload;
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            sender: 'assistant',
            text: 'Please review and confirm this expense update:',
            timestamp: new Date().toISOString(),
            type: 'update_proposal',
            updatePayload: payload,
            status: 'pending',
          },
        ]);
      } else if (response.action === 'delete_expense') {
        const payload = response.payload as DeleteExpensePayload;
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            sender: 'assistant',
            text: 'Are you sure you want to delete this expense?',
            timestamp: new Date().toISOString(),
            type: 'delete_proposal',
            deletePayload: payload,
            status: 'pending',
          },
        ]);
      }
    },
    onError: (errorMessage: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          sender: 'system',
          text: errorMessage,
          timestamp: new Date().toISOString(),
          type: 'error',
          error: errorMessage,
        },
      ]);
    },
  });

  const answerClarification = useCallback(
    async (optionText: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          sender: 'user',
          text: optionText,
          timestamp: new Date().toISOString(),
          type: 'text',
        },
      ]);
      await session.answerClarification(optionText);
    },
    [session]
  );

  const confirmExpense = useCallback(
    async (messageId: string, finalPayload: RecordExpensePayload) => {
      const result = await session.confirmExpense(finalPayload);
      if (result.success) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, status: 'confirmed', proposal: finalPayload } : msg
          )
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            sender: 'assistant',
            text: `Expense recorded successfully: ₱${Number(finalPayload.amount).toFixed(2)} for ${finalPayload.description}.`,
            timestamp: new Date().toISOString(),
            type: 'receipt',
            proposal: finalPayload,
          },
        ]);
      }
      return result;
    },
    [session]
  );

  const confirmUpdate = useCallback(
    async (messageId: string, updatePayload: UpdateExpensePayload) => {
      const result = await session.updateExpense(updatePayload);
      if (result.success) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, status: 'confirmed' } : msg
          )
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            sender: 'assistant',
            text: `Expense updated successfully.`,
            timestamp: new Date().toISOString(),
            type: 'receipt',
          },
        ]);
      }
      return result;
    },
    [session]
  );

  const confirmDelete = useCallback(
    async (messageId: string, expenseId: number) => {
      const result = await session.deleteExpense(expenseId);
      if (result.success) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, status: 'confirmed' } : msg
          )
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            sender: 'assistant',
            text: `Expense #${expenseId} has been deleted.`,
            timestamp: new Date().toISOString(),
            type: 'receipt',
          },
        ]);
      }
      return result;
    },
    [session]
  );

  const discardProposal = useCallback(
    (messageId: string) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, status: 'cancelled' } : msg))
      );
      session.resetSession();
    },
    [session]
  );

  const clearChat = useCallback(() => {
    session.resetSession();
    setMessages([INITIAL_MESSAGE]);
  }, [session]);

  return {
    messages,
    sessionStatus: session.status,
    isRecording: session.isRecording,
    isProcessing: session.isProcessing,
    startListening: session.startListening,
    stopListening: session.stopListening,
    answerClarification,
    confirmExpense,
    confirmUpdate,
    confirmDelete,
    discardProposal,
    clearChat,
  };
}
