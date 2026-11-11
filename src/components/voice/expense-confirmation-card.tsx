import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Check, X, Tag, PieChart, Calendar, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Category, Budget, ExpenseDraft, RecordExpensePayload } from '@/types/expense';

interface ExpenseConfirmationCardProps {
  initialDraft: ExpenseDraft;
  onConfirm: (payload: RecordExpensePayload) => Promise<{ success: boolean; error?: string }>;
  onDiscard: () => void;
  isLoading?: boolean;
}

export function ExpenseConfirmationCard({
  initialDraft,
  onConfirm,
  onDiscard,
  isLoading,
}: ExpenseConfirmationCardProps) {
  const [amount, setAmount] = useState<string>(initialDraft.amount ? String(initialDraft.amount) : '');
  const [description, setDescription] = useState<string>(initialDraft.description || '');
  const [spendingType, setSpendingType] = useState<'needs' | 'wants'>(
    initialDraft.spendingType || 'needs'
  );
  const [dateSpent, setDateSpent] = useState<string>(
    initialDraft.dateSpent || new Date().toISOString().split('T')[0]
  );
  const [categoryId, setCategoryId] = useState<number | null>(initialDraft.categoryId ?? null);
  const [budgetId, setBudgetId] = useState<number | null>(initialDraft.budgetId ?? null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showBudgetPicker, setShowBudgetPicker] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEntities() {
      const [catsRes, bgtRes] = await Promise.all([
        supabase.from('categories').select('id, name, notes').order('name'),
        supabase.from('budgets').select('id, name, current_amount, total_amount').order('name'),
      ]);
      if (catsRes.data) setCategories(catsRes.data);
      if (bgtRes.data) setBudgets(bgtRes.data);
    }
    fetchEntities();
  }, []);

  const parsedAmount = parseFloat(amount);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0 && description.trim().length > 0;

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedBudget = budgets.find((b) => b.id === budgetId);

  const handleConfirm = async () => {
    if (!isValid) return;
    setLocalError(null);

    const payload: RecordExpensePayload = {
      amount: parsedAmount,
      description: description.trim(),
      spendingType,
      dateSpent,
      categoryId,
      budgetId,
    };

    const res = await onConfirm(payload);
    if (!res.success && res.error) {
      setLocalError(res.error);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Review Expense</Text>

      {localError && (
        <View style={styles.errorBanner}>
          <AlertCircle size={16} color="#fb7185" style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{localError}</Text>
        </View>
      )}

      {/* Amount input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Amount (PHP)</Text>
        <View style={styles.amountInputRow}>
          <Text style={styles.currencySymbol}>₱</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#64748b"
          />
        </View>
      </View>

      {/* Description input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textInput}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Starbucks iced coffee"
          placeholderTextColor="#64748b"
        />
      </View>

      {/* Category selector */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category</Text>
        <TouchableOpacity
          style={styles.pickerTrigger}
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
        >
          <Tag size={16} color="#94a3b8" style={{ marginRight: 8 }} />
          <Text style={styles.pickerTriggerText}>
            {selectedCategory ? selectedCategory.name : 'Select Category (Optional)'}
          </Text>
        </TouchableOpacity>
        {showCategoryPicker && (
          <View style={styles.dropdown}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setCategoryId(null);
                setShowCategoryPicker(false);
              }}
            >
              <Text style={[styles.dropdownItemText, !categoryId && styles.activeItemText]}>
                None
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setCategoryId(cat.id);
                  setShowCategoryPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    categoryId === cat.id && styles.activeItemText,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Budget selector */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Deduct From Budget</Text>
        <TouchableOpacity
          style={styles.pickerTrigger}
          onPress={() => setShowBudgetPicker(!showBudgetPicker)}
        >
          <PieChart size={16} color="#94a3b8" style={{ marginRight: 8 }} />
          <Text style={styles.pickerTriggerText}>
            {selectedBudget
              ? `${selectedBudget.name} (₱${Number(selectedBudget.current_amount).toLocaleString()} left)`
              : 'No Budget'}
          </Text>
        </TouchableOpacity>
        {showBudgetPicker && (
          <View style={styles.dropdown}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setBudgetId(null);
                setShowBudgetPicker(false);
              }}
            >
              <Text style={[styles.dropdownItemText, !budgetId && styles.activeItemText]}>
                No Budget (Do not deduct)
              </Text>
            </TouchableOpacity>
            {budgets.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setBudgetId(b.id);
                  setShowBudgetPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    budgetId === b.id && styles.activeItemText,
                  ]}
                >
                  {b.name} (₱{Number(b.current_amount).toLocaleString()} left)
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Spending type & Date Row */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                spendingType === 'needs' && styles.typeButtonActiveNeeds,
              ]}
              onPress={() => setSpendingType('needs')}
            >
              <Text style={styles.typeButtonText}>Need</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                spendingType === 'wants' && styles.typeButtonActiveWants,
              ]}
              onPress={() => setSpendingType('wants')}
            >
              <Text style={styles.typeButtonText}>Want</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Date</Text>
          <View style={styles.dateDisplay}>
            <Calendar size={14} color="#94a3b8" style={{ marginRight: 6 }} />
            <Text style={styles.dateText}>{dateSpent}</Text>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.discardButton}
          onPress={onDiscard}
          disabled={isLoading}
        >
          <X size={18} color="#94a3b8" style={{ marginRight: 6 }} />
          <Text style={styles.discardButtonText}>Discard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmButton, !isValid && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!isValid || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Check size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.confirmButtonText}>Confirm & Log</Text>
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
    borderRadius: 20,
    padding: 20,
    marginVertical: 12,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: '#f43f5e',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#fb7185',
    fontSize: 13,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  currencySymbol: {
    color: '#38bdf8',
    fontSize: 22,
    fontWeight: '700',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#020617',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    color: '#ffffff',
    fontSize: 15,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  pickerTriggerText: {
    color: '#ffffff',
    fontSize: 14,
  },
  dropdown: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 6,
    maxHeight: 180,
    overflow: 'hidden',
  },
  dropdownItem: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
  },
  dropdownItemText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  activeItemText: {
    color: '#38bdf8',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderRadius: 10,
    padding: 3,
    height: 44,
  },
  typeButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  typeButtonActiveNeeds: {
    backgroundColor: '#0284c7',
  },
  typeButtonActiveWants: {
    backgroundColor: '#8b5cf6',
  },
  typeButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
  },
  dateText: {
    color: '#ffffff',
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  discardButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
  },
  discardButtonText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    minHeight: 48,
    flex: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
