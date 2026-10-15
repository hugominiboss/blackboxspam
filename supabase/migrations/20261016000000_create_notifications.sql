-- ============================================================================
-- Sistema de Notificações — sino in-app + Telegram opcional (addon)
-- Tabelas: notifications + telegram_link_tokens.
-- Colunas novas em licenses: telegram_chat_id, notify_telegram, notify_prefs.
-- Idempotente: seguro rodar novamente.
-- ============================================================================

-- Notificações in-app ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key TEXT NOT NULL REFERENCES public.licenses(key) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
      'ticket_resposta', 'ticket_fechado',
      'creditos_topup', 'creditos_insuficientes',
      'unlock', 'level_up',
      'proxy_criada', 'proxy_expirando', 'proxy_expirada',
      'anuncio'
    )),
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
    link TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMP WITH TIME ZONE,
    telegram_sent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS notifications_license_idx ON public.notifications (license_key);
CREATE INDEX IF NOT EXISTS notifications_license_unread_idx ON public.notifications (license_key, created_at) WHERE read_at IS NULL;

-- Tokens de vínculo Telegram (cliente vincula sozinho via /start TOKEN) -------
CREATE TABLE IF NOT EXISTS public.telegram_link_tokens (
    token TEXT PRIMARY KEY,
    license_key TEXT NOT NULL REFERENCES public.licenses(key) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS telegram_link_tokens_license_idx ON public.telegram_link_tokens (license_key);

-- Colunas novas em licenses ----------------------------------------------------
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS notify_telegram BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS notify_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;

-- RLS --------------------------------------------------------------------------
-- Escrita: apenas service_role (helpers do servidor). Sem policies de escrita,
-- anon/authenticated são bloqueados e o service_role opera normalmente.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_link_tokens ENABLE ROW LEVEL SECURITY;

-- Leitura: permitida via anon key SOMENTE quando a license_key dona existe
-- e está ativa. A filtragem "qual key" é feita na query da aplicação.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'notifications'
          AND policyname = 'Public read for valid license'
    ) THEN
        CREATE POLICY "Public read for valid license"
          ON public.notifications FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM public.licenses l
              WHERE l.key = notifications.license_key
                AND l.status = true
            )
          );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'telegram_link_tokens'
          AND policyname = 'Public read for valid license'
    ) THEN
        CREATE POLICY "Public read for valid license"
          ON public.telegram_link_tokens FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM public.licenses l
              WHERE l.key = telegram_link_tokens.license_key
                AND l.status = true
            )
          );
    END IF;
END $$;
