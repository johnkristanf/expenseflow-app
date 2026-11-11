import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Mic, X, Sparkles, AlertTriangle } from 'lucide-react-native';
import { useVoiceSession } from '@/hooks/use-voice-session';
import { ClarificationView } from './clarification-view';
import { ExpenseConfirmationCard } from './expense-confirmation-card';

interface VoiceRecordSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function VoiceRecordSheet({ visible, onClose }: VoiceRecordSheetProps) {
  const session = useVoiceSession();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation when recording
  useEffect(() => {
    if (session.isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [session.isRecording, pulseAnim]);

  const handleClose = () => {
    session.resetSession();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Sparkles size={18} color="#22d3ee" style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>Voice Expense</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Error message */}
            {session.errorMessage && (
              <View style={styles.errorBox}>
                <AlertTriangle size={16} color="#fb7185" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{session.errorMessage}</Text>
              </View>
            )}

            {/* Transcript display */}
            {session.transcript ? (
              <View style={styles.transcriptBox}>
                <Text style={styles.transcriptLabel}>You said:</Text>
                <Text style={styles.transcriptText}>"{session.transcript}"</Text>
              </View>
            ) : null}

            {/* Active views depending on status */}
            {session.status === 'clarifying' && session.clarification && (
              <ClarificationView
                clarification={session.clarification}
                onSelectOption={session.answerClarification}
                isLoading={session.isProcessing}
              />
            )}

            {session.status === 'confirming' && (
              <ExpenseConfirmationCard
                initialDraft={session.draft}
                onConfirm={async (payload) => {
                  const res = await session.confirmExpense(payload);
                  if (res.success) {
                    onClose();
                  }
                  return res;
                }}
                onDiscard={handleClose}
                isLoading={session.isProcessing}
              />
            )}

            {/* Processing loader */}
            {session.status === 'processing' && (
              <View style={styles.processingBox}>
                <ActivityIndicator size="large" color="#22d3ee" />
                <Text style={styles.processingText}>Analyzing expense...</Text>
              </View>
            )}

            {/* Mic section (shown in idle, recording, or clarifying) */}
            {session.status !== 'confirming' && (
              <View style={styles.micSection}>
                <Animated.View
                  style={[
                    styles.micGlow,
                    { transform: [{ scale: pulseAnim }] },
                    session.isRecording && styles.micGlowActive,
                  ]}
                />
                <Pressable
                  style={[
                    styles.micButton,
                    session.isRecording && styles.micButtonActive,
                  ]}
                  onPressIn={session.startListening}
                  onPressOut={session.stopListening}
                >
                  <Mic
                    size={36}
                    color={session.isRecording ? '#ffffff' : '#22d3ee'}
                  />
                </Pressable>
                <Text style={styles.micHint}>
                  {session.isRecording
                    ? 'Listening... Release when done'
                    : session.status === 'clarifying'
                    ? 'Hold mic or tap an option above'
                    : 'Press and hold to speak'}
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#020617',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: '#f43f5e',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fb7185',
    fontSize: 14,
    flex: 1,
  },
  transcriptBox: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  transcriptLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  transcriptText: {
    color: '#e2e8f0',
    fontSize: 15,
    fontStyle: 'italic',
  },
  processingBox: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  processingText: {
    color: '#94a3b8',
    fontSize: 15,
    marginTop: 12,
  },
  micSection: {
    alignItems: 'center',
    paddingVertical: 28,
    justifyContent: 'center',
  },
  micGlow: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
  },
  micGlowActive: {
    backgroundColor: 'rgba(244, 63, 94, 0.25)',
  },
  micButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#0f172a',
    borderColor: '#22d3ee',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  micButtonActive: {
    backgroundColor: '#f43f5e',
    borderColor: '#f43f5e',
    shadowColor: '#f43f5e',
  },
  micHint: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 16,
    fontWeight: '500',
  },
});
