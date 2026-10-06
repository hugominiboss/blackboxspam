-- Políticas RLS de user_credits (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'user_credits'
          AND policyname = 'Users can view their own credits.'
    ) THEN
        CREATE POLICY "Users can view their own credits." ON public.user_credits FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'user_credits'
          AND policyname = 'Users can insert their own credits.'
    ) THEN
        CREATE POLICY "Users can insert their own credits." ON public.user_credits FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'user_credits'
          AND policyname = 'Users can update their own credits.'
    ) THEN
        CREATE POLICY "Users can update their own credits." ON public.user_credits FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;
