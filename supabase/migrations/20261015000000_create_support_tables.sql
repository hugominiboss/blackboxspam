-- ============================================================================
-- Setor de Suporte — nível intermediário
-- Tabelas: support_tickets + support_messages.
-- Autenticação por License Key (cookie httpOnly); escrita via service_role
-- nas rotas /api/support. Campos ai_* já previstos para a futura Onda IA.
-- Idempotente: seguro rodar novamente.
-- ============================================================================

-- Tickets --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key TEXT NOT NULL REFERENCES public.licenses(key) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('duvida', 'tecnico', 'financeiro', 'proxy-scraper', 'sugestao')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'aguardando-suporte', 'aguardando-cliente', 'resolvido', 'fechado')),
    subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 5 AND 140),
    sla_due_at TIMESTAMP WITH TIME ZONE,
    -- Contexto do cliente no momento da abertura (debug sem perguntar a key).
    context_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Avaliação ao fechar (1..5 + comentário opcional).
    rating SMALLINT CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
    rating_comment TEXT,
    rated_at TIMESTAMP WITH TIME ZONE,
    -- Reserva para a futura triagem com IA (Onda avançada).
    ai_summary TEXT,
    ai_suggested_reply TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS support_tickets_license_idx ON public.support_tickets (license_key);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS support_tickets_priority_idx ON public.support_tickets (priority);
CREATE INDEX IF NOT EXISTS support_tickets_sla_idx ON public.support_tickets (sla_due_at);

-- Mensagens ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('cliente', 'suporte')),
    -- 'nota-interna' é visível apenas no painel admin (nunca vaza ao cliente).
    kind TEXT NOT NULL DEFAULT 'publica' CHECK (kind IN ('publica', 'nota-interna')),
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS support_messages_ticket_idx ON public.support_messages (ticket_id);

-- RLS ------------------------------------------------------------------------
-- Escrita: apenas service_role (rotas /api/support). Sem policies de escrita,
-- o RLS bloqueia anon/authenticated e o service_role (que ignora RLS) opera.
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Leitura: permitida via anon key SOMENTE quando a license_key dona existe
-- e está ativa. A filtragem "qual key" é feita na query da aplicação.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'support_tickets'
          AND policyname = 'Public read for valid license'
    ) THEN
        CREATE POLICY "Public read for valid license"
          ON public.support_tickets FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM public.licenses l
              WHERE l.key = support_tickets.license_key
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
          AND tablename = 'support_messages'
          AND policyname = 'Public read for valid license'
    ) THEN
        CREATE POLICY "Public read for valid license"
          ON public.support_messages FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM public.support_tickets t
              JOIN public.licenses l ON l.key = t.license_key
              WHERE t.id = support_messages.ticket_id
                AND l.status = true
            )
          );
    END IF;
END $$;

-- updated_at automático nos tickets ------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'support_tickets_set_updated_at'
    ) THEN
        CREATE OR REPLACE FUNCTION public.support_tickets_touch()
        RETURNS TRIGGER AS $fn$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $fn$ LANGUAGE plpgsql;

        CREATE TRIGGER support_tickets_set_updated_at
          BEFORE UPDATE ON public.support_tickets
          FOR EACH ROW EXECUTE FUNCTION public.support_tickets_touch();
    END IF;
END $$;
