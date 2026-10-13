-- Licenças de produto (ex.: Proxy Scraper). FICAM SEPARADAS da tabela
-- `licenses` (que é a chave de LOGIN do painel). São compradas com créditos
-- e ativadas por dispositivo (HWID). Idempotente: seguro rodar novamente.
CREATE TABLE IF NOT EXISTS public.product_licenses (
    key TEXT PRIMARY KEY,
    product_slug TEXT DEFAULT 'proxy-scraper' NOT NULL,
    owner_key TEXT NOT NULL,
    plan TEXT NOT NULL CHECK (plan IN ('7d', '15d', '30d')),
    status BOOLEAN DEFAULT TRUE NOT NULL,
    hwid TEXT,
    resets INTEGER DEFAULT 0 NOT NULL,
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Garante colunas caso a tabela já exista com outro schema
ALTER TABLE public.product_licenses ADD COLUMN IF NOT EXISTS owner_key TEXT;
ALTER TABLE public.product_licenses ADD COLUMN IF NOT EXISTS plan TEXT;
ALTER TABLE public.product_licenses ADD COLUMN IF NOT EXISTS status BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE public.product_licenses ADD COLUMN IF NOT EXISTS hwid TEXT;
ALTER TABLE public.product_licenses ADD COLUMN IF NOT EXISTS resets INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.product_licenses ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.product_licenses ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS product_licenses_owner_idx ON public.product_licenses (owner_key);
CREATE INDEX IF NOT EXISTS product_licenses_slug_idx ON public.product_licenses (product_slug);

-- RLS: escrita apenas via service_role (rotas /api/tools/*). Leitura pública
-- necessária para validar a key no endpoint público usado pelo app Python.
ALTER TABLE public.product_licenses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'product_licenses'
          AND policyname = 'Public read for product validation'
    ) THEN
        CREATE POLICY "Public read for product validation"
          ON public.product_licenses FOR SELECT
          USING (true);
    END IF;
END $$;
