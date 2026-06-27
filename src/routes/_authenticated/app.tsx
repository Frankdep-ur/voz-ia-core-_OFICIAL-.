import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [{ title: "VozIA" }],
  }),
  component: Home,
});

function Home() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("nome")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setNome(data?.nome ?? null));
  }, [user.id]);

  async function sair() {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error("Erro ao sair", { description: error.message });
    else navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-xl font-bold">VozIA</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggle}>
            Tema: {theme === "claro" ? "claro" : "escuro"}
          </Button>
          <Button variant="outline" size="sm" onClick={sair}>
            Sair
          </Button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-semibold mb-2">Olá{nome ? `, ${nome}` : ""}</h2>
        <p className="text-muted-foreground">{user.email}</p>
        <p className="mt-8 text-muted-foreground">
          Esta é a sua área inicial. As próximas telas (contatos, agentes, campanhas e ligações) serão adicionadas em seguida.
        </p>
      </main>
    </div>
  );
}
