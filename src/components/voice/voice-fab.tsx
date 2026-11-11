import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Mic } from 'lucide-react-native';
import { VoiceRecordSheet } from './voice-record-sheet';

interface VoiceFabProps {
  style?: any;
}

export function VoiceFab({ style }: VoiceFabProps) {
  const [sheetVisible, setSheetVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, style]}
        activeOpacity={0.8}
        onPress={() => setSheetVisible(true)}
      >
        <View style={styles.innerGlow}>
          <Mic size={26} color="#ffffff" />
        </View>
      </TouchableOpacity>

      <VoiceRecordSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0f172a',
    borderColor: '#22d3ee',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 99,
  },
  innerGlow: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
