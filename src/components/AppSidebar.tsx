import {
  Home, Mic, Factory, BarChart3, ListTodo, LogOut,
  Lightbulb, Send, FlaskConical, Users, Sun, Moon,
  AudioWaveform, BookOpen, StickyNote, Layers, DollarSign,
  CalendarDays,
} from "lucide-react";
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
  { label: "Dashboard",   url: "/",         icon: Home },
  { label: "Ideas",       url: "/ideas",    icon: Lightbulb },
  { label: "Episodios",   url: "/episodes", icon: Mic },
  { label: "Temporadas",  url: "/seasons",  icon: Layers },
  { label: "Fábrica",     url: "/factory",  icon: Factory },
];

const distributeNav: NavItem[] = [
  { label: "Publicaciones", url: "/publications", icon: Send },
  { label: "Calendario",    url: "/calendar",     icon: CalendarDays },
  { label: "Audio",         url: "/audio",        icon: AudioWaveform },
  { label: "Cuentas",       url: "/accounts",     icon: Users },
  { label: "Invitados",     url: "/guests",       icon: Users },
  { label: "Patrocinadores",url: "/sponsors",     icon: DollarSign },
  { label: "Tareas",        url: "/tasks",        icon: ListTodo, badgeKey: "pendingTasks" },
];

const measureNav: NavItem[] = [
  { label: "Métricas",  url: "/metrics",   icon: BarChart3 },
  { label: "Insights",  url: "/insights",  icon: FlaskConical },
  { label: "Knowledge", url: "/knowledge", icon: BookOpen },
  { label: "Notas",     url: "/notes",     icon: StickyNote },
];

function NavGroup({
  label,
  items,
  collapsed,
  counts,
}: {
  label: string;
  items: NavItem[];
  collapsed: boolean;
  counts?: Record<string, number>;
}) {
  const location = useLocation();

  return (
    <SidebarGroup className="px-2 py-1">
      {!collapsed && (
        <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.06em] font-semibold text-muted-foreground/50 px-2 mb-0.5 h-6">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu className="space-y-px">
          {items.map((item) => {
            const isActive =
              location.pathname === item.url ||
              (item.url !== "/" && location.pathname.startsWith(item.url));
            const badgeCount = item.badgeKey && counts ? counts[item.badgeKey] : 0;

            return (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton asChild isActive={isActive} className="p-0">
                  <NavLink
                    to={item.url}
                    end={item.url === "/"}
                    className={[
                      "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[8px]",
                      "text-sm font-medium tracking-[-0.011em]",
                      "transition-all duration-150",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
                    ].join(" ")}
                    activeClassName=""
                  >
                    <item.icon
                      className={[
                        "h-4 w-4 shrink-0",
                        isActive ? "text-primary" : "opacity-70",
                      ].join(" ")}
                    />
                    {!collapsed && (
                      <span className="flex-1 flex items-center justify-between">
                        <span>{item.label}</span>
                        {badgeCount > 0 && (
                          <span className="ml-auto text-[10px] font-semibold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
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

  const countsMap = counts
    ? { pendingTasks: counts.pendingTasks, pendingAssets: counts.pendingAssets }
    : undefined;

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border/50"
    >
      {/* Logo / wordmark */}
      <div
        className={[
          "flex items-center gap-2.5 px-4",
          collapsed ? "py-4 justify-center" : "py-4",
        ].join(" ")}
      >
        {/* App icon — minimal monogram */}
        <div className="h-7 w-7 rounded-[7px] bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-semibold text-xs tracking-tight leading-none">
            A
          </span>
        </div>
        {!collapsed && (
          <span className="font-semibold text-[15px] tracking-[-0.025em] text-foreground leading-none">
            AMTME OS
          </span>
        )}
      </div>

      {/* Nav groups */}
      <SidebarContent className="py-1">
        <NavGroup label="Crear"      items={mainNav}       collapsed={collapsed} counts={countsMap} />
        <NavGroup label="Distribuir" items={distributeNav} collapsed={collapsed} counts={countsMap} />
        <NavGroup label="Medir"      items={measureNav}    collapsed={collapsed} counts={countsMap} />
      </SidebarContent>

      {/* Footer — subtle controls */}
      <SidebarFooter className="p-2 pb-3 border-t border-sidebar-border/40 space-y-px">
        <button
          onClick={toggle}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[8px] text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all duration-150"
        >
          {theme === "dark"
            ? <Sun className="h-4 w-4 shrink-0 opacity-70" />
            : <Moon className="h-4 w-4 shrink-0 opacity-70" />
          }
          {!collapsed && (
            <span className="font-medium tracking-[-0.011em]">
              {theme === "dark" ? "Modo claro" : "Modo oscuro"}
            </span>
          )}
        </button>

        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[8px] text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0 opacity-70" />
          {!collapsed && (
            <span className="font-medium tracking-[-0.011em]">Cerrar sesión</span>
          )}
        </button>

        {!collapsed && (
          <p className="text-[11px] text-muted-foreground/40 px-2.5 pt-1 tracking-tight">
            energy / amtme
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
