import { useEffect, useState } from "react";
import { Outlet, useRouterState, Navigate } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Crest } from "@/components/crest";
import { CommandPalette } from "@/components/command-palette";
import { ProjectDialog } from "@/components/dialogs/project-dialog";
import { ReportDialog } from "@/components/dialogs/report-dialog";
import { TaskDialog } from "@/components/dialogs/task-dialog";
import { ProfileDialog } from "@/components/dialogs/profile-dialog";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useHub } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const collapsed = useHub((s) => s.sidebarCollapsed);
  const dark = useHub((s) => s.dark);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    void Promise.resolve(useHub.persist.rehydrate()).then(() => {
      useHub.getState().setHydrated();
      document.documentElement.classList.toggle("dark", useHub.getState().dark);
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Handle /login route
  if (pathname === "/login") {
    // If already authenticated and not pending, redirect to home
    if (user && !isPending) {
      return <Navigate to="/" />;
    }

    return (
      <TooltipProvider delayDuration={200}>
        <main className="min-h-screen bg-bg text-ink">
          <Outlet />
        </main>
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "bg-navy text-navy-fg border-white/10",
              title: "text-navy-fg",
              description: "text-navy-muted",
            },
          }}
        />
      </TooltipProvider>
    );
  }

  // Session still loading: show sleek crest loading screen (prevents flash)
  if (isPending) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
        <Crest className="h-12 w-12 animate-pulse mb-3" />
        <p className="text-xs font-mono text-slate-400">Authenticating session...</p>
      </div>
    );
  }

  // Definite unauthenticated access to any protected route: redirect to /login
  if (!user) {
    return <Navigate to="/login" search={{ redirect: pathname }} />;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen bg-bg text-ink">
        <div className={cn("sticky top-0 hidden h-screen shrink-0 lg:block", collapsed ? "w-[72px]" : "w-[240px]")}>
          <Sidebar collapsed={collapsed} />
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[240px] bg-navy p-0 text-navy-fg [&>button]:text-navy-fg">
            <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} className="h-full w-full" />
          </SheetContent>
        </Sheet>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setMobileOpen(true)} />
          <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-5 sm:px-5 lg:px-6">
            <Outlet />
          </main>
        </div>
      </div>
      <CommandPalette />
      <ReportDialog />
      <ProjectDialog />
      <TaskDialog />
      <ProfileDialog />
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "bg-navy text-navy-fg border-white/10",
            title: "text-navy-fg",
            description: "text-navy-muted",
          },
        }}
      />
    </TooltipProvider>
  );
}
