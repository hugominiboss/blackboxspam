-- Progressão de níveis por créditos GASTOS (acumulado).
-- Níveis: Bronze (0), Silver (200), Gold (600), Platinum (1500), Black (3000).
-- Idempotente: seguro rodar mesmo se as colunas já existirem.
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS total_spent INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Bronze' NOT NULL;

-- Backfill: quem já tem histórico desconhecido começa zerado (Bronze).
-- Não tocamos em credits (saldo atual) — total_spent é acumulador separado.
