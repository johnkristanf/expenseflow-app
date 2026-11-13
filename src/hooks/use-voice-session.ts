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

export function useVoiceSession() {
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
            } catch (_) {}
          }
          throw new Error(detailedMsg);
        }

        if (data.transcript) {
          setTranscript(data.transcript);
        }

        if (data.ttsAudio) {
          tts.play(data.ttsAudio);
        }

        if (data.action === 'record_expense') {
          const expenseData = data.payload as RecordExpensePayload;
          mergeDraft(expenseData);
          setClarification(null);
          setStatus('confirming');
        } else if (data.action === 'ask_clarification') {
          const clarData = data.payload as ClarificationPayload;
          setClarification(clarData);
          setStatus('clarifying');
        } else {
          throw new Error('Unrecognized assistant response action');
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Error processing speech');
        setStatus('error');
      }
    },
    [draft, mergeDraft, tts]
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
      } else {
        setStatus('idle');
      }
      return;
    }

    await sendToAssistant({ audioBase64: base64 });
  }, [recorder, sendToAssistant]);

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
        const { data, error } = await supabase.rpc('record_expense', {
          payload: finalPayload,
        });

        if (error) {
          throw new Error(error.message);
        }

        // Invalidate queries so lists and budget balances update immediately
        await queryClient.invalidateQueries({ queryKey: ['expenses'] });
        await queryClient.invalidateQueries({ queryKey: ['budgets'] });

        resetSession();
        return { success: true, data };
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to record expense');
        setStatus('confirming'); // Stay on confirmation card so user can fix or retry
        return { success: false, error: err?.message };
      }
    },
    [queryClient, resetSession]
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
    resetSession,
  };
}
