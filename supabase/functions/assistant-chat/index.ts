import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ExpenseDraft {
  amount?: number;
  description?: string;
  categoryId?: number;
  budgetId?: number;
  spendingType?: "needs" | "wants";
  dateSpent?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY") || "";
    const deepgramApiKey = Deno.env.get("DEEPGRAM_API_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    let transcript = body.transcript?.trim() || "";
    const activeDraft: ExpenseDraft = body.activeDraft || {};
    const audioBase64 = body.audioBase64;

    // 1. Transcribe audio via Deepgram if raw audio was sent
    if (!transcript && audioBase64 && deepgramApiKey) {
      const audioBytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
      const sttResponse = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true", {
        method: "POST",
        headers: {
          Authorization: `Token ${deepgramApiKey}`,
          "Content-Type": "audio/wav",
        },
        body: audioBytes,
      });

      if (sttResponse.ok) {
        const sttData = await sttResponse.json();
        transcript = sttData?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || "";
      }
    }

    if (!transcript) {
      return new Response(JSON.stringify({ error: "No transcript or audio provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Query user context: categories, budgets, recent expenses
    const [categoriesRes, budgetsRes, recentExpensesRes] = await Promise.all([
      supabase.from("categories").select("id, name, notes").order("name"),
      supabase.from("budgets").select("id, name, current_amount, total_amount").order("name"),
      supabase.from("expenses").select("description, category_id, budget_id").order("created_at", { ascending: false }).limit(20),
    ]);

    const categories = categoriesRes.data || [];
    const budgets = budgetsRes.data || [];
    const recentExpenses = recentExpensesRes.data || [];

    // Derive recent merchant affinity dictionary
    const affinityMap: Record<string, { categoryId?: number; budgetId?: number }> = {};
    for (const exp of recentExpenses) {
      if (exp.description) {
        const key = exp.description.toLowerCase().trim();
        if (!affinityMap[key]) {
          affinityMap[key] = { categoryId: exp.category_id, budgetId: exp.budget_id };
        }
      }
    }

    // 3. OpenAI Chat Completion with Tool Calling
    const tools = [
      {
        type: "function",
        function: {
          name: "record_expense",
          description: "Propose the recorded expense when required fields (amount, description) are identified.",
          parameters: {
            type: "object",
            properties: {
              amount: { type: "number", description: "Expense amount" },
              description: { type: "string", description: "Clean merchant or item description" },
              spendingType: { type: "string", enum: ["needs", "wants"], description: "Whether this expense is a need or want" },
              dateSpent: { type: "string", description: "YYYY-MM-DD format" },
              categoryId: { type: "number", description: "Matched category ID from user's categories list" },
              budgetId: { type: "number", description: "Matched budget ID from user's budgets list (optional/nullable)" },
            },
            required: ["amount", "description", "spendingType", "dateSpent"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "ask_clarification",
          description: "Ask a short question when amount, description, or category/budget is missing or ambiguous.",
          parameters: {
            type: "object",
            properties: {
              question: { type: "string", description: "Short conversational question to speak to user" },
              missingEntity: { type: "string", enum: ["amount", "description", "category", "budget"] },
              suggestedOptions: {
                type: "array",
                items: { type: "string" },
                description: "Optional quick-choice options (e.g. category names)",
              },
            },
            required: ["question", "missingEntity"],
          },
        },
      },
    ];

    const todayStr = new Date().toISOString().split("T")[0];

    const systemPrompt = `You are ExpenseFlow's voice AI assistant for expense logging.
Current date: ${todayStr}

Available user categories:
${JSON.stringify(categories, null, 2)}

Available user budgets:
${JSON.stringify(budgets, null, 2)}

Recent merchant preferences:
${JSON.stringify(affinityMap, null, 2)}

Active draft state (from prior conversational turns):
${JSON.stringify(activeDraft, null, 2)}

RULES:
1. You are completing an active draft. Do NOT treat the user's input as an isolated new entry if an active draft exists. Merge new information into the draft.
2. If the user speech + active draft provides amount and description:
   - Resolve categoryId: match explicit name > recent affinity > semantic match from category name/notes.
   - Resolve budgetId: match explicit name > recent affinity > semantic match from budget name. If no clear budget, budgetId can be null.
   - Default spendingType to "needs" or "wants" based on description.
   - Call 'record_expense'.
3. If amount is missing or description is completely absent or category is highly ambiguous:
   - Call 'ask_clarification' with a short, friendly, spoken question and missingEntity.
   - Provide suggestedOptions when clarifying category.`;

    const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        tools,
        tool_choice: "auto",
        temperature: 0.1,
      }),
    });

    if (!openAiRes.ok) {
      const errText = await openAiRes.text();
      return new Response(JSON.stringify({ error: `OpenAI error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openAiData = await openAiRes.json();
    const toolCall = openAiData.choices?.[0]?.message?.tool_calls?.[0];

    let action = "record_expense";
    let payload: any = {};
    let spokenText = "";

    if (toolCall) {
      action = toolCall.function.name;
      payload = JSON.parse(toolCall.function.arguments || "{}");

      if (action === "record_expense") {
        // Merge with existing draft
        payload = { ...activeDraft, ...payload };
        const budgetName = budgets.find((b: any) => b.id === payload.budgetId)?.name;
        spokenText = `Recorded ₱${payload.amount} for ${payload.description}${budgetName ? ` under ${budgetName}` : ""}.`;
      } else if (action === "ask_clarification") {
        spokenText = payload.question || "Could you clarify that?";
      }
    } else {
      // Fallback if no tool called
      spokenText = openAiData.choices?.[0]?.message?.content || "Please say your expense.";
      action = "ask_clarification";
      payload = { question: spokenText, missingEntity: "description" };
    }

    // 4. Synthesize spoken feedback with Deepgram Aura TTS
    let ttsAudioBase64 = "";
    if (deepgramApiKey && spokenText) {
      try {
        const ttsRes = await fetch("https://api.deepgram.com/v1/speak?model=aura-asteria-en", {
          method: "POST",
          headers: {
            Authorization: `Token ${deepgramApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: spokenText }),
        });

        if (ttsRes.ok) {
          const buffer = await ttsRes.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          ttsAudioBase64 = btoa(binary);
        }
      } catch (_e) {
        // TTS failure is non-fatal
      }
    }

    return new Response(
      JSON.stringify({
        action,
        payload,
        transcript,
        ttsAudio: ttsAudioBase64,
        spokenText,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
