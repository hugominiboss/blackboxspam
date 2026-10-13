-- ============================================================================
-- Tabela de desbloqueios (unlocks)
-- Move a persistência de "aulas e ferramentas desbloqueadas" do localStorage
-- do navegador para o SERVIDOR. Cada linha registra que uma License Key
-- desbloqueou um conteúdo (aula ou ferramenta).
--
-- Idempotente: seguro rodar novamente (CREATE IF NOT EXISTS + DO $$).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Referencia a chave de login ATIVA do sistema (tabela `licenses`, PK = key).
    -- A tabela `licencas` (legada, em português) NÃO é usada pelo app.
    license_key TEXT NOT NULL REFERENCES public.licenses(key) ON DELETE CASCADE,
    -- ID da aula (aulas.id) ou slug da ferramenta.
    content_id TEXT NOT NULL,
    -- Tipo do conteúdo desbloqueado.
    content_type TEXT NOT NULL CHECK (content_type IN ('aula', 'ferramenta')),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Unique composto: um mesmo conteúdo não pode ser desbloqueado 2x pela mesma key.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unlocks_license_content_unique'
          AND conrelid = 'public.unlocks'::regclass
    ) THEN
        ALTER TABLE public.unlocks
            ADD CONSTRAINT unlocks_license_content_unique UNIQUE (license_key, content_id);
    END IF;
END $$;

-- Índice para buscar os unlocks de uma license_key.
CREATE INDEX IF NOT EXISTS unlocks_license_key_idx ON public.unlocks (license_key);

-- RLS ----------------------------------------------------------------------
-- Escrita (INSERT/UPDATE/DELETE): apenas service_role. Como NÃO criamos
-- policies de escrita, o RLS bloqueia anon/authenticated e o service_role
-- (que ignora RLS) continua podendo inserir — exatamente o desejado.
ALTER TABLE public.unlocks ENABLE ROW LEVEL SECURITY;

-- Leitura (SELECT): permitida via API/REST (anon key) SOMENTE para unlocks
-- cuja license_key exista e esteja ativa em `licenses`. A filtragem por
-- "qual key" é feita na query da aplicação (.eq('license_key', key)).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'unlocks'
          AND policyname = 'Public read for valid license'
    ) THEN
        CREATE POLICY "Public read for valid license"
          ON public.unlocks FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM public.licenses l
              WHERE l.key = unlocks.license_key
                AND l.status = true
            )
          );
    END IF;
END $$;
