import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  SENTIMENTO_LABEL,
  formatDataHora,
  formatDuracao,
  formatNota,
  gerarLoteExemplo,
  parseTranscricaoChat,
  sentimentoBadgeClass,
  type Sentimento,
} from "@/lib/ligacoes";

export const Route = createFileRoute("/_authenticated/app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — VozIA" }] }),
  component: RelatoriosPage,
});

type Ligacao = {
  id: string;
  status: string | null;
  duracao_segundos: number | null;
  sentimento: Sentimento | null;
  nota: number | null;
  resultado: string | null;
  transcricao: string | null;
  gravacao_url: string | null;
  iniciada_em: string | null;
  finalizada_em: string | null;
  campanha_id: string | null;
  contato_id: string | null;
  contatos: { nome: string | null; telefone: string | null } | null;
  campanhas: { nome: string | null } | null;
};

function firstOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function RelatoriosPage() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [campanhaFiltro, setCampanhaFiltro] = useState<string>("todas");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [sentimentoFiltro, setSentimentoFiltro] = useState<string>("todos");
  const [selecionada, setSelecionada] = useState<Ligacao | null>(null);
  const [gerando, setGerando] = useState(false);
  const [limpando, setLimpando] = useState(false);

  const { data: userId } = useQuery({
    queryKey: ["auth-user-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const { data: ligacoes = [], isLoading } = useQuery({
    queryKey: ["ligacoes"],
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ligacoes")
        .select(
          `id, status, duracao_segundos, sentimento, nota, resultado, transcricao, gravacao_url,
           iniciada_em, finalizada_em, campanha_id, contato_id,
           contatos:contato_id ( nome, telefone ),
           campanhas:campanha_id ( nome )`,
        )
        .order("iniciada_em", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        contatos: firstOrNull(r.contatos as never),
        campanhas: firstOrNull(r.campanhas as never),
      })) as unknown as Ligacao[];
    },
  });

  const { data: campanhas = [] } = useQuery({
    queryKey: ["campanhas-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campanhas")
        .select("id, nome")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel("relatorios-ligacoes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ligacoes", filter: `user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ["ligacoes"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, queryClient]);

  const statusUnicos = useMemo(() => {
    const set = new Set<string>();
    for (const l of ligacoes) if (l.status) set.add(l.status);
    return Array.from(set).sort();
  }, [ligacoes]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return ligacoes.filter((l) => {
      if (campanhaFiltro !== "todas" && l.campanha_id !== campanhaFiltro) return false;
      if (statusFiltro !== "todos" && l.status !== statusFiltro) return false;
      if (sentimentoFiltro !== "todos" && l.sentimento !== sentimentoFiltro) return false;
      if (q) {
        const nome = (l.contatos?.nome ?? "").toLowerCase();
        const tel = (l.contatos?.telefone ?? "").toLowerCase();
        if (!nome.includes(q) && !tel.includes(q)) return false;
      }
      return true;
    });
  }, [ligacoes, busca, campanhaFiltro, statusFiltro, sentimentoFiltro]);

  async function gerarExemplos() {
    if (!userId) return;
    setGerando(true);
    try {
      const [{ data: cs }, { data: cmps }] = await Promise.all([
        supabase.from("contatos").select("id"),
        supabase.from("campanhas").select("id"),
      ]);
      if (!cs || cs.length === 0 || !cmps || cmps.length === 0) {
        toast.warning("Crie pelo menos um contato e uma campanha primeiro.");
        return;
      }
      const lote = gerarLoteExemplo({
        userId,
        contatosIds: cs.map((c) => c.id),
        campanhasIds: cmps.map((c) => c.id),
      });
      const { error } = await supabase.from("ligacoes").insert(lote);
      if (error) {
        toast.error("Erro ao gerar dados", { description: error.message });
        return;
      }
      toast.success(`${lote.length} ligações de exemplo geradas`);
      queryClient.invalidateQueries({ queryKey: ["ligacoes"] });
    } finally {
      setGerando(false);
    }
  }

  async function limparExemplos() {
    if (!userId) return;
    setLimpando(true);
    try {
      const { error } = await supabase.from("ligacoes").delete().eq("user_id", userId);
      if (error) {
        toast.error("Erro ao limpar", { description: error.message });
        return;
      }
      toast.success("Ligações apagadas");
      queryClient.invalidateQueries({ queryKey: ["ligacoes"] });
    } finally {
      setLimpando(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Relatórios</h2>
          <p className="text-sm text-muted-foreground">Veja o resultado de cada ligação.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={gerarExemplos} disabled={gerando}>
              {gerando ? "Gerando..." : "Gerar dados de exemplo (teste)"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={limpando}>
                  Limpar ligações de exemplo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso apaga todas as suas ligações. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={limparExemplos}>Apagar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <span className="text-xs text-muted-foreground">Botões temporários para testes.</span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por nome ou telefone"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-64"
        />
        <Select value={campanhaFiltro} onValueChange={setCampanhaFiltro}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Campanha" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as campanhas</SelectItem>
            {campanhas.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome ?? "(sem nome)"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {statusUnicos.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sentimentoFiltro} onValueChange={setSentimentoFiltro}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Sentimento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os sentimentos</SelectItem>
            <SelectItem value="positivo">Positivo</SelectItem>
            <SelectItem value="neutro">Neutro</SelectItem>
            <SelectItem value="negativo">Negativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : ligacoes.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
          Nenhuma ligação ainda. As ligações aparecerão aqui assim que suas campanhas começarem a rodar.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Campanha</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Sentimento</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Nenhuma ligação encontrada com esses filtros.
                  </TableCell>
                </TableRow>
              ) : (
                filtradas.map((l) => (
                  <TableRow
                    key={l.id}
                    className="cursor-pointer"
                    onClick={() => setSelecionada(l)}
                  >
                    <TableCell className="font-medium">{l.contatos?.nome ?? "—"}</TableCell>
                    <TableCell>{l.contatos?.telefone ?? "—"}</TableCell>
                    <TableCell>{l.campanhas?.nome ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{l.status ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{formatDuracao(l.duracao_segundos)}</TableCell>
                    <TableCell>
                      {l.sentimento ? (
                        <Badge className={sentimentoBadgeClass(l.sentimento)}>
                          {SENTIMENTO_LABEL[l.sentimento]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDataHora(l.iniciada_em)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={!!selecionada} onOpenChange={(o) => !o && setSelecionada(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selecionada && <DetalheLigacao ligacao={selecionada} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetalheLigacao({ ligacao }: { ligacao: Ligacao }) {
  const falas = useMemo(() => parseTranscricaoChat(ligacao.transcricao), [ligacao.transcricao]);

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>{ligacao.contatos?.nome ?? "Ligação"}</SheetTitle>
      </SheetHeader>

      <div className="space-y-1 text-sm">
        <div className="text-muted-foreground">{ligacao.contatos?.telefone ?? "—"}</div>
        <div>Campanha: <span className="font-medium">{ligacao.campanhas?.nome ?? "—"}</span></div>
        <div>Data: {formatDataHora(ligacao.iniciada_em)}</div>
        <div>Duração: <span className="tabular-nums">{formatDuracao(ligacao.duracao_segundos)}</span></div>
        <div className="flex items-center gap-2 pt-1">
          <Badge variant="outline">{ligacao.status ?? "—"}</Badge>
          {ligacao.sentimento && (
            <Badge className={sentimentoBadgeClass(ligacao.sentimento)}>
              {SENTIMENTO_LABEL[ligacao.sentimento]}
            </Badge>
          )}
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Resultado</h3>
        <p className="whitespace-pre-line text-sm text-muted-foreground">
          {ligacao.resultado ?? "—"}
        </p>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Gravação</h3>
        {ligacao.gravacao_url ? (
          <audio controls src={ligacao.gravacao_url} className="w-full" />
        ) : (
          <p className="text-sm text-muted-foreground">Gravação não disponível ainda.</p>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Transcrição</h3>
        {!ligacao.transcricao ? (
          <p className="text-sm text-muted-foreground">Transcrição não disponível.</p>
        ) : falas.length === 0 ? (
          <p className="whitespace-pre-line text-sm">{ligacao.transcricao}</p>
        ) : (
          <div className="space-y-3">
            {falas.map((f, i) => (
              <div
                key={i}
                className={`flex flex-col ${f.side === "right" ? "items-end" : "items-start"}`}
              >
                {f.speaker && (
                  <span className="mb-1 text-xs text-muted-foreground">{f.speaker}</span>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${
                    f.side === "right"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {f.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
