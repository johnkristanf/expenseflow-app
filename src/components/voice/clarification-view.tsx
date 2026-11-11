import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HelpCircle, Volume2 } from 'lucide-react-native';
import { ClarificationPayload } from '@/types/expense';

interface ClarificationViewProps {
  clarification: ClarificationPayload;
  onSelectOption: (option: string) => void;
  isLoading?: boolean;
}

export function ClarificationView({
  clarification,
  onSelectOption,
  isLoading,
}: ClarificationViewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <HelpCircle size={20} color="#38bdf8" />
        </View>
        <Text style={styles.headerLabel}>Clarification Needed</Text>
        <Volume2 size={16} color="#94a3b8" style={styles.audioIndicator} />
      </View>

      <Text style={styles.questionText}>{clarification.question}</Text>

      {clarification.suggestedOptions && clarification.suggestedOptions.length > 0 && (
        <View style={styles.optionsSection}>
          <Text style={styles.optionsHint}>Tap an option or hold mic to answer:</Text>
          <View style={styles.chipGrid}>
            {clarification.suggestedOptions.map((opt, index) => (
              <TouchableOpacity
                key={`${opt}-${index}`}
                style={styles.chip}
                activeOpacity={0.7}
                disabled={isLoading}
                onPress={() => onSelectOption(opt)}
              >
                <Text style={styles.chipText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerLabel: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  audioIndicator: {
    opacity: 0.8,
  },
  questionText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 24,
    marginBottom: 12,
  },
  optionsSection: {
    marginTop: 6,
  },
  optionsHint: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});
