import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  useInactivityLogout();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar — macOS-style: thin, translucent, minimal */}
          <header className="h-11 flex items-center border-b border-border/50 sticky top-0 z-20 glass">
            <SidebarTrigger className="ml-3 h-11 w-11 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-[6px] transition-colors duration-150" />
          </header>

          {/* Main content area */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
