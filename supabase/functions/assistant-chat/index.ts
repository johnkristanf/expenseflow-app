// @ts-nocheck — Deno Edge Function: runtime globals (Deno) provided by Deno runtime.
import { createClient } from "@supabase/supabase-js";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { fetchUserFinancialContext } from "../_shared/database.ts";
import { synthesizeSpeech, transcribeAudio } from "../_shared/deepgram.ts";
import { generateAssistantResponse } from "../_shared/openai.ts";
import type { ExpenseDraft } from "../_shared/types.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY") || "";
    const deepgramApiKey = Deno.env.get("DEEPGRAM_API_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return errorResponse("Unauthorized: Please sign in to your account first", 401);
    }

    // 2. Parse request payload
    const body = await req.json().catch(() => ({}));
    let transcript = body.transcript?.trim() || "";
    const activeDraft: ExpenseDraft = body.activeDraft || {};
    const audioBase64 = body.audioBase64;

    // 3. Audio transcription via Deepgram STT (if raw audio was sent)
    if (!transcript && audioBase64) {
      transcript = await transcribeAudio(audioBase64, deepgramApiKey);
    }

    if (!transcript) {
      return errorResponse("No transcript or audio provided", 400);
    }

    // 4. Fetch user categories, budgets, and recent merchant affinity
    const userContext = await fetchUserFinancialContext(supabase);

    // 5. OpenAI slot-filling reasoning and entity extraction
    const { action, payload, spokenText } = await generateAssistantResponse({
      transcript,
      activeDraft,
      userContext,
      apiKey: openAiApiKey,
    });

    // 6. Synthesize spoken response via Deepgram Aura TTS
    const ttsAudio = await synthesizeSpeech(spokenText, deepgramApiKey);

    // 7. Return structured assistant response
    return jsonResponse({
      action,
      payload,
      transcript,
      ttsAudio,
      spokenText,
    });
  } catch (err: any) {
    console.error("assistant-chat execution error:", err);
    return errorResponse(err?.message || "Internal server error", 500);
  }
});
