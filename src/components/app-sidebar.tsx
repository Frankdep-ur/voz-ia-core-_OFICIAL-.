import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, Users, Bot, Megaphone, BarChart3, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";

const items = [
  { title: "Início", url: "/app", icon: Home, exact: true },
  { title: "Contatos", url: "/app/contatos", icon: Users },
  { title: "Agentes", url: "/app/agentes", icon: Bot },
  { title: "Campanhas", url: "/app/campanhas", icon: Megaphone },
  { title: "Relatórios", url: "/app/relatorios", icon: BarChart3 },
];

export function AppSidebar() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function sair() {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error("Erro ao sair", { description: error.message });
    else navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="px-2 py-3">
          <h1 className="text-xl font-bold tracking-tight">VozIA</h1>
          <p className="text-xs text-muted-foreground">Discador Inteligente</p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.exact ? currentPath === item.url : currentPath.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="space-y-2 p-2">
          <p className="truncate text-xs text-muted-foreground" title={email}>
            {email || "—"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={toggle}>
              {theme === "claro" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={sair}>
              <LogOut className="h-4 w-4 mr-1" />
              Sair
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
