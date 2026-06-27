ALTER TABLE public.ligacoes ADD COLUMN IF NOT EXISTS nota integer;
ALTER TABLE public.ligacoes DROP CONSTRAINT IF EXISTS ligacoes_nota_range;
ALTER TABLE public.ligacoes ADD CONSTRAINT ligacoes_nota_range CHECK (nota IS NULL OR (nota BETWEEN 1 AND 10));