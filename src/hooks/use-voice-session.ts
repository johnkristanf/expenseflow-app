import { useExpenseDraft } from '@/hooks/use-expense-draft';
import { useTTSPlayer } from '@/hooks/use-tts-player';
import { useVoiceRecorder } from '@/hooks/use-voice-recorder';
import { supabase } from '@/lib/supabase';
import {
  AssistantChatResponse,
  ClarificationPayload,
  RecordExpensePayload,
} from '@/types/expense';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

export type VoiceSessionStatus =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'clarifying'
  | 'confirming'
  | 'error';

export interface UseVoiceSessionOptions {
  onUserTranscript?: (transcript: string) => void;
  onAssistantResponse?: (response: AssistantChatResponse) => void;
  onError?: (error: string) => void;
}

export function useVoiceSession(options?: UseVoiceSessionOptions) {
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<VoiceSessionStatus>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [clarification, setClarification] = useState<ClarificationPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { draft, setDraft, mergeDraft, clearDraft } = useExpenseDraft();
  const recorder = useVoiceRecorder();
  const tts = useTTSPlayer();

  const resetSession = useCallback(() => {
    recorder.stopRecording();
    tts.stop();
    clearDraft();
    setTranscript('');
    setClarification(null);
    setErrorMessage(null);
    setStatus('idle');
  }, [clearDraft, recorder, tts]);

  const sendToAssistant = useCallback(
    async (payloadBody: { transcript?: string; audioBase64?: string; activeDraft?: any }) => {
      setStatus('processing');
      setErrorMessage(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error('Please sign in to your account to record voice expenses.');
        }

        const { data, error } = await supabase.functions.invoke<AssistantChatResponse>(
          'assistant-chat',
          {
            body: {
              ...payloadBody,
              activeDraft: draft,
            },
          }
        );

        if (error || !data) {
          let detailedMsg = error?.message || 'Failed to communicate with assistant';
          if (error && 'context' in error && error.context) {
            try {
              const body = await (error as any).context.json();
              if (body?.error) detailedMsg = body.error;
            } catch {}
          }
          throw new Error(detailedMsg);
        }

        if (data.transcript) {
          setTranscript(data.transcript);
          options?.onUserTranscript?.(data.transcript);
        }

        if (data.ttsAudio) {
          tts.play(data.ttsAudio);
        }

        if (data.action === 'record_expense') {
          const expenseData = data.payload as RecordExpensePayload;
          mergeDraft(expenseData);
          setClarification(null);
          setStatus('confirming');
          options?.onAssistantResponse?.(data);
        } else if (data.action === 'ask_clarification') {
          const clarData = data.payload as ClarificationPayload;
          setClarification(clarData);
          setStatus('clarifying');
          options?.onAssistantResponse?.(data);
        } else if (data.action === 'query_expenses') {
          setStatus('idle');
          options?.onAssistantResponse?.(data);
        } else if (data.action === 'update_expense' || data.action === 'delete_expense') {
          setStatus('confirming');
          options?.onAssistantResponse?.(data);
        } else {
          throw new Error('Unrecognized assistant response action');
        }
      } catch (err: any) {
        console.log("Error in sendToAssistant:", err);
        const errorMsg = err?.message || 'Error processing speech';
        setErrorMessage(errorMsg);
        setStatus('error');
        options?.onError?.(errorMsg);
      }
    },
    [draft, mergeDraft, tts, options]
  );

  const startListening = useCallback(async () => {
    setErrorMessage(null);
    await recorder.startRecording();
    setStatus('recording');
  }, [recorder]);

  const stopListening = useCallback(async () => {
    const { base64 } = await recorder.stopRecording();
    if (!base64) {
      if (recorder.error) {
        setErrorMessage(recorder.error);
        setStatus('error');
        options?.onError?.(recorder.error);
      } else {
        setStatus('idle');
      }
      return;
    }

    await sendToAssistant({ audioBase64: base64 });
  }, [recorder, sendToAssistant, options]);

  const answerClarification = useCallback(
    async (text: string) => {
      setTranscript(text);
      await sendToAssistant({ transcript: text });
    },
    [sendToAssistant]
  );

  const confirmExpense = useCallback(
    async (finalPayload: RecordExpensePayload) => {
      setStatus('processing');
      try {
        // Direct insert into expenses table
        const { data: expenseData, error: expenseError } = await supabase
          .from('expenses')
          .insert({
            amount: finalPayload.amount,
            description: finalPayload.description,
            spending_type: finalPayload.spendingType,
            date_spent: finalPayload.dateSpent,
            category_id: finalPayload.categoryId ?? null,
            budget_id: finalPayload.budgetId ?? null,
          })
          .select()
          .single();

        if (expenseError) {
          throw new Error(expenseError.message);
        }

        // Deduct from budget if budgetId is specified
        if (finalPayload.budgetId) {
          const { data: budgetData } = await supabase
            .from('budgets')
            .select('current_amount')
            .eq('id', finalPayload.budgetId)
            .single();

          if (budgetData) {
            const updatedAmount = Math.max(
              0,
              Number(budgetData.current_amount || 0) - Number(finalPayload.amount)
            );
            await supabase
              .from('budgets')
              .update({
                current_amount: updatedAmount,
                updated_at: new Date().toISOString(),
              })
              .eq('id', finalPayload.budgetId);
          }
        }

        // Invalidate queries so lists and budget balances update immediately
        await queryClient.invalidateQueries({ queryKey: ['expenses'] });
        await queryClient.invalidateQueries({ queryKey: ['budgets'] });

        resetSession();
        return { success: true, data: expenseData };
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to record expense');
        setStatus('confirming'); // Stay on confirmation card so user can fix or retry
        return { success: false, error: err?.message };
      }
    },
    [queryClient, resetSession]
  );

  const updateExpense = useCallback(
    async (payload: {
      targetExpenseId: number;
      amount?: number;
      description?: string;
      categoryId?: number | null;
      budgetId?: number | null;
      spendingType?: 'needs' | 'wants';
      dateSpent?: string;
    }) => {
      setStatus('processing');
      try {
        // Fetch existing expense to compare amount and budget
        const { data: existing } = await supabase
          .from('expenses')
          .select('*')
          .eq('id', payload.targetExpenseId)
          .single();

        const updateFields: any = { updated_at: new Date().toISOString() };
        if (payload.amount !== undefined) updateFields.amount = payload.amount;
        if (payload.description !== undefined) updateFields.description = payload.description;
        if (payload.categoryId !== undefined) updateFields.category_id = payload.categoryId;
        if (payload.budgetId !== undefined) updateFields.budget_id = payload.budgetId;
        if (payload.spendingType !== undefined) updateFields.spending_type = payload.spendingType;
        if (payload.dateSpent !== undefined) updateFields.date_spent = payload.dateSpent;

        const { data: updated, error } = await supabase
          .from('expenses')
          .update(updateFields)
          .eq('id', payload.targetExpenseId)
          .select()
          .single();

        if (error) throw new Error(error.message);

        // Adjust budget delta if amount changed
        if (payload.amount !== undefined && existing?.budget_id) {
          const delta = Number(payload.amount) - Number(existing.amount || 0);
          if (delta !== 0) {
            const { data: bData } = await supabase
              .from('budgets')
              .select('current_amount')
              .eq('id', existing.budget_id)
              .single();

            if (bData) {
              await supabase
                .from('budgets')
                .update({
                  current_amount: Math.max(0, Number(bData.current_amount || 0) - delta),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.budget_id);
            }
          }
        }

        await queryClient.invalidateQueries({ queryKey: ['expenses'] });
        await queryClient.invalidateQueries({ queryKey: ['budgets'] });
        resetSession();
        return { success: true, data: updated };
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to update expense');
        setStatus('idle');
        return { success: false, error: err?.message };
      }
    },
    [queryClient, resetSession]
  );

  const deleteExpense = useCallback(
    async (expenseId: number) => {
      setStatus('processing');
      try {
        const { data: existing } = await supabase
          .from('expenses')
          .select('*')
          .eq('id', expenseId)
          .single();

        const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
        if (error) throw new Error(error.message);

        // Refund budget if deleted expense was assigned to a budget
        if (existing?.budget_id && Number(existing.amount || 0) > 0) {
          const { data: bData } = await supabase
            .from('budgets')
            .select('current_amount')
            .eq('id', existing.budget_id)
            .single();

          if (bData) {
            await supabase
              .from('budgets')
              .update({
                current_amount: Number(bData.current_amount || 0) + Number(existing.amount),
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.budget_id);
          }
        }

        await queryClient.invalidateQueries({ queryKey: ['expenses'] });
        await queryClient.invalidateQueries({ queryKey: ['budgets'] });
        resetSession();
        return { success: true };
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to delete expense');
        setStatus('idle');
        return { success: false, error: err?.message };
      }
    },
    [queryClient, resetSession]
  );

  const queryExpenses = useCallback(
    async (payload: {
      queryType: 'total_spend' | 'recent_list' | 'budget_status';
      timeframe?: 'today' | 'this_week' | 'this_month' | 'all';
      categoryId?: number;
      budgetId?: number;
      limit?: number;
    }) => {
      try {
        let query = supabase.from('expenses').select('*');
        if (payload.categoryId) query = query.eq('category_id', payload.categoryId);
        if (payload.budgetId) query = query.eq('budget_id', payload.budgetId);
        if (payload.timeframe === 'today') {
          query = query.eq('date_spent', new Date().toISOString().split('T')[0]);
        }
        const { data, error } = await query
          .order('date_spent', { ascending: false })
          .limit(payload.limit || 10);

        if (error) throw new Error(error.message);
        const list = data || [];
        const total = list.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        return { success: true, expenses: list, total };
      } catch (err: any) {
        return { success: false, error: err?.message, expenses: [], total: 0 };
      }
    },
    []
  );

  return {
    status,
    draft,
    setDraft,
    transcript,
    clarification,
    errorMessage,
    isRecording: recorder.isRecording,
    isProcessing: status === 'processing',
    startListening,
    stopListening,
    answerClarification,
    confirmExpense,
    updateExpense,
    deleteExpense,
    queryExpenses,
    resetSession,
  };
}
