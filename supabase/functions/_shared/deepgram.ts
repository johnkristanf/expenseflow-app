// @ts-nocheck — Deno Edge Function: resolved via supabase/functions/deno.json import map.
// The standard TypeScript LS does not evaluate Deno import maps; ignore module errors here.
import { DeepgramClient } from "@deepgram/sdk";
import type { ListenV1Response } from "@deepgram/sdk";

/**
 * Configuration options for Speech-to-Text transcription.
 */
export interface DeepgramSTTOptions {
  model?: string;
  language?: string;
  smartFormat?: boolean;
}

/**
 * Configuration options for Text-to-Speech synthesis.
 */
export interface DeepgramTTSOptions {
  model?: string;
}

/**
 * Encodes a Uint8Array into a base64 string safely in fixed-size chunks
 * to avoid maximum call stack errors on large binary payloads in Deno.
 */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Transcribes audio bytes using Deepgram Nova-3 Speech-to-Text via the official JS SDK.
 * Uses `client.listen.v1.media.transcribeFile` per deepgram-js-speech-to-text skill.
 * Expects base64-encoded audio (m4a/aac/wav from mobile recording).
 */
export async function transcribeAudio(
  audioBase64: string,
  apiKey: string,
  options: DeepgramSTTOptions = {}
): Promise<string> {
  if (!audioBase64?.trim() || !apiKey?.trim()) return "";

  try {
    const deepgram = new DeepgramClient({ apiKey });
    const audioBytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));

    // HttpResponsePromise<MediaTranscribeResponse> resolves to data directly when awaited
    const response = await deepgram.listen.v1.media.transcribeFile(
      audioBytes,
      {
        model: options.model ?? "nova-3",
        language: options.language ?? "en",
        smart_format: options.smartFormat ?? true,
      }
    );

    // MediaTranscribeResponse = ListenV1Response | ListenV1AcceptedResponse
    // ListenV1Response has `.results`; ListenV1AcceptedResponse (async callback) only has `.request_id`
    if (!("results" in response)) {
      console.warn("Deepgram STT returned async accepted response (no immediate results).");
      return "";
    }

    const sync = response as ListenV1Response;
    return sync.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
  } catch (err) {
    console.error("Deepgram STT transcription failed:", err);
    return "";
  }
}

/**
 * Synthesizes spoken text into audio via Deepgram Aura-2 TTS using the official JS SDK.
 * Uses `client.speak.v1.audio.generate` per deepgram-js-text-to-speech skill.
 * Returns base64-encoded MP3 audio string, or empty string on failure.
 */
export async function synthesizeSpeech(
  text: string,
  apiKey: string,
  options: DeepgramTTSOptions = {}
): Promise<string> {
  const cleanText = text?.trim();
  // Deepgram rejects empty text payloads with HTTP 400
  if (!cleanText || !apiKey?.trim()) return "";

  try {
    const deepgram = new DeepgramClient({ apiKey });

    // HttpResponsePromise<BinaryResponse> resolves to BinaryResponse when awaited
    const response = await deepgram.speak.v1.audio.generate({
      text: cleanText,
      model: options.model ?? "aura-2-thalia-en",
    });

    // BinaryResponse.arrayBuffer() returns a Promise<ArrayBuffer>
    const buffer = await response.arrayBuffer();
    return toBase64(new Uint8Array(buffer));
  } catch (err) {
    console.warn("Deepgram TTS synthesis failed:", err);
    return "";
  }
}
