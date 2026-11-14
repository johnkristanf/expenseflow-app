import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Mic } from 'lucide-react-native';

interface CenterMicButtonProps {
  isRecording: boolean;
  isProcessing?: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function CenterMicButton({
  isRecording,
  isProcessing,
  onStartRecording,
  onStopRecording,
}: CenterMicButtonProps) {
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [opacityAnim] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (isRecording) {
      loop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.35,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 0.1,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.5,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      loop.start();
    } else {
      pulseAnim.setValue(1);
      opacityAnim.setValue(0.4);
    }

    return () => {
      if (loop) loop.stop();
    };
  }, [isRecording, pulseAnim, opacityAnim]);

  const handlePress = () => {
    if (isProcessing) return;
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <View style={styles.container}>
      {isRecording && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: opacityAnim,
            },
          ]}
        />
      )}

      <TouchableOpacity
        style={[
          styles.button,
          isRecording && styles.buttonRecording,
          isProcessing && styles.buttonProcessing,
        ]}
        activeOpacity={0.85}
        onPressIn={() => {
          if (!isProcessing && !isRecording) {
            onStartRecording();
          }
        }}
        onPressOut={() => {
          if (isRecording) {
            onStopRecording();
          }
        }}
        onPress={handlePress}
        disabled={isProcessing}
        accessibilityRole="button"
        accessibilityLabel={isRecording ? 'Stop recording voice' : 'Record voice expense'}
      >
        <View style={[styles.innerCircle, isRecording && styles.innerCircleRecording]}>
          {isProcessing ? (
            <ActivityIndicator size="small" color="#22d3ee" />
          ) : (
            <Mic size={28} color="#ffffff" />
          )}
        </View>
      </TouchableOpacity>

      <Text style={styles.label}>
        {isRecording ? 'Listening... release to send' : isProcessing ? 'Processing speech...' : 'Hold or tap to speak'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    top: -6,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22d3ee',
  },
  button: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#0f172a',
    borderColor: '#22d3ee',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonRecording: {
    borderColor: '#f43f5e',
    shadowColor: '#f43f5e',
    backgroundColor: '#1e1b4b',
  },
  buttonProcessing: {
    borderColor: '#6366f1',
    opacity: 0.9,
  },
  innerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircleRecording: {
    backgroundColor: '#e11d48',
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
});
