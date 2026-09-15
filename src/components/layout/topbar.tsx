import { Bell, Menu, Moon, Plus, Search, Sun, Upload, User, LogOut, Edit } from "lucide-react";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { PersonAvatar } from "@/components/person-avatar";
import { signOut } from "@/lib/auth/client";
import { useHub } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useMeQuery,
} from "@/lib/api-hooks";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { Person } from "@/lib/types";

const crumbs: Record<string, string[]> = {
  "/": ["Ops", "Command Center"],
  "/workspace": ["Workspace", "My Desk"],
  "/tasks": ["Workspace", "Tasks"],
  "/reports": ["Workspace", "Daily Reports"],
  "/projects": ["Collaboration", "Projects"],
  "/team": ["Collaboration", "Directory"],
  "/chat": ["Collaboration", "Chat"],
  "/documents": ["Collaboration", "Documents"],
  "/calendar": ["Collaboration", "Calendar"],
  "/analytics": ["Management", "Analytics"],
  "/reviews": ["Management", "Reviews"],
  "/admin/users": ["Management", "Users"],
  "/admin/audit": ["Management", "Audit"],
  "/settings": ["Account", "Settings"],
};

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const dark = useHub((s) => s.dark);
  const toggleDark = useHub((s) => s.toggleDark);
  const setCommand = useHub((s) => s.setCommandOpen);
  const setReport = useHub((s) => s.setReportDialog);
  const setProject = useHub((s) => s.setProjectDialog);
  const setProfileDialog = useHub((s) => s.setProfileDialog);
  const { user: authUser } = useCurrentUserState();

  const { data: serverNotifs = [] } = useNotificationsQuery();
  const markNotificationRead = useMarkNotificationReadMutation();
  const markAllNotificationsRead = useMarkAllNotificationsReadMutation();
  const { data: meData } = useMeQuery();

  const user: Person = meData?.profile
    ? {
        id: meData.profile.user_id,
        name: meData.profile.name,
        short: meData.profile.short || meData.profile.name.slice(0, 2).toUpperCase(),
        role: meData.profile.role,
        title: meData.profile.title,
        dept: meData.profile.dept,
        email: meData.profile.email,
        presence: meData.profile.presence,
        avatar_url: meData.profile.avatar_url,
        phone: meData.profile.phone,
        bio: meData.profile.bio,
        college: meData.profile.college,
        skills: meData.profile.skills,
        linkedin_url: meData.profile.linkedin_url,
        github_url: meData.profile.github_url,
        portfolio_url: meData.profile.portfolio_url,
        location: meData.profile.location,
        projectIds: [],
        hoursThisWeek: 0,
        taskLoad: 0,
        streak: 5,
        attendance: 100,
      }
    : {
        id: authUser?.id ?? "sekhar",
        name: authUser?.displayName ?? "K. Hari Chandra Sekhar",
        short: (authUser?.displayName || "CS").slice(0, 2).toUpperCase(),
        role: "super_admin",
        title: "Admin Lead · Faculty PM",
        dept: "CSE Faculty",
        email: authUser?.primaryEmail ?? "hcskolluru@gmail.com",
        presence: "active",
        projectIds: [],
        hoursThisWeek: 0,
        taskLoad: 0,
        streak: 5,
        attendance: 100,
      };

  const unread = serverNotifs.filter((n) => !n.read).length;
  const trail = crumbs[pathname] ?? (pathname.startsWith("/projects/") ? ["Collaboration", "Project"] : ["TeamHub"]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/85 px-3 backdrop-blur-xl sm:px-5">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu />
      </Button>
      <nav className="hidden min-w-0 items-center gap-1.5 text-xs text-muted sm:flex">
        <span>TeamHub</span>
        {trail.map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span className="font-mono text-subtle">/</span>
            <span className="truncate last:font-semibold last:text-ink">{c}</span>
          </span>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => setCommand(true)}
          className="relative hidden h-9 w-56 items-center rounded-md bg-surface-2 px-2.5 text-left text-sm text-subtle transition-colors hover:bg-surface-3 md:flex"
        >
          <Search className="mr-2 h-4 w-4" />
          Search ops
          <kbd className="absolute right-2">⌘K</kbd>
        </button>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setCommand(true)} aria-label="Search">
          <Search />
        </Button>
        <div className="hidden items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1 text-[11px] text-muted lg:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Operational
        </div>
        <Button size="sm" className="hidden sm:inline-flex" onClick={() => setProject(true)}>
          <Plus /> New Project
        </Button>
        <Button size="sm" variant="secondary" className="hidden sm:inline-flex" onClick={() => setReport(true)}>
          <Upload /> Report
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell />
              {unread > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold">Notifications</span>
              <button
                className="text-xs text-accent hover:underline"
                onClick={() => markAllNotificationsRead.mutate()}
                disabled={markAllNotificationsRead.isPending || unread === 0}
              >
                Mark all read
              </button>
            </div>
            <Separator />
            <div className="max-h-80 overflow-y-auto">
              {serverNotifs.length === 0 ? (
                <p className="p-4 text-sm text-muted">You are all caught up.</p>
              ) : (
                serverNotifs.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.read) markNotificationRead.mutate(n.id);
                      if (n.href) {
                        navigate({ to: n.href as any });
                      }
                    }}
                    className={cn(
                      "block w-full border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-surface-2 transition-colors cursor-pointer",
                      !n.read && "bg-accent-soft/40",
                    )}
                  >
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="text-xs text-muted">{n.body}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-subtle">{n.at}</div>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon" onClick={toggleDark} aria-label="Toggle theme">
          {dark ? <Sun /> : <Moon />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              id="user-menu-button"
              aria-label="User profile menu"
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 cursor-pointer transition-transform hover:scale-105"
            >
              <PersonAvatar person={user} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-surface border-border shadow-xl">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none text-ink">{user.name}</p>
                <p className="text-xs leading-none text-muted truncate">{user.email}</p>
                <div className="pt-1">
                  <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface-2 text-ink uppercase">
                    {user.role.replace("_", " ")}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setProfileDialog(true, user.id)}
              className="cursor-pointer text-xs flex items-center gap-2 text-ink hover:bg-surface-2"
            >
              <User className="h-3.5 w-3.5 text-accent" />
              <span>View Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setProfileDialog(true, user.id)}
              className="cursor-pointer text-xs flex items-center gap-2 text-ink hover:bg-surface-2"
            >
              <Edit className="h-3.5 w-3.5 text-muted" />
              <span>Edit Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut("/login")}
              className="cursor-pointer text-xs text-danger flex items-center gap-2 focus:text-danger focus:bg-danger/10 hover:bg-danger/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
