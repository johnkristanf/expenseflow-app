import { useCallback, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

export function useTTSPlayer() {
  const playerRef = useRef<AudioPlayer | null>(null);

  const stop = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.remove();
      } catch {
        // Ignore unloading errors
      } finally {
        playerRef.current = null;
      }
    }
  }, []);

  const play = useCallback(
    async (base64Audio: string) => {
      if (!base64Audio) return;

      try {
        stop();

        const tempFileUri = `${FileSystem.cacheDirectory}tts_feedback_${Date.now()}.mp3`;
        await FileSystem.writeAsStringAsync(tempFileUri, base64Audio, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await setAudioModeAsync({
          playsInSilentMode: true,
        });

        const player = createAudioPlayer({ uri: tempFileUri });
        player.play();
        playerRef.current = player;
      } catch (err) {
        console.warn('Failed to play TTS audio feedback:', err);
      }
    },
    [stop]
  );

  return {
    play,
    stop,
  };
}
