import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Play, Pause, Eye, Megaphone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CampanhaStatusBadge } from "@/components/status-badge";
import { extrairErroEdge } from "@/lib/edge-errors";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  formatarDataHora,
  proximaAcao,
  type StatusCampanha,
} from "@/lib/campanhas";

export const Route = createFileRoute("/_authenticated/app/campanhas")({
  head: () => ({ meta: [{ title: "Campanhas — VozIA" }] }),
  component: CampanhasPage,
});

type CampanhaRow = {
  id: string;
  nome: string | null;
  status: StatusCampanha;
  agendada_para: string | null;
  agente_id: string | null;
  agentes: { nome: string | null } | null;
};

function CampanhasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [excluir, setExcluir] = useState<CampanhaRow | null>(null);
  const [semAgentesOpen, setSemAgentesOpen] = useState(false);
  const [iniciando, setIniciando] = useState<string | null>(null);

  const { data: campanhas = [], isLoading } = useQuery({
    queryKey: ["campanhas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campanhas")
        .select("id, nome, status, agendada_para, agente_id, agentes(nome)")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CampanhaRow[];
    },
  });

  const ids = useMemo(() => campanhas.map((c) => c.id), [campanhas]);

  const { data: progresso = {} } = useQuery({
    queryKey: ["campanhas-progresso", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campanha_contatos")
        .select("campanha_id, status")
        .in("campanha_id", ids);
      if (error) throw error;
      const agg: Record<string, { total: number; atendidas: number }> = {};
      for (const row of data ?? []) {
        const id = row.campanha_id;
        if (!agg[id]) agg[id] = { total: 0, atendidas: 0 };
        agg[id].total += 1;
        if (row.status === "atendida" || row.status === "concluida") {
          agg[id].atendidas += 1;
        }
      }
      return agg;
    },
  });

  const { data: temAgentes } = useQuery({
    queryKey: ["agentes-existe"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("agentes")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });

  function novaCampanha() {
    if (temAgentes === false) {
      setSemAgentesOpen(true);
      return;
    }
    navigate({ to: "/app/campanhas/nova" });
  }

  async function confirmarExclusao() {
    if (!excluir) return;
    const { error } = await supabase.from("campanhas").delete().eq("id", excluir.id);
    if (error) toast.error("Erro ao excluir", { description: error.message });
    else {
      toast.success("Campanha excluída");
      queryClient.invalidateQueries({ queryKey: ["campanhas"] });
    }
    setExcluir(null);
  }

  async function pausar(id: string) {
    const { error } = await supabase
      .from("campanhas")
      .update({ status: "pausada" })
      .eq("id", id);
    if (error) toast.error("Erro ao pausar", { description: error.message });
    else {
      toast.success("Campanha pausada");
      queryClient.invalidateQueries({ queryKey: ["campanhas"] });
    }
  }

  async function iniciar(id: string) {
    setIniciando(id);
    try {
      const { data, error } = await supabase.functions.invoke("iniciar-campanha", {
        body: { campanha_id: id },
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
      queryClient.invalidateQueries({ queryKey: ["campanhas"] });
    } finally {
      setIniciando(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Campanhas</h2>
          <p className="text-sm text-muted-foreground">
            Crie e acompanhe suas campanhas de ligações.
          </p>
        </div>
        <Button onClick={novaCampanha}>
          <Plus className="mr-1 h-4 w-4" />
          Nova campanha
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-md border p-10 text-center text-muted-foreground">
          Carregando...
        </div>
      ) : campanhas.length === 0 ? (
        <div className="rounded-md border p-12 text-center">
          <Megaphone className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">
            Você ainda não criou nenhuma campanha. Crie a primeira para começar.
          </p>
          <Button onClick={novaCampanha}>
            <Plus className="mr-1 h-4 w-4" />
            Criar primeira campanha
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campanhas.map((c) => {
            const prog = progresso[c.id] ?? { total: 0, atendidas: 0 };
            const acao = proximaAcao(c.status);
            return (
              <Card key={c.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-1">{c.nome ?? "(sem nome)"}</CardTitle>
                    <Badge variant={STATUS_VARIANT[c.status]}>
                      {STATUS_CAMPANHA_LABEL[c.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3 text-sm">
                  <div className="text-muted-foreground">
                    Agente: <span className="text-foreground">{c.agentes?.nome ?? "—"}</span>
                  </div>
                  <div className="text-muted-foreground">
                    Contatos: <span className="text-foreground">{prog.total}</span>
                    {" · "}
                    Progresso:{" "}
                    <span className="text-foreground">
                      {prog.atendidas} de {prog.total} atendidas
                    </span>
                  </div>
                  {c.agendada_para && (
                    <div className="text-muted-foreground">
                      Agendada para:{" "}
                      <span className="text-foreground">{formatarDataHora(c.agendada_para)}</span>
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap justify-end gap-1 pt-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/app/campanhas/$id" params={{ id: c.id }}>
                        <Eye className="mr-1 h-4 w-4" />
                        Ver detalhes
                      </Link>
                    </Button>
                    {acao === "iniciar" && (
                      <Button
                        size="sm"
                        onClick={() => iniciar(c.id)}
                        disabled={iniciando === c.id}
                      >
                        <Play className="mr-1 h-4 w-4" />
                        Iniciar
                      </Button>
                    )}
                    {acao === "pausar" && (
                      <Button size="sm" variant="secondary" onClick={() => pausar(c.id)}>
                        <Pause className="mr-1 h-4 w-4" />
                        Pausar
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setExcluir(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              A campanha {excluir?.nome ? `"${excluir.nome}"` : ""} e os contatos vinculados a
              ela serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={semAgentesOpen} onOpenChange={setSemAgentesOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Crie um agente primeiro</AlertDialogTitle>
            <AlertDialogDescription>
              Toda campanha precisa de um agente para conversar com os contatos. Crie um agente
              antes de configurar uma campanha.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSemAgentesOpen(false);
                navigate({ to: "/app/agentes" });
              }}
            >
              Ir para Agentes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
