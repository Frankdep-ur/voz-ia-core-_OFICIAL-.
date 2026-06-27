import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  STATUS_CAMPANHA_CONTATO_LABEL,
  STATUS_CAMPANHA_LABEL,
  type StatusCampanha,
  type StatusCampanhaContato,
} from "@/lib/campanhas";

const base = "rounded-full border-transparent px-2.5 py-0.5 text-xs font-medium hover:opacity-90";

const NEUTRAL =
  "bg-muted text-muted-foreground dark:bg-muted/60";
const BLUE =
  "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300";
const BLUE_SOFT =
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300";
const GREEN =
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
const RED =
  "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";

function classeCampanha(status: StatusCampanha | string): string {
  switch (status) {
    case "em_andamento":
      return BLUE;
    case "concluida":
      return GREEN;
    case "rascunho":
    case "agendada":
    case "pausada":
      return NEUTRAL;
    default:
      return NEUTRAL;
  }
}

export function CampanhaStatusBadge({
  status,
  className,
}: {
  status: StatusCampanha;
  className?: string;
}) {
  return (
    <Badge className={cn(base, classeCampanha(status), className)}>
      {STATUS_CAMPANHA_LABEL[status] ?? status}
    </Badge>
  );
}

function classeContato(status: StatusCampanhaContato | string): string {
  switch (status) {
    case "na_fila":
      return BLUE_SOFT;
    case "atendida":
    case "concluida":
      return GREEN;
    case "falhou":
    case "sem_resposta":
      return RED;
    case "ligando":
      return BLUE;
    default:
      return NEUTRAL;
  }
}

export function CampanhaContatoStatusBadge({
  status,
  className,
}: {
  status: StatusCampanhaContato;
  className?: string;
}) {
  return (
    <Badge className={cn(base, classeContato(status), className)}>
      {STATUS_CAMPANHA_CONTATO_LABEL[status] ?? status}
    </Badge>
  );
}

export function StatusTextoBadge({
  texto,
  className,
}: {
  texto: string;
  className?: string;
}) {
  return <Badge className={cn(base, NEUTRAL, className)}>{texto}</Badge>;
}
