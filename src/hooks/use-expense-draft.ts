import { useState, useCallback } from 'react';
import { ExpenseDraft } from '@/types/expense';

export function useExpenseDraft(initialDraft?: ExpenseDraft) {
  const [draft, setDraft] = useState<ExpenseDraft>(initialDraft || {});

  const mergeDraft = useCallback((partial: Partial<ExpenseDraft>) => {
    setDraft((prev) => ({
      ...prev,
      ...partial,
    }));
  }, []);

  const clearDraft = useCallback(() => {
    setDraft({});
  }, []);

  const isDraftComplete = useCallback(() => {
    return Boolean(
      draft.amount &&
      draft.amount > 0 &&
      draft.description &&
      draft.description.trim().length > 0 &&
      draft.dateSpent &&
      draft.spendingType
    );
  }, [draft]);

  return {
    draft,
    setDraft,
    mergeDraft,
    clearDraft,
    isDraftComplete,
  };
}
