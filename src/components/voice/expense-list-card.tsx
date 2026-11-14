import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Receipt } from 'lucide-react-native';
import { ExpenseItem } from '@/types/expense';

interface ExpenseListCardProps {
  expenses: ExpenseItem[];
  totalAmount?: number;
}

export function ExpenseListCard({ expenses, totalAmount }: ExpenseListCardProps) {
  const displayTotal =
    totalAmount !== undefined
      ? totalAmount
      : expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Receipt size={18} color="#22d3ee" />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.cardTitle}>Transactions Overview</Text>
          <Text style={styles.cardSubtitle}>{expenses.length} transaction(s) found</Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₱{displayTotal.toFixed(2)}</Text>
        </View>
      </View>

      {expenses.length === 0 ? (
        <Text style={styles.emptyText}>No matching expenses found.</Text>
      ) : (
        <View style={styles.list}>
          {expenses.map((item, index) => (
            <View
              key={item.id ? String(item.id) : `exp-${index}`}
              style={[styles.row, index === expenses.length - 1 && styles.lastRow]}
            >
              <View style={styles.itemLeft}>
                <Text style={styles.itemDescription} numberOfLines={1}>
                  {item.description || 'Expense'}
                </Text>
                <Text style={styles.itemDate}>{item.date_spent}</Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemAmount}>₱{Number(item.amount).toFixed(2)}</Text>
                <Text
                  style={[
                    styles.spendingType,
                    item.spending_type === 'wants' ? styles.typeWants : styles.typeNeeds,
                  ]}
                >
                  {item.spending_type}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTextCol: {
    flex: 1,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
  },
  totalBadge: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10b981',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  totalLabel: {
    color: '#94a3b8',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  totalValue: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  itemLeft: {
    flex: 1,
    marginRight: 12,
  },
  itemDescription: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  itemDate: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  spendingType: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  typeNeeds: {
    color: '#38bdf8',
  },
  typeWants: {
    color: '#f43f5e',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
});
