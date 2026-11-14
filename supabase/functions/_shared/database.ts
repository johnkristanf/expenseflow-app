import type { SupabaseClient } from "@supabase/supabase-js";
import type { AffinityMap, Budget, Category, RecentExpense, UserFinancialContext } from "./types.ts";

/**
 * Fetches user-scoped categories, budgets, and historical merchant preferences.
 */
export async function fetchUserFinancialContext(supabase: SupabaseClient): Promise<UserFinancialContext> {
  const [categoriesRes, budgetsRes, recentExpensesRes] = await Promise.all([
    supabase.from("categories").select("id, name, notes").order("name"),
    supabase.from("budgets").select("id, name, current_amount, total_amount").order("name"),
    supabase.from("expenses").select("id, description, amount, date_spent, category_id, budget_id").order("created_at", { ascending: false }).limit(20),
  ]);

  const categories: Category[] = categoriesRes.data || [];
  const budgets: Budget[] = budgetsRes.data || [];
  const recentExpenses: RecentExpense[] = recentExpensesRes.data || [];

  // Build merchant affinity lookup
  const affinityMap: AffinityMap = {};
  for (const exp of recentExpenses) {
    if (exp.description) {
      const key = exp.description.toLowerCase().trim();
      if (!affinityMap[key]) {
        affinityMap[key] = { categoryId: exp.category_id, budgetId: exp.budget_id };
      }
    }
  }

  return {
    categories,
    budgets,
    recentExpenses,
    affinityMap,
  };
}
