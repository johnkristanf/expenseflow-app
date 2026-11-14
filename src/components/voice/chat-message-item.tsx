import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Bot, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react-native';
import {
  ChatMessage,
  RecordExpensePayload,
  UpdateExpensePayload,
} from '@/types/expense';
import { ExpenseConfirmationCard } from './expense-confirmation-card';
import { ExpenseListCard } from './expense-list-card';
import { ExpenseUpdateCard, ExpenseDeleteCard } from './expense-crud-cards';

interface ChatMessageItemProps {
  message: ChatMessage;
  onSelectOption?: (option: string) => void;
  onConfirmExpense?: (messageId: string, payload: RecordExpensePayload) => Promise<{ success: boolean; error?: string }>;
  onConfirmUpdate?: (messageId: string, payload: UpdateExpensePayload) => Promise<{ success: boolean; error?: string }>;
  onConfirmDelete?: (messageId: string, expenseId: number) => Promise<{ success: boolean; error?: string }>;
  onDiscardProposal?: (messageId: string) => void;
  isProcessing?: boolean;
}

export function ChatMessageItem({
  message,
  onSelectOption,
  onConfirmExpense,
  onConfirmUpdate,
  onConfirmDelete,
  onDiscardProposal,
  isProcessing,
}: ChatMessageItemProps) {
  if (message.sender === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  if (message.type === 'error') {
    return (
      <View style={styles.assistantRow}>
        <View style={styles.errorBox}>
          <AlertTriangle size={18} color="#fb7185" style={styles.iconMargin} />
          <Text style={styles.errorText}>{message.text || message.error}</Text>
        </View>
      </View>
    );
  }

  if (message.type === 'receipt') {
    return (
      <View style={styles.assistantRow}>
        <View style={styles.receiptBox}>
          <View style={styles.receiptHeader}>
            <CheckCircle2 size={18} color="#10b981" style={styles.iconMargin} />
            <Text style={styles.receiptTitle}>Success</Text>
          </View>
          <Text style={styles.receiptText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  if (message.type === 'query_result' && message.queryResults) {
    return (
      <View style={styles.assistantRow}>
        <View style={styles.cardContainer}>
          <ExpenseListCard
            expenses={message.queryResults}
            totalAmount={message.totalAmount}
          />
        </View>
      </View>
    );
  }

  if (message.type === 'update_proposal' && message.updatePayload) {
    if (message.status === 'confirmed') {
      return (
        <View style={styles.assistantRow}>
          <View style={styles.resolvedBox}>
            <CheckCircle2 size={16} color="#10b981" style={styles.iconMargin} />
            <Text style={styles.resolvedText}>
              Expense #{message.updatePayload.targetExpenseId} update applied
            </Text>
          </View>
        </View>
      );
    }

    if (message.status === 'cancelled') {
      return (
        <View style={styles.assistantRow}>
          <View style={styles.resolvedBox}>
            <XCircle size={16} color="#94a3b8" style={styles.iconMargin} />
            <Text style={styles.cancelledText}>Update discarded</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.assistantRow}>
        <View style={styles.cardContainer}>
          <ExpenseUpdateCard
            updatePayload={message.updatePayload}
            isLoading={isProcessing}
            onConfirm={(payload) =>
              onConfirmUpdate ? onConfirmUpdate(message.id, payload) : Promise.resolve({ success: false })
            }
            onDiscard={() => onDiscardProposal?.(message.id)}
          />
        </View>
      </View>
    );
  }

  if (message.type === 'delete_proposal' && message.deletePayload) {
    if (message.status === 'confirmed') {
      return (
        <View style={styles.assistantRow}>
          <View style={styles.resolvedBox}>
            <CheckCircle2 size={16} color="#10b981" style={styles.iconMargin} />
            <Text style={styles.resolvedText}>
              Expense #{message.deletePayload.targetExpenseId} deleted
            </Text>
          </View>
        </View>
      );
    }

    if (message.status === 'cancelled') {
      return (
        <View style={styles.assistantRow}>
          <View style={styles.resolvedBox}>
            <XCircle size={16} color="#94a3b8" style={styles.iconMargin} />
            <Text style={styles.cancelledText}>Deletion cancelled</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.assistantRow}>
        <View style={styles.cardContainer}>
          <ExpenseDeleteCard
            deletePayload={message.deletePayload}
            isLoading={isProcessing}
            onConfirm={(expenseId) =>
              onConfirmDelete ? onConfirmDelete(message.id, expenseId) : Promise.resolve({ success: false })
            }
            onDiscard={() => onDiscardProposal?.(message.id)}
          />
        </View>
      </View>
    );
  }

  if (message.type === 'confirmation' && message.proposal) {
    if (message.status === 'confirmed') {
      return (
        <View style={styles.assistantRow}>
          <View style={styles.resolvedBox}>
            <CheckCircle2 size={16} color="#10b981" style={styles.iconMargin} />
            <Text style={styles.resolvedText}>
              Confirmed: ₱{Number(message.proposal.amount).toFixed(2)} - {message.proposal.description}
            </Text>
          </View>
        </View>
      );
    }

    if (message.status === 'cancelled') {
      return (
        <View style={styles.assistantRow}>
          <View style={styles.resolvedBox}>
            <XCircle size={16} color="#94a3b8" style={styles.iconMargin} />
            <Text style={styles.cancelledText}>Proposal discarded</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.assistantRow}>
        <View style={styles.cardContainer}>
          <ExpenseConfirmationCard
            initialDraft={message.proposal}
            isLoading={isProcessing}
            onConfirm={(payload) =>
              onConfirmExpense ? onConfirmExpense(message.id, payload) : Promise.resolve({ success: false })
            }
            onDiscard={() => onDiscardProposal?.(message.id)}
          />
        </View>
      </View>
    );
  }

  if (message.type === 'clarification' && message.clarification) {
    const options = message.clarification.suggestedOptions || [];
    return (
      <View style={styles.assistantRow}>
        <View style={styles.assistantBubble}>
          <View style={styles.assistantHeader}>
            <Bot size={16} color="#22d3ee" style={styles.iconMargin} />
            <Text style={styles.assistantLabel}>Assistant</Text>
          </View>
          <Text style={styles.assistantText}>{message.text}</Text>

          {options.length > 0 && (
            <View style={styles.chipContainer}>
              <Text style={styles.chipPrompt}>Tap to select or hold mic:</Text>
              <View style={styles.chipRow}>
                {options.map((opt, i) => (
                  <TouchableOpacity
                    key={`${opt}-${i}`}
                    style={styles.chip}
                    activeOpacity={0.7}
                    disabled={isProcessing}
                    onPress={() => onSelectOption?.(opt)}
                  >
                    <Text style={styles.chipText}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Standard assistant text bubble
  return (
    <View style={styles.assistantRow}>
      <View style={styles.assistantBubble}>
        <View style={styles.assistantHeader}>
          <Bot size={16} color="#22d3ee" style={styles.iconMargin} />
          <Text style={styles.assistantLabel}>Assistant</Text>
        </View>
        <Text style={styles.assistantText}>{message.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 6,
    paddingLeft: 40,
  },
  userBubble: {
    backgroundColor: '#0284c7',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '88%',
  },
  userText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  assistantRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 6,
    paddingRight: 16,
  },
  assistantBubble: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '92%',
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  assistantLabel: {
    color: '#22d3ee',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  assistantText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
  },
  iconMargin: {
    marginRight: 6,
  },
  chipContainer: {
    marginTop: 10,
    borderTopColor: '#1e293b',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  chipPrompt: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#1e293b',
    borderColor: '#38bdf8',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  cardContainer: {
    width: '100%',
  },
  receiptBox: {
    backgroundColor: '#0f172a',
    borderColor: '#059669',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    width: '100%',
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  receiptTitle: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  receiptText: {
    color: '#f8fafc',
    fontSize: 14,
    lineHeight: 20,
  },
  resolvedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  resolvedText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  cancelledText: {
    color: '#64748b',
    fontSize: 13,
    fontStyle: 'italic',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: '#f43f5e',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    maxWidth: '92%',
  },
  errorText: {
    color: '#fb7185',
    fontSize: 13,
    flex: 1,
  },
});
