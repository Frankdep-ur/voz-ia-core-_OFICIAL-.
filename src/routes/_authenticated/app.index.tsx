import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SENTIMENTO_LABEL,
  formatDataHora,
  formatDuracao,
  formatNota,
  sentimentoBadgeClass,
  type Sentimento,
} from "@/lib/ligacoes";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Home,
});

type LigacaoRow = {
  id: string;
  status: string | null;
  duracao_segundos: number | null;
  sentimento: Sentimento | null;
  nota: number | null;
  iniciada_em: string | null;
  contato_id: string | null;
  contatos: { nome: string | null } | null;
};

function firstOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function Home() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("nome")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setNome(data?.nome ?? null));
  }, [user.id]);

  const { data: ligacoes = [] } = useQuery({
    queryKey: ["dashboard-ligacoes"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ligacoes")
        .select(
          `id, status, duracao_segundos, sentimento, nota, iniciada_em, contato_id,
           contatos:contato_id ( nome )`,
        )
        .order("iniciada_em", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        contatos: firstOrNull(r.contatos as never),
      })) as unknown as LigacaoRow[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("dashboard-ligacoes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ligacoes", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["dashboard-ligacoes"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user.id, queryClient]);

  const metricas = useMemo(() => {
    const total = ligacoes.length;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const hojeCount = ligacoes.filter((l) => {
      if (!l.iniciada_em) return false;
      const d = new Date(l.iniciada_em);
      return d >= hoje && d < amanha;
    }).length;
    const atendidas = ligacoes.filter((l) => l.status === "atendida");
    const taxa = total > 0 ? (atendidas.length / total) * 100 : 0;
    const duracoes = atendidas
      .map((l) => l.duracao_segundos)
      .filter((d): d is number => d != null);
    const duracaoMedia =
      duracoes.length > 0
        ? duracoes.reduce((a, b) => a + b, 0) / duracoes.length
        : null;
    const notas = ligacoes.map((l) => l.nota).filter((n): n is number => n != null);
    const notaMedia =
      notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
    const comSent = ligacoes.filter((l) => l.sentimento);
    const positivos = comSent.filter((l) => l.sentimento === "positivo").length;
    const neutros = comSent.filter((l) => l.sentimento === "neutro").length;
    const negativos = comSent.filter((l) => l.sentimento === "negativo").length;
    const pctPositivo = comSent.length > 0 ? (positivos / comSent.length) * 100 : 0;
    return {
      total,
      hojeCount,
      taxa,
      duracaoMedia,
      notaMedia,
      pctPositivo,
      positivos,
      neutros,
      negativos,
      totalSent: comSent.length,
    };
  }, [ligacoes]);

  const dadosGrafico = useMemo(() => {
    const dias: { label: string; key: string; count: number }[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      dias.push({ label, key, count: 0 });
    }
    for (const l of ligacoes) {
      if (!l.iniciada_em) continue;
      const d = new Date(l.iniciada_em);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const item = dias.find((x) => x.key === key);
      if (item) item.count += 1;
    }
    return dias;
  }, [ligacoes]);

  const ultimas = ligacoes.slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Olá, {nome ?? user.email}</h2>
        <p className="text-sm text-muted-foreground">Visão geral das suas ligações.</p>
      </div>

      {ligacoes.length === 0 && (
        <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          Você ainda não tem ligações. Crie uma campanha e use o botão de exemplo em
          Relatórios para visualizar o dashboard.
        </div>
      )}

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Ligações hoje" value={String(metricas.hojeCount)} />
        <MetricCard label="Total de ligações" value={String(metricas.total)} />
        <MetricCard label="Taxa de atendimento" value={`${metricas.taxa.toFixed(0)}%`} />
        <MetricCard
          label="Duração média"
          value={metricas.duracaoMedia != null ? formatDuracao(metricas.duracaoMedia) : "—"}
        />
        <MetricCard label="Nota média" value={formatNota(metricas.notaMedia)} />
        <MetricCard
          label="Avaliações positivas"
          value={metricas.totalSent > 0 ? `${metricas.pctPositivo.toFixed(0)}%` : "—"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Ligações por dia (últimos 7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGrafico} margin={{ left: -16, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sentimento das ligações</CardTitle>
          </CardHeader>
          <CardContent>
            <SentimentoBar
              label="Positivo"
              count={metricas.positivos}
              total={metricas.totalSent}
              sentimento="positivo"
            />
            <SentimentoBar
              label="Neutro"
              count={metricas.neutros}
              total={metricas.totalSent}
              sentimento="neutro"
            />
            <SentimentoBar
              label="Negativo"
              count={metricas.negativos}
              total={metricas.totalSent}
              sentimento="negativo"
            />
            {metricas.totalSent === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Sem ligações com sentimento ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Últimas ligações</CardTitle>
          <Link to="/app/relatorios" className="text-sm text-primary hover:underline">
            Ver todas
          </Link>
        </CardHeader>
        <CardContent>
          {ultimas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ligação ainda.</p>
          ) : (
            <div className="divide-y">
              {ultimas.map((l) => (
                <div
                  key={l.id}
                  className="grid grid-cols-12 items-center gap-2 py-2 text-sm"
                >
                  <span className="col-span-4 font-medium truncate">
                    {l.contatos?.nome ?? "—"}
                  </span>
                  <span className="col-span-2 tabular-nums">{formatNota(l.nota)}</span>
                  <span className="col-span-3">
                    {l.sentimento ? (
                      <Badge className={sentimentoBadgeClass(l.sentimento)}>
                        {SENTIMENTO_LABEL[l.sentimento]}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                  <span className="col-span-3 text-right text-muted-foreground whitespace-nowrap">
                    {formatDataHora(l.iniciada_em)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function SentimentoBar({
  label,
  count,
  total,
  sentimento,
}: {
  label: string;
  count: number;
  total: number;
  sentimento: Sentimento;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const fill =
    sentimento === "positivo"
      ? "bg-emerald-500"
      : sentimento === "negativo"
        ? "bg-red-500"
        : "bg-muted-foreground/40";
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">{count}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
