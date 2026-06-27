import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { extrairTags } from "@/lib/campanhas";

export const Route = createFileRoute("/_authenticated/app/campanhas_/nova")({
  head: () => ({ meta: [{ title: "Nova campanha — VozIA" }] }),
  component: NovaCampanhaPage,
});

type AgenteOpt = { id: string; nome: string | null };
type ContatoOpt = { id: string; nome: string | null; telefone: string | null; tags: string | null };

function NovaCampanhaPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState("");
  const [agenteId, setAgenteId] = useState<string>("");
  const [quando, setQuando] = useState<"agora" | "agendar">("agora");
  const [data, setData] = useState<Date | undefined>();
  const [hora, setHora] = useState("09:00");
  const [maxTentativas, setMaxTentativas] = useState(2);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [tagEscolhida, setTagEscolhida] = useState<string>("");
  const [salvando, setSalvando] = useState(false);

  const { data: agentes = [] } = useQuery({
    queryKey: ["agentes-opt"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agentes")
        .select("id, nome")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AgenteOpt[];
    },
  });

  const { data: contatos = [] } = useQuery({
    queryKey: ["contatos-opt"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contatos")
        .select("id, nome, telefone, tags")
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ContatoOpt[];
    },
  });

  const tagsDisponiveis = useMemo(() => {
    const set = new Set<string>();
    contatos.forEach((c) => extrairTags(c.tags).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [contatos]);

  const contatosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return contatos;
    return contatos.filter(
      (c) =>
        (c.nome ?? "").toLowerCase().includes(q) ||
        (c.telefone ?? "").toLowerCase().includes(q),
    );
  }, [contatos, busca]);

  function toggle(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function aplicarTag(tag: string) {
    setTagEscolhida(tag);
    if (!tag) return;
    const novos = contatos
      .filter((c) => extrairTags(c.tags).includes(tag))
      .map((c) => c.id);
    setSelecionados((prev) => {
      const next = new Set(prev);
      novos.forEach((id) => next.add(id));
      return next;
    });
    toast.success(`${novos.length} contato(s) adicionados pela tag "${tag}"`);
  }

  async function salvar() {
    if (!nome.trim()) {
      toast.error("Informe o nome da campanha");
      return;
    }
    if (!agenteId) {
      toast.error("Escolha um agente");
      return;
    }
    if (selecionados.size === 0) {
      toast.error("Selecione ao menos um contato");
      return;
    }

    let agendadaPara: string | null = null;
    if (quando === "agendar") {
      if (!data) {
        toast.error("Escolha a data");
        return;
      }
      const [h, m] = hora.split(":").map(Number);
      const d = new Date(data);
      d.setHours(h || 0, m || 0, 0, 0);
      if (d.getTime() <= Date.now()) {
        toast.error("A data agendada precisa ser no futuro");
        return;
      }
      agendadaPara = d.toISOString();
    }

    const status: "rascunho" | "agendada" = agendadaPara ? "agendada" : "rascunho";

    setSalvando(true);
    const { data: criada, error } = await supabase
      .from("campanhas")
      .insert({
        user_id: user.id,
        nome: nome.trim(),
        agente_id: agenteId,
        status,
        agendada_para: agendadaPara,
        max_tentativas: maxTentativas,
      })
      .select("id")
      .single();

    if (error || !criada) {
      setSalvando(false);
      toast.error("Erro ao criar campanha", { description: error?.message });
      return;
    }

    const rows = Array.from(selecionados).map((contato_id) => ({
      campanha_id: criada.id,
      contato_id,
      status: "na_fila" as const,
      tentativas: 0,
    }));
    const { error: erroLink } = await supabase.from("campanha_contatos").insert(rows);
    setSalvando(false);
    if (erroLink) {
      toast.error("Campanha criada, mas houve erro ao vincular contatos", {
        description: erroLink.message,
      });
    } else {
      toast.success("Campanha criada");
    }
    queryClient.invalidateQueries({ queryKey: ["campanhas"] });
    navigate({ to: "/app/campanhas/$id", params: { id: criada.id } });
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Nova campanha</h2>
        <p className="text-sm text-muted-foreground">
          Escolha o agente, os contatos e quando começar.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome da campanha</Label>
          <Input
            id="nome"
            placeholder="Confirmação de consultas - Maio"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Agente</Label>
          <Select value={agenteId} onValueChange={setAgenteId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um agente" />
            </SelectTrigger>
            <SelectContent>
              {agentes.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nome ?? "(sem nome)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Contatos</span>
              <span className="text-sm font-normal text-muted-foreground">
                {selecionados.size} contato(s) selecionado(s)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="manual">
              <TabsList>
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="tag">Por tag</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou telefone"
                    className="pl-9"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
                <div className="max-h-72 overflow-y-auto rounded-md border">
                  {contatosFiltrados.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Nenhum contato encontrado.
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {contatosFiltrados.map((c) => {
                        const checked = selecionados.has(c.id);
                        return (
                          <li key={c.id}>
                            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-accent/50">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggle(c.id)}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium">
                                  {c.nome ?? "(sem nome)"}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {c.telefone ?? "—"}
                                </div>
                              </div>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="tag" className="space-y-3">
                {tagsDisponiveis.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Você ainda não tem contatos com tags. Adicione tags na tela de Contatos.
                  </p>
                ) : (
                  <>
                    <Label>Escolha uma tag</Label>
                    <Select value={tagEscolhida} onValueChange={aplicarTag}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma tag" />
                      </SelectTrigger>
                      <SelectContent>
                        {tagsDisponiveis.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Os contatos da tag escolhida são adicionados à seleção. Você ainda pode
                      ajustar manualmente na aba "Manual".
                    </p>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label>Quando ligar</Label>
          <RadioGroup value={quando} onValueChange={(v) => setQuando(v as "agora" | "agendar")}>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="agora" id="agora" />
              <Label htmlFor="agora" className="font-normal">
                Iniciar agora
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="agendar" id="agendar" />
              <Label htmlFor="agendar" className="font-normal">
                Agendar para
              </Label>
            </div>
          </RadioGroup>
          {quando === "agendar" && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !data && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data ? format(data, "dd/MM/yyyy") : "Escolher data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={data}
                    onSelect={setData}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-[140px]"
              />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tent">Máximo de tentativas por contato</Label>
          <Input
            id="tent"
            type="number"
            min={1}
            max={10}
            value={maxTentativas}
            onChange={(e) => setMaxTentativas(Math.max(1, Number(e.target.value) || 1))}
            className="w-[120px]"
          />
        </div>

        <div className="flex justify-end gap-2 border-t pt-6">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/app/campanhas" })}
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar campanha"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
