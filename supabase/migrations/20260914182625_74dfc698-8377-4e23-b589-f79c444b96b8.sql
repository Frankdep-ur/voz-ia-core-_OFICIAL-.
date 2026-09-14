ALTER TABLE public.agentes
  ADD COLUMN IF NOT EXISTS encerrar_automaticamente boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS frase_despedida text,
  ADD COLUMN IF NOT EXISTS silencio_para_encerrar_segundos integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS voz_estabilidade numeric NOT NULL DEFAULT 0.40,
  ADD COLUMN IF NOT EXISTS voz_similaridade numeric NOT NULL DEFAULT 0.80,
  ADD COLUMN IF NOT EXISTS voz_estilo numeric NOT NULL DEFAULT 0.45;