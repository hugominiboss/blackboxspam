-- Tabela de License Keys (idempotente: pode já ter sido criada manualmente)
CREATE TABLE IF NOT EXISTS public.licenses (
    key TEXT PRIMARY KEY,
    status BOOLEAN DEFAULT TRUE NOT NULL,
    role TEXT DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'admin')),
    credits INTEGER DEFAULT 0 NOT NULL,
    access_level INTEGER DEFAULT 1 NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Garante que colunas novas existam caso a tabela tenha sido criada antes com outro script
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS status BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' NOT NULL;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS access_level INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;

-- Índice para buscas por role
CREATE INDEX IF NOT EXISTS licenses_role_idx ON public.licenses (role);

-- RLS: habilitado; escrita acontece apenas via service_role (rotas /api/licenses)
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (necessária para validação da key no login e no middleware,
-- que usam a anon key).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'licenses'
          AND policyname = 'Public read for login validation'
    ) THEN
        CREATE POLICY "Public read for login validation"
          ON public.licenses FOR SELECT
          USING (true);
    END IF;
END $$;

