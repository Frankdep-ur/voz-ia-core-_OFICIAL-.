import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Pause, Play, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  formatarDataHora,
  proximaAcao,
  type StatusCampanha,
  type StatusCampanhaContato,
} from "@/lib/campanhas";
import {
  CampanhaContatoStatusBadge,
  CampanhaStatusBadge,
} from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { extrairErroEdge } from "@/lib/edge-errors";
import { rotuloIdioma, rotuloVoz } from "@/lib/agentes";

export const Route = createFileRoute("/_authenticated/app/campanhas_/$id")({
  head: () => ({ meta: [{ title: "Campanha — VozIA" }] }),
  component: DetalheCampanhaPage,
});

type Campanha = {
  id: string;
  nome: string | null;
  status: StatusCampanha;
  agendada_para: string | null;
  max_tentativas: number;
  agentes: { nome: string | null; voz_id: string | null; idioma: string | null } | null;
};

type LinhaContato = {
  id: string;
  status: StatusCampanhaContato;
  tentativas: number;
  contatos: { nome: string | null; telefone: string | null } | null;
};

function DetalheCampanhaPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [iniciando, setIniciando] = useState(false);

  const { data: campanha, isLoading } = useQuery({
    queryKey: ["campanha", id],
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campanhas")
        .select("id, nome, status, agendada_para, max_tentativas, agentes(nome, voz_id, idioma)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Campanha | null;
    },
  });

  const { data: linhas = [] } = useQuery({
    queryKey: ["campanha-contatos", id],
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campanha_contatos")
        .select("id, status, tentativas, contatos(nome, telefone)")
        .eq("campanha_id", id)
        .order("atualizado_em", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as LinhaContato[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`campanha-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campanha_contatos", filter: `campanha_id=eq.${id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["campanha-contatos", id] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campanhas", filter: `id=eq.${id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["campanha", id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, queryClient]);

  const resumo = useMemo(() => {
    const base = { total: linhas.length, na_fila: 0, ligando: 0, atendidas: 0, falhas: 0 };
    for (const l of linhas) {
      if (l.status === "na_fila") base.na_fila += 1;
      else if (l.status === "ligando") base.ligando += 1;
      else if (l.status === "atendida" || l.status === "concluida") base.atendidas += 1;
      else if (l.status === "falhou" || l.status === "sem_resposta") base.falhas += 1;
    }
    return base;
  }, [linhas]);

  async function pausar() {
    if (!campanha) return;
    const { error } = await supabase
      .from("campanhas")
      .update({ status: "pausada" })
      .eq("id", campanha.id);
    if (error) toast.error("Erro ao pausar", { description: error.message });
    else {
      toast.success("Campanha pausada");
      queryClient.invalidateQueries({ queryKey: ["campanha", id] });
    }
  }

  async function iniciar() {
    if (!campanha) return;
    setIniciando(true);
    try {
      const { data, error } = await supabase.functions.invoke("iniciar-campanha", {
        body: { campanha_id: campanha.id },
      });
      if (error) {
        toast.error("Erro ao iniciar", { description: error.message });
        return;
      }
      if (data?.started) {
        toast.success("Campanha iniciada");
      } else {
        toast.info("Campanha pronta", {
          description: data?.message ?? "A campanha está pronta. Aguardando servidor de voz.",
          duration: 8000,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["campanha", id] });
    } finally {
      setIniciando(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8 text-muted-foreground">Carregando...</div>
    );
  }

  if (!campanha) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-muted-foreground">Campanha não encontrada.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/app/campanhas">Voltar</Link>
        </Button>
      </div>
    );
  }

  const acao = proximaAcao(campanha.status);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => navigate({ to: "/app/campanhas" })}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold">{campanha.nome ?? "(sem nome)"}</h2>
            <Badge variant="secondary">{STATUS_CAMPANHA_LABEL[campanha.status]}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {acao === "iniciar" && (
            <Button onClick={iniciar} disabled={iniciando}>
              <Play className="mr-1 h-4 w-4" />
              Iniciar
            </Button>
          )}
          {acao === "pausar" && (
            <Button variant="secondary" onClick={pausar}>
              <Pause className="mr-1 h-4 w-4" />
              Pausar
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Agente</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="font-medium">{campanha.agentes?.nome ?? "—"}</div>
            <div className="text-xs text-muted-foreground">
              {rotuloVoz(campanha.agentes?.voz_id)} · {rotuloIdioma(campanha.agentes?.idioma)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Agendamento
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {campanha.agendada_para ? formatarDataHora(campanha.agendada_para) : "Imediato"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tentativas máx.
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{campanha.max_tentativas}</CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-5">
        {[
          { label: "Total", value: resumo.total },
          { label: "Na fila", value: resumo.na_fila },
          { label: "Ligando", value: resumo.ligando },
          { label: "Atendidas", value: resumo.atendidas },
          { label: "Falhas", value: resumo.falhas },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Tentativas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nenhum contato vinculado.
                </TableCell>
              </TableRow>
            ) : (
              linhas.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.contatos?.nome ?? "—"}</TableCell>
                  <TableCell>{l.contatos?.telefone ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {STATUS_CAMPANHA_CONTATO_LABEL[l.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{l.tentativas}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
