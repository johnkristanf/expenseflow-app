CREATE OR REPLACE FUNCTION public.record_expense(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_amount NUMERIC(10, 2);
    v_description TEXT;
    v_spending_type VARCHAR(255);
    v_date_spent DATE;
    v_category_id BIGINT;
    v_budget_id BIGINT;
    v_current_budget_amount NUMERIC(15, 2);
    v_new_expense RECORD;
BEGIN
    -- 1. Identify user & enforce RLS check
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        -- Allow payload fallback only when auth.uid() is not active (e.g. testing)
        IF payload ? 'userId' THEN
            v_user_id := (payload->>'userId')::UUID;
        ELSE
            RAISE EXCEPTION 'Unauthorized: User is not authenticated';
        END IF;
    END IF;

    -- If payload explicitly provides a userId, verify it matches auth.uid()
    IF payload ? 'userId' AND auth.uid() IS NOT NULL AND (payload->>'userId')::UUID <> auth.uid() THEN
        RAISE EXCEPTION 'Forbidden: Mismatched user_id';
    END IF;

    -- 2. Extract payload fields
    v_amount := (payload->>'amount')::NUMERIC;
    IF v_amount IS NULL OR v_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid amount: must be greater than zero';
    END IF;

    v_description := payload->>'description';
    v_spending_type := COALESCE(payload->>'spendingType', payload->>'spending_type', 'needs');
    v_date_spent := COALESCE((payload->>'dateSpent')::DATE, (payload->>'date_spent')::DATE, CURRENT_DATE);
    v_category_id := (payload->>'categoryId')::BIGINT;
    IF v_category_id IS NULL AND payload ? 'category_id' THEN
        v_category_id := (payload->>'category_id')::BIGINT;
    END IF;

    v_budget_id := (payload->>'budgetId')::BIGINT;
    IF v_budget_id IS NULL AND payload ? 'budget_id' THEN
        v_budget_id := (payload->>'budget_id')::BIGINT;
    END IF;

    -- Validate category ownership if category_id is provided
    IF v_category_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = v_category_id AND user_id = v_user_id) THEN
            RAISE EXCEPTION 'Category not found or does not belong to user';
        END IF;
    END IF;

    -- 3. Lock & Validate budget if provided
    IF v_budget_id IS NOT NULL THEN
        SELECT current_amount INTO v_current_budget_amount
        FROM public.budgets
        WHERE id = v_budget_id AND user_id = v_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Budget not found or does not belong to user';
        END IF;

        IF v_current_budget_amount < v_amount THEN
            RAISE EXCEPTION 'Insufficient budget balance. Available: %, Required: %', v_current_budget_amount, v_amount;
        END IF;

        -- Deduct from budget
        UPDATE public.budgets
        SET current_amount = current_amount - v_amount,
            updated_at = NOW()
        WHERE id = v_budget_id AND user_id = v_user_id;
    END IF;

    -- 4. Insert expense
    INSERT INTO public.expenses (
        description,
        amount,
        spending_type,
        date_spent,
        category_id,
        budget_id,
        user_id,
        created_at,
        updated_at
    ) VALUES (
        v_description,
        v_amount,
        v_spending_type,
        v_date_spent,
        v_category_id,
        v_budget_id,
        v_user_id,
        NOW(),
        NOW()
    )
    RETURNING id, description, amount, spending_type, date_spent, category_id, budget_id, user_id, created_at, updated_at
    INTO v_new_expense;

    RETURN to_jsonb(v_new_expense);
END;
$$;
