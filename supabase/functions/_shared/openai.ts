import OpenAI from "openai";
import { ASSISTANT_TOOLS } from "./constants.ts";
import { loadPrompt, renderPrompt } from "./prompt-loader.ts";
import type {
  AssistantReasoningResult,
  ExpenseDraft,
  UserFinancialContext,
} from "./types.ts";

export { ASSISTANT_TOOLS };

async function buildSystemPrompt(userContext: UserFinancialContext, activeDraft: ExpenseDraft): Promise<string> {
  const template = await loadPrompt("expense-assistant.md");
  const todayStr = new Date().toISOString().split("T")[0];

  return renderPrompt(template, {
    currentDate: todayStr,
    categories: JSON.stringify(userContext.categories, null, 2),
    budgets: JSON.stringify(userContext.budgets, null, 2),
    recentExpenses: JSON.stringify(userContext.recentExpenses, null, 2),
    affinityMap: JSON.stringify(userContext.affinityMap, null, 2),
    activeDraft: JSON.stringify(activeDraft, null, 2),
  });
}

interface RunReasoningParams {
  transcript: string;
  activeDraft: ExpenseDraft;
  userContext: UserFinancialContext;
  apiKey: string;
}

export async function generateAssistantResponse({
  transcript,
  activeDraft,
  userContext,
  apiKey,
}: RunReasoningParams): Promise<AssistantReasoningResult> {
  const systemPrompt = await buildSystemPrompt(userContext, activeDraft);

  const openai = new OpenAI({ apiKey });

  const response = await openai.responses.create({
    model: "gpt-5-nano",
    instructions: systemPrompt,
    input: transcript,
    tools: ASSISTANT_TOOLS,
    tool_choice: "required",
  });

  // Extract function tool call from Responses API output items
  const functionCall = response.output?.find(
    (item: any) => item.type === "function_call"
  ) as { name: string; arguments: string } | undefined;

  if (functionCall) {
    const action = functionCall.name as AssistantReasoningResult["action"];
    let payload = JSON.parse(functionCall.arguments || "{}");
    let spokenText = "";

    if (action === "record_expense") {
      payload = { ...activeDraft, ...payload };
      const budgetName = userContext.budgets.find((b) => b.id === payload.budgetId)?.name;
      spokenText = `Recorded ₱${payload.amount} for ${payload.description}${budgetName ? ` under ${budgetName}` : ""}.`;
    } else if (action === "query_expenses") {
      spokenText = "Here are the expense records you requested:";
    } else if (action === "update_expense") {
      spokenText = `Please confirm updating this expense.`;
    } else if (action === "delete_expense") {
      spokenText = `Are you sure you want to delete this expense?`;
    } else {
      spokenText = payload.question || "Could you clarify that?";
    }

    return { action, payload, spokenText };
  }

  // Fallback when no function call is returned
  const spokenText = response.output_text || "Please say your expense.";
  return {
    action: "ask_clarification",
    payload: { question: spokenText, missingEntity: "description" },
    spokenText,
  };
}
