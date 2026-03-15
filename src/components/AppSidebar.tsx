import { Home, Mic, Factory, FileStack, BarChart3, Settings, ListTodo, FileText, LogOut, FolderOpen, Upload, Lightbulb, ScrollText, Send, FlaskConical, Quote, Users, Palette, Wand2, UserCheck, CalendarDays, Trophy, AtSign, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useTheme } from "@/lib/theme";
import { useSidebarCounts } from "@/components/sidebar/SidebarBadges";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  label: string;
  url: string;
  icon: any;
  badgeKey?: "pendingTasks" | "pendingAssets";
}

const mainNav: NavItem[] = [
  { label: "Dashboard", url: "/", icon: Home },
  { label: "Ideas", url: "/ideas", icon: Lightbulb },
  { label: "Briefs", url: "/briefs", icon: ScrollText },
  { label: "Episodios", url: "/episodes", icon: Mic },
  { label: "Biblioteca", url: "/library", icon: FolderOpen, badgeKey: "pendingAssets" },
];

const productionNav: NavItem[] = [
  { label: "Fábrica", url: "/factory", icon: Factory },
  { label: "Templates", url: "/templates", icon: FileStack },
  { label: "Publicaciones", url: "/publications", icon: Send },
  { label: "Citas", url: "/quotes", icon: Quote },
  { label: "Invitados", url: "/guests", icon: UserCheck },
  { label: "Calendario", url: "/calendar", icon: CalendarDays },
  { label: "Cuentas", url: "/accounts", icon: Users },
];

const systemNav: NavItem[] = [
  { label: "Insights", url: "/insights", icon: FlaskConical },
  { label: "Menciones", url: "/mentions", icon: AtSign },
  { label: "Scorecard", url: "/scorecard", icon: Trophy },
  { label: "Métricas", url: "/metrics", icon: BarChart3 },
  { label: "Tareas", url: "/tasks", icon: ListTodo, badgeKey: "pendingTasks" },
  { label: "Marca", url: "/brand", icon: Palette },
  { label: "Prompts", url: "/prompt-builder", icon: Wand2 },
  { label: "Sistema", url: "/system", icon: Settings },
  { label: "Recursos", url: "/resources", icon: FileText },
  { label: "Importar", url: "/import", icon: Upload },
];

function NavGroup({ label, items, collapsed, counts }: { label: string; items: NavItem[]; collapsed: boolean; counts?: Record<string, number> }) {
  const location = useLocation();
  return (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-medium">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = location.pathname === item.url || (item.url !== "/" && location.pathname.startsWith(item.url));
            const badgeCount = item.badgeKey && counts ? counts[item.badgeKey] : 0;
            return (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <NavLink to={item.url} end={item.url === "/"} activeClassName="bg-sidebar-accent text-sidebar-primary-foreground font-medium">
                    <item.icon className="h-4 w-4" />
                    {!collapsed && (
                      <span className="flex-1 flex items-center justify-between">
                        <span>{item.label}</span>
                        {badgeCount > 0 && (
                          <span className="ml-auto text-[10px] font-medium bg-primary/15 text-primary px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {badgeCount}
                          </span>
                        )}
                      </span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { data: counts } = useSidebarCounts();
  const { theme, toggle } = useTheme();

  const countsMap = counts ? { pendingTasks: counts.pendingTasks, pendingAssets: counts.pendingAssets } : undefined;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-display font-bold text-sm">A</span>
        </div>
        {!collapsed && (
          <span className="font-display font-bold text-sidebar-primary-foreground text-lg tracking-tight">
            AMTME OS
          </span>
        )}
      </div>

      <SidebarContent>
        <NavGroup label="Principal" items={mainNav} collapsed={collapsed} counts={countsMap} />
        <NavGroup label="Producción" items={productionNav} collapsed={collapsed} counts={countsMap} />
        <NavGroup label="Sistema" items={systemNav} collapsed={collapsed} counts={countsMap} />
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 pb-4 space-y-1">
          <button
            onClick={toggle}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!collapsed && <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>}
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
          {!collapsed && <p className="text-xs text-sidebar-foreground/50 font-display px-1">energy / amtme</p>}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
