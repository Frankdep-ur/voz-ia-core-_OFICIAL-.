ALTER TABLE public.campanhas REPLICA IDENTITY FULL;
ALTER TABLE public.campanha_contatos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campanhas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campanha_contatos;