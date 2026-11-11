import { useState, useCallback } from 'react';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone permission is required to record voice expenses.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to start recording');
      setIsRecording(false);
    }
  }, [recorder]);

  const stopRecording = useCallback(async (): Promise<{ uri: string | null; base64: string | null }> => {
    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
      const uri = recorder.uri;
      setIsRecording(false);

      if (!uri) return { uri: null, base64: null };

      // Read audio as base64 for Edge Function transport
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return { uri, base64 };
    } catch (err: any) {
      setError(err?.message || 'Failed to stop recording');
      setIsRecording(false);
      return { uri: null, base64: null };
    }
  }, [recorder]);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
  };
}
