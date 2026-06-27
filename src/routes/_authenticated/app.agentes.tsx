import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2, Plus, Bot, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { rotuloIdioma, rotuloVoz } from "@/lib/agentes";
import { EmptyState } from "@/components/ui/empty-state";

export const Route = createFileRoute("/_authenticated/app/agentes")({
  head: () => ({ meta: [{ title: "Agentes — VozIA" }] }),
  component: AgentesPage,
});

type AgenteRow = {
  id: string;
  nome: string | null;
  persona_prompt: string | null;
  voz_id: string | null;
  idioma: string | null;
};

function AgentesPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [excluir, setExcluir] = useState<AgenteRow | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const { data: agentes = [], isLoading, refetch } = useQuery({
    queryKey: ["agentes", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agentes")
        .select("id, nome, persona_prompt, voz_id, idioma")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AgenteRow[];
    },
  });

  async function confirmarExclusao() {
    if (!excluir) return;
    const { error } = await supabase.from("agentes").delete().eq("id", excluir.id);
    if (error) toast.error("Erro ao excluir", { description: error.message });
    else {
      toast.success("Agente excluído");
      refetch();
    }
    setExcluir(null);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Agentes</h2>
          <p className="text-sm text-muted-foreground">
            Crie a personalidade e a voz da sua IA nas ligações.
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/app/agentes/$id", params: { id: "novo" } })}>
          <Plus className="mr-1 h-4 w-4" />
          Novo agente
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-md border p-10 text-center text-muted-foreground">
          Carregando...
        </div>
      ) : agentes.length === 0 ? (
        <div className="rounded-md border p-12 text-center">
          <Bot className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">
            Você ainda não criou nenhum agente. Crie o primeiro para começar.
          </p>
          <Button onClick={() => navigate({ to: "/app/agentes/$id", params: { id: "novo" } })}>
            <Plus className="mr-1 h-4 w-4" />
            Criar primeiro agente
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agentes.map((a) => (
            <Card key={a.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="line-clamp-1">{a.nome ?? "(sem nome)"}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <p className="line-clamp-2 text-sm text-muted-foreground min-h-[2.5rem]">
                  {a.persona_prompt?.trim() || "Sem personalidade definida."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{rotuloVoz(a.voz_id)}</Badge>
                  <Badge variant="outline">{rotuloIdioma(a.idioma)}</Badge>
                </div>
                <div className="mt-auto flex justify-end gap-1 pt-2">
                  <Button variant="ghost" size="icon" asChild>
                    <Link to="/app/agentes/$id" params={{ id: a.id }}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setExcluir(a)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              O agente {excluir?.nome ? `"${excluir.nome}"` : ""} será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
