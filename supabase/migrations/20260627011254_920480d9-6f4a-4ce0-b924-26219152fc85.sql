
-- Enums
CREATE TYPE public.app_status_contato AS ENUM ('novo','ligado','convertido','nao_atender');
CREATE TYPE public.app_status_campanha AS ENUM ('rascunho','agendada','em_andamento','pausada','concluida');
CREATE TYPE public.app_status_campanha_contato AS ENUM ('na_fila','ligando','atendida','sem_resposta','concluida','falhou');
CREATE TYPE public.app_sentimento AS ENUM ('positivo','neutro','negativo');

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  empresa text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (id = auth.uid());

-- contatos
CREATE TABLE public.contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  telefone text,
  email text,
  tags text,
  observacoes text,
  status public.app_status_contato NOT NULL DEFAULT 'novo',
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contatos TO authenticated;
GRANT ALL ON public.contatos TO service_role;
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contatos_all_own" ON public.contatos FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- agentes
CREATE TABLE public.agentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  persona_prompt text,
  voz_id text,
  idioma text NOT NULL DEFAULT 'pt-BR',
  velocidade_fala numeric NOT NULL DEFAULT 1,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentes TO authenticated;
GRANT ALL ON public.agentes TO service_role;
ALTER TABLE public.agentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agentes_all_own" ON public.agentes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- campanhas
CREATE TABLE public.campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  agente_id uuid REFERENCES public.agentes(id) ON DELETE SET NULL,
  status public.app_status_campanha NOT NULL DEFAULT 'rascunho',
  agendada_para timestamptz,
  max_tentativas integer NOT NULL DEFAULT 2,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanhas TO authenticated;
GRANT ALL ON public.campanhas TO service_role;
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campanhas_all_own" ON public.campanhas FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- campanha_contatos
CREATE TABLE public.campanha_contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id uuid NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  contato_id uuid NOT NULL REFERENCES public.contatos(id) ON DELETE CASCADE,
  status public.app_status_campanha_contato NOT NULL DEFAULT 'na_fila',
  tentativas integer NOT NULL DEFAULT 0,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanha_contatos TO authenticated;
GRANT ALL ON public.campanha_contatos TO service_role;
ALTER TABLE public.campanha_contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campanha_contatos_all_own" ON public.campanha_contatos FOR ALL
  USING (EXISTS (SELECT 1 FROM public.campanhas c WHERE c.id = campanha_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.campanhas c WHERE c.id = campanha_id AND c.user_id = auth.uid()));

-- ligacoes
CREATE TABLE public.ligacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campanha_id uuid REFERENCES public.campanhas(id) ON DELETE SET NULL,
  contato_id uuid REFERENCES public.contatos(id) ON DELETE SET NULL,
  status text,
  duracao_segundos integer,
  twilio_call_sid text,
  gravacao_url text,
  transcricao text,
  resultado text,
  sentimento public.app_sentimento,
  iniciada_em timestamptz,
  finalizada_em timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ligacoes TO authenticated;
GRANT ALL ON public.ligacoes TO service_role;
ALTER TABLE public.ligacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ligacoes_all_own" ON public.ligacoes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Trigger: cria profile automaticamente em novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'nome')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
