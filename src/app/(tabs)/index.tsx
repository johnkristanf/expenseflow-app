import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RotateCcw } from 'lucide-react-native';
import { useExpenseChat } from '@/hooks/use-expense-chat';
import { ChatMessageItem } from '@/components/voice/chat-message-item';
import { CenterMicButton } from '@/components/voice/center-mic-button';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const {
    messages,
    isRecording,
    isProcessing,
    startListening,
    stopListening,
    answerClarification,
    confirmExpense,
    confirmUpdate,
    confirmDelete,
    discardProposal,
    clearChat,
  } = useExpenseChat();

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* App Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Image
              source={require('@/assets/images/expenseflow-icon.png')}
              style={styles.headerLogo}
              contentFit="contain"
            />
            <Text style={styles.headerTitle}>ExpenseFlow</Text>
          </View>

          {messages.length > 1 && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={clearChat}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Reset conversation"
            >
              <RotateCcw size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Chat Message List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatMessageItem
              message={item}
              onSelectOption={answerClarification}
              onConfirmExpense={confirmExpense}
              onConfirmUpdate={confirmUpdate}
              onConfirmDelete={confirmDelete}
              onDiscardProposal={discardProposal}
              isProcessing={isProcessing}
            />
          )}
          style={styles.messageList}
          contentContainerStyle={[
            styles.messageListContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 110 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Center Bottom Microphone Bar */}
        <View
          style={[
            styles.micContainer,
            { bottom: Math.max(insets.bottom, 12) },
          ]}
          pointerEvents="box-none"
        >
          <CenterMicButton
            isRecording={isRecording}
            isProcessing={isProcessing}
            onStartRecording={startListening}
            onStopRecording={stopListening}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#020617',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  resetButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  micContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
