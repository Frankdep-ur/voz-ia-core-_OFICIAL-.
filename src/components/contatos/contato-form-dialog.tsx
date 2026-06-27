import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { STATUS_CONTATO, STATUS_LABEL, validarE164, type StatusContato } from "@/lib/contatos";

export type ContatoRow = {
  id: string;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  tags: string | null;
  observacoes: string | null;
  status: StatusContato;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contato?: ContatoRow | null;
  userId: string;
  onSaved: () => void;
};

export function ContatoFormDialog({ open, onOpenChange, contato, userId, onSaved }: Props) {
  const editando = !!contato;
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [tags, setTags] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState<StatusContato>("novo");
  const [salvando, setSalvando] = useState(false);
  const [erroTel, setErroTel] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNome(contato?.nome ?? "");
    setTelefone(contato?.telefone ?? "");
    setEmail(contato?.email ?? "");
    setTags(contato?.tags ?? "");
    setObservacoes(contato?.observacoes ?? "");
    setStatus(contato?.status ?? "novo");
    setErroTel(null);
  }, [open, contato]);

  async function salvar() {
    if (!nome.trim()) {
      toast.error("Informe o nome");
      return;
    }
    if (!validarE164(telefone)) {
      setErroTel("Telefone deve estar no formato E.164 (ex: +5511999999999)");
      return;
    }
    setErroTel(null);
    setSalvando(true);

    const payload = {
      nome: nome.trim(),
      telefone: telefone.trim(),
      email: email.trim() || null,
      tags: tags.trim() || null,
      observacoes: observacoes.trim() || null,
      status,
    };

    const { error } = editando
      ? await supabase.from("contatos").update(payload).eq("id", contato!.id)
      : await supabase.from("contatos").insert({ ...payload, user_id: userId });

    setSalvando(false);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success(editando ? "Contato atualizado" : "Contato criado");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar contato" : "Novo contato"}</DialogTitle>
          <DialogDescription>Preencha os dados do contato.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telefone">Telefone (E.164)</Label>
            <Input
              id="telefone"
              placeholder="+5511999999999"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
            {erroTel && <p className="text-sm text-destructive">{erroTel}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="obs">Observações</Label>
            <Textarea id="obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusContato)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_CONTATO.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
