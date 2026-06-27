import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2, Plus, Upload, Download, Search, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  STATUS_CONTATO,
  STATUS_LABEL,
  gerarCSVModelo,
  parseCSV,
  validarE164,
  type StatusContato,
} from "@/lib/contatos";
import { ContatoFormDialog, type ContatoRow } from "@/components/contatos/contato-form-dialog";
import { EmptyState } from "@/components/ui/empty-state";

export const Route = createFileRoute("/_authenticated/app/contatos")({
  head: () => ({ meta: [{ title: "Contatos — VozIA" }] }),
  component: ContatosPage,
});

function ContatosPage() {
  const { user } = Route.useRouteContext();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | StatusContato>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<ContatoRow | null>(null);
  const [excluir, setExcluir] = useState<ContatoRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const { data: contatos = [], isLoading, refetch } = useQuery({
    queryKey: ["contatos", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contatos")
        .select("id, nome, telefone, email, tags, observacoes, status")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContatoRow[];
    },
  });

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return contatos.filter((c) => {
      if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
      if (!q) return true;
      return (
        (c.nome ?? "").toLowerCase().includes(q) ||
        (c.telefone ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [contatos, busca, filtroStatus]);

  function abrirNovo() {
    setEditando(null);
    setDialogOpen(true);
  }
  function abrirEditar(c: ContatoRow) {
    setEditando(c);
    setDialogOpen(true);
  }

  async function confirmarExclusao() {
    if (!excluir) return;
    setExcluindo(true);
    const { error } = await supabase.from("contatos").delete().eq("id", excluir.id);
    setExcluindo(false);
    if (error) toast.error("Erro ao excluir", { description: error.message });
    else {
      toast.success("Contato excluído");
      refetch();
    }
    setExcluir(null);
  }

  function baixarModelo() {
    const blob = new Blob([gerarCSVModelo()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-contatos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onArquivoCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportando(true);
    try {
      const text = await file.text();
      const linhas = parseCSV(text);
      const validas: Array<{
        user_id: string;
        nome: string;
        telefone: string;
        email: string | null;
        tags: string | null;
        status: StatusContato;
      }> = [];
      let ignoradas = 0;
      for (const l of linhas) {
        if (!l.telefone || !validarE164(l.telefone)) {
          ignoradas++;
          continue;
        }
        validas.push({
          user_id: user.id,
          nome: l.nome || "(sem nome)",
          telefone: l.telefone,
          email: l.email || null,
          tags: l.tags || null,
          status: "novo",
        });
      }
      if (validas.length === 0) {
        toast.error("Nenhum contato válido", {
          description: `${ignoradas} linha(s) ignoradas por telefone inválido.`,
        });
        return;
      }
      const { error } = await supabase.from("contatos").insert(validas);
      if (error) {
        toast.error("Erro ao importar", { description: error.message });
        return;
      }
      toast.success(`${validas.length} contatos importados, ${ignoradas} ignorados por telefone inválido`);
      refetch();
    } catch (err: any) {
      toast.error("Erro ao ler arquivo", { description: err?.message });
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Contatos</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os contatos para suas campanhas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={baixarModelo}>
            <Download className="mr-1 h-4 w-4" />
            Baixar modelo CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={importando}
          >
            {importando ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-1 h-4 w-4" />
                Importar CSV
              </>
            )}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onArquivoCSV}
          />
          <Button size="sm" onClick={abrirNovo}>
            <Plus className="mr-1 h-4 w-4" />
            Novo contato
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou e-mail"
            className="pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as typeof filtroStatus)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {STATUS_CONTATO.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Carregando...</div>
        ) : contatos.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">
              Você ainda não tem contatos. Crie um ou importe um CSV.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum contato encontrado com esses filtros.
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome ?? "—"}</TableCell>
                    <TableCell>{c.telefone ?? "—"}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>{c.tags ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{STATUS_LABEL[c.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => abrirEditar(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setExcluir(c)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <ContatoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contato={editando}
        userId={user.id}
        onSaved={refetch}
      />

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              O contato {excluir?.nome ? `"${excluir.nome}"` : ""} será excluído permanentemente.
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
