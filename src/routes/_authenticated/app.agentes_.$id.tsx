import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  FRASE_DESPEDIDA_PADRAO,
  IDIOMAS_OPCOES,
  MODELO_PERSONA_EXEMPLO,
  SAUDACAO_PLACEHOLDER,
  SILENCIO_PARA_ENCERRAR_PADRAO,
  VOZ_SUAVE_HUMANIZADA,
  VOZES_OPCOES,
  type IdiomaId,
  type VozId,
} from "@/lib/agentes";
import { Lightbulb, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/agentes_/$id")({
  head: () => ({ meta: [{ title: "Agente — VozIA" }] }),
  component: AgenteFormPage,
});

function AgenteFormPage() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editando = id !== "novo";

  const [nome, setNome] = useState("");
  const [saudacao, setSaudacao] = useState("");
  const [persona, setPersona] = useState("");
  const [voz, setVoz] = useState<VozId>("feminina_calorosa");
  const [vozIdElevenlabs, setVozIdElevenlabs] = useState("");
  const [idioma, setIdioma] = useState<IdiomaId>("pt-BR");
  const [velocidade, setVelocidade] = useState(1.0);
  const [encerrarAuto, setEncerrarAuto] = useState(true);
  const [fraseDespedida, setFraseDespedida] = useState("");
  const [silencioSegundos, setSilencioSegundos] = useState(
    SILENCIO_PARA_ENCERRAR_PADRAO,
  );
  const [estabilidade, setEstabilidade] = useState(
    VOZ_SUAVE_HUMANIZADA.voz_estabilidade,
  );
  const [similaridade, setSimilaridade] = useState(
    VOZ_SUAVE_HUMANIZADA.voz_similaridade,
  );
  const [estilo, setEstilo] = useState(VOZ_SUAVE_HUMANIZADA.voz_estilo);
  const [salvando, setSalvando] = useState(false);

  function aplicarVozSuave() {
    setEstabilidade(VOZ_SUAVE_HUMANIZADA.voz_estabilidade);
    setSimilaridade(VOZ_SUAVE_HUMANIZADA.voz_similaridade);
    setEstilo(VOZ_SUAVE_HUMANIZADA.voz_estilo);
    setVelocidade(VOZ_SUAVE_HUMANIZADA.velocidade_fala);
    toast.success("Ajuste de voz suave aplicado. Salve para valer nas ligações.");
  }

  const { data: agente, isLoading } = useQuery({
    queryKey: ["agente", id],
    enabled: editando,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agentes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!editando || !agente) return;
    setNome(agente.nome ?? "");
    setSaudacao((agente as any).saudacao_inicial ?? "");
    setPersona(agente.persona_prompt ?? "");
    const vozAtual = agente.voz_id ?? "";
    const isPreset = VOZES_OPCOES.some((v) => v.id === vozAtual);
    if (isPreset) {
      setVoz(vozAtual as VozId);
      setVozIdElevenlabs("");
    } else if (vozAtual) {
      setVozIdElevenlabs(vozAtual);
    }
    setIdioma((agente.idioma as IdiomaId) ?? "pt-BR");
    setVelocidade(Number(agente.velocidade_fala ?? 1));
    const a = agente as any;
    setEncerrarAuto(a.encerrar_automaticamente ?? true);
    setFraseDespedida(a.frase_despedida ?? "");
    setSilencioSegundos(
      Number(a.silencio_para_encerrar_segundos ?? SILENCIO_PARA_ENCERRAR_PADRAO),
    );
    setEstabilidade(Number(a.voz_estabilidade ?? VOZ_SUAVE_HUMANIZADA.voz_estabilidade));
    setSimilaridade(Number(a.voz_similaridade ?? VOZ_SUAVE_HUMANIZADA.voz_similaridade));
    setEstilo(Number(a.voz_estilo ?? VOZ_SUAVE_HUMANIZADA.voz_estilo));
  }, [editando, agente]);

  async function salvar() {
    if (!nome.trim()) {
      toast.error("Informe o nome do agente");
      return;
    }
    if (!persona.trim()) {
      toast.error("Defina a personalidade e instruções do agente");
      return;
    }
    setSalvando(true);

    const vozFinal = vozIdElevenlabs.trim() || voz;
    const payload = {
      nome: nome.trim(),
      saudacao_inicial: saudacao.trim() || null,
      persona_prompt: persona.trim(),
      voz_id: vozFinal,
      idioma,
      velocidade_fala: velocidade,
    };

    const { error } = editando
      ? await supabase.from("agentes").update(payload).eq("id", id)
      : await supabase.from("agentes").insert({ ...payload, user_id: user.id });

    setSalvando(false);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success(editando ? "Agente atualizado" : "Agente criado");
    queryClient.invalidateQueries({ queryKey: ["agentes"] });
    navigate({ to: "/app/agentes" });
  }

  if (editando && isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8 text-muted-foreground">Carregando...</div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">
          {editando ? "Editar agente" : "Novo agente"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Defina como sua IA se apresenta e conversa nas ligações.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome do agente</Label>
          <Input
            id="nome"
            placeholder="Ana - Confirmação de consultas"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="saudacao">Saudação inicial</Label>
          <Textarea
            id="saudacao"
            rows={3}
            placeholder={SAUDACAO_PLACEHOLDER}
            value={saudacao}
            onChange={(e) => setSaudacao(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            É a primeira frase que a pessoa ouve quando atende a ligação.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="persona">Personalidade e instruções</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPersona(MODELO_PERSONA_EXEMPLO)}
            >
              Usar modelo de exemplo
            </Button>
          </div>
          <Card className="bg-muted/40 border-dashed">
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Lightbulb className="h-4 w-4" />
                Dica: o que escrever aqui
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-4 text-sm text-muted-foreground">
              <ul className="list-disc space-y-1 pl-5">
                <li>Quem é o agente (nome e empresa).</li>
                <li>O objetivo da ligação em uma frase.</li>
                <li>O tom de voz: calorosa, formal, descontraída.</li>
                <li>Regras: o que sempre fazer e o que nunca dizer.</li>
                <li>O que fazer se a pessoa não tiver interesse.</li>
              </ul>
            </CardContent>
          </Card>
          <Textarea
            id="persona"
            className="min-h-[360px] font-mono text-sm"
            placeholder="Descreva quem é o agente, o objetivo, o tom, as regras e o encerramento."
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Voz</Label>
            <Select value={voz} onValueChange={(v) => setVoz(v as VozId)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOZES_OPCOES.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Idioma</Label>
            <Select value={idioma} onValueChange={(v) => setIdioma(v as IdiomaId)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IDIOMAS_OPCOES.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="voz-eleven">ID da voz do ElevenLabs (opcional)</Label>
          <Input
            id="voz-eleven"
            placeholder="Ex: 21m00Tcm4TlvDq8ikWAM"
            value={vozIdElevenlabs}
            onChange={(e) => setVozIdElevenlabs(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            As vozes reais do ElevenLabs serão conectadas na fase do servidor. Por enquanto,
            escolha o estilo desejado. Se preenchido, este ID será usado no lugar do estilo
            selecionado acima.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Velocidade da fala</Label>
            <span className="text-sm tabular-nums text-muted-foreground">
              {velocidade.toFixed(2)}x
            </span>
          </div>
          <Slider
            min={0.7}
            max={1.2}
            step={0.05}
            value={[velocidade]}
            onValueChange={(v) => setVelocidade(v[0])}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Mais devagar (0.70)</span>
            <span>Padrão (1.00)</span>
            <span>Mais rápido (1.20)</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-6">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/app/agentes" })}
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar agente"}
          </Button>
        </div>
      </div>
    </div>
  );
}
