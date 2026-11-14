import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Edit3, Trash2, AlertCircle, Check, X } from 'lucide-react-native';
import { DeleteExpensePayload, UpdateExpensePayload } from '@/types/expense';

interface ExpenseUpdateCardProps {
  updatePayload: UpdateExpensePayload;
  onConfirm: (payload: UpdateExpensePayload) => void;
  onDiscard: () => void;
  isLoading?: boolean;
}

export function ExpenseUpdateCard({
  updatePayload,
  onConfirm,
  onDiscard,
  isLoading,
}: ExpenseUpdateCardProps) {
  const [amount, setAmount] = useState<string>(
    updatePayload.amount !== undefined ? String(updatePayload.amount) : ''
  );
  const [description, setDescription] = useState<string>(updatePayload.description || '');

  const handleConfirm = () => {
    const parsedAmount = amount ? parseFloat(amount) : updatePayload.amount;
    onConfirm({
      ...updatePayload,
      amount: parsedAmount,
      description: description.trim() || updatePayload.description,
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Edit3 size={16} color="#38bdf8" />
        </View>
        <Text style={styles.headerTitle}>Update Expense #{updatePayload.targetExpenseId}</Text>
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Amount (PHP):</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="New amount"
          placeholderTextColor="#64748b"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Description:</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="New description"
          placeholderTextColor="#64748b"
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.discardButton}
          onPress={onDiscard}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <X size={16} color="#94a3b8" style={styles.btnIcon} />
          <Text style={styles.discardButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Check size={16} color="#ffffff" style={styles.btnIcon} />
              <Text style={styles.confirmButtonText}>Confirm Update</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface ExpenseDeleteCardProps {
  deletePayload: DeleteExpensePayload;
  onConfirm: (expenseId: number) => void;
  onDiscard: () => void;
  isLoading?: boolean;
}

export function ExpenseDeleteCard({
  deletePayload,
  onConfirm,
  onDiscard,
  isLoading,
}: ExpenseDeleteCardProps) {
  return (
    <View style={[styles.card, styles.deleteCard]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, styles.deleteIconCircle]}>
          <Trash2 size={16} color="#f43f5e" />
        </View>
        <Text style={[styles.headerTitle, styles.deleteTitle]}>Confirm Deletion</Text>
      </View>

      <Text style={styles.deleteDescription}>
        Are you sure you want to delete expense{' '}
        <Text style={styles.highlightText}>
          {deletePayload.description ? `"${deletePayload.description}"` : `#${deletePayload.targetExpenseId}`}
        </Text>
        {deletePayload.amount !== undefined ? ` (₱${Number(deletePayload.amount).toFixed(2)})` : ''}?
      </Text>

      <View style={styles.warningBox}>
        <AlertCircle size={14} color="#fb7185" style={{ marginRight: 6 }} />
        <Text style={styles.warningText}>Any deducted budget amount will be refunded.</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.discardButton}
          onPress={onDiscard}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Text style={styles.discardButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmButton, styles.deleteButton]}
          onPress={() => onConfirm(deletePayload.targetExpenseId)}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Trash2 size={16} color="#ffffff" style={styles.btnIcon} />
              <Text style={styles.confirmButtonText}>Delete Expense</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    width: '100%',
  },
  deleteCard: {
    borderColor: '#e11d48',
    backgroundColor: 'rgba(225, 29, 72, 0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  deleteIconCircle: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
  },
  headerTitle: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteTitle: {
    color: '#f43f5e',
  },
  deleteDescription: {
    color: '#f8fafc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  highlightText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  warningText: {
    color: '#fb7185',
    fontSize: 12,
    flex: 1,
  },
  fieldRow: {
    marginBottom: 10,
  },
  fieldLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#020617',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  discardButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discardButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1.4,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#e11d48',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnIcon: {
    marginRight: 6,
  },
});
