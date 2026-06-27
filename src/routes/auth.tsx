import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "VozIA — Entrar" },
      { name: "description", content: "Acesse sua conta do VozIA." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");

  const [cadNome, setCadNome] = useState("");
  const [cadEmail, setCadEmail] = useState("");
  const [cadSenha, setCadSenha] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/app" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginSenha });
    setLoading(false);
    if (error) toast.error("Não foi possível entrar", { description: error.message });
    else toast.success("Bem-vindo de volta");
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: cadEmail,
      password: cadSenha,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { nome: cadNome },
      },
    });
    setLoading(false);
    if (error) toast.error("Não foi possível cadastrar", { description: error.message });
    else toast.success("Cadastro realizado", { description: "Verifique seu e-mail se a confirmação estiver ativada." });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <Button variant="outline" size="sm" onClick={toggle}>
          Tema: {theme === "claro" ? "claro" : "escuro"}
        </Button>
      </div>
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-foreground">VozIA</h1>
        <p className="text-center text-muted-foreground mb-6">Discador Inteligente</p>
        <Card>
          <CardHeader>
            <CardTitle>Acesse sua conta</CardTitle>
            <CardDescription>Entre ou crie uma conta para continuar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="entrar">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="entrar">Entrar</TabsTrigger>
                <TabsTrigger value="cadastrar">Cadastrar</TabsTrigger>
              </TabsList>
              <TabsContent value="entrar">
                <form onSubmit={entrar} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input id="login-email" type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-senha">Senha</Label>
                    <Input id="login-senha" type="password" required value={loginSenha} onChange={(e) => setLoginSenha(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="cadastrar">
                <form onSubmit={cadastrar} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="cad-nome">Nome</Label>
                    <Input id="cad-nome" type="text" value={cadNome} onChange={(e) => setCadNome(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cad-email">E-mail</Label>
                    <Input id="cad-email" type="email" required value={cadEmail} onChange={(e) => setCadEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cad-senha">Senha</Label>
                    <Input id="cad-senha" type="password" required minLength={6} value={cadSenha} onChange={(e) => setCadSenha(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Criando..." : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
