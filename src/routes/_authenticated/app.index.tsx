import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Home,
});

function Home() {
  const { user } = Route.useRouteContext();
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("nome")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setNome(data?.nome ?? null));
  }, [user.id]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h2 className="text-2xl font-semibold mb-2">Olá{nome ? `, ${nome}` : ""}</h2>
      <p className="text-muted-foreground">{user.email}</p>
      <p className="mt-8 text-muted-foreground">
        Esta é a sua área inicial. Use o menu lateral para navegar entre contatos, agentes, campanhas e relatórios.
      </p>
    </div>
  );
}
