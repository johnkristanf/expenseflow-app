import OpenAI from "openai";
import { loadPrompt, renderPrompt } from "./prompt-loader.ts";
import type {
  AssistantReasoningResult,
  ExpenseDraft,
  UserFinancialContext,
} from "./types.ts";

export const ASSISTANT_TOOLS: OpenAI.Responses.Tool[] = [
  {
    type: "function",
    name: "record_expense",
    description: "Propose the recorded expense when required fields (amount, description) are identified.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Expense amount" },
        description: { type: "string", description: "Clean merchant or item description" },
        spendingType: {
          type: "string",
          enum: ["needs", "wants"],
          description: "Whether this expense is a need or want",
        },
        dateSpent: { type: "string", description: "YYYY-MM-DD format" },
        categoryId: { type: "number", description: "Matched category ID from user's categories list" },
        budgetId: { type: "number", description: "Matched budget ID from user's budgets list (optional/nullable)" },
      },
      required: ["amount", "description", "spendingType", "dateSpent"],
    },
  },
  {
    type: "function",
    name: "ask_clarification",
    description: "Ask a short question when amount, description, or category/budget is missing or ambiguous.",
    strict: false,
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
];

async function buildSystemPrompt(userContext: UserFinancialContext, activeDraft: ExpenseDraft): Promise<string> {
  const template = await loadPrompt("expense-assistant.md");
  const todayStr = new Date().toISOString().split("T")[0];

  return renderPrompt(template, {
    currentDate: todayStr,
    categories: JSON.stringify(userContext.categories, null, 2),
    budgets: JSON.stringify(userContext.budgets, null, 2),
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
  });

  // Extract function tool call from Responses API output items
  const functionCall = response.output?.find(
    (item: any) => item.type === "function_call"
  ) as { name: string; arguments: string } | undefined;

  if (functionCall) {
    const action = functionCall.name as "record_expense" | "ask_clarification";
    let payload = JSON.parse(functionCall.arguments || "{}");
    let spokenText = "";

    if (action === "record_expense") {
      payload = { ...activeDraft, ...payload };
      const budgetName = userContext.budgets.find((b) => b.id === payload.budgetId)?.name;
      spokenText = `Recorded ₱${payload.amount} for ${payload.description}${budgetName ? ` under ${budgetName}` : ""}.`;
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
