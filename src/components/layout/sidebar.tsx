import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CheckCircle2,
  FileText,
  Rocket,
  Users,
  MessageSquare,
  BookOpen,
  CalendarDays,
  LineChart,
  ClipboardCheck,
  Shield,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  LogOut,
} from "lucide-react";
import { Crest } from "@/components/crest";
import { PersonAvatar } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { signOut } from "@/lib/auth/client";
import { useMeQuery } from "@/lib/api-hooks";
import { isAdminRole, useHub } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Person } from "@/lib/types";

type Item = { to: string; label: string; icon: typeof LayoutDashboard; badge?: string };

const workspace: Item[] = [
  { to: "/", label: "Command Center", icon: LayoutDashboard },
  { to: "/workspace", label: "My Desk", icon: Briefcase },
  { to: "/tasks", label: "Tasks", icon: CheckCircle2 },
  { to: "/reports", label: "Daily Reports", icon: FileText },
];

const collab: Item[] = [
  { to: "/projects", label: "Projects", icon: Rocket, badge: "6" },
  { to: "/team", label: "Team Directory", icon: Users, badge: "16" },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/documents", label: "Documents", icon: BookOpen },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
];

const management: Item[] = [
  { to: "/analytics", label: "Analytics", icon: LineChart },
  { to: "/reviews", label: "Report Reviews", icon: ClipboardCheck },
  { to: "/admin/users", label: "Users & Roles", icon: Shield },
  { to: "/admin/audit", label: "Audit Logs", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: Settings },
];

function NavLink({ item, collapsed, onNavigate }: { item: Item; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active =
    item.to === "/"
      ? pathname === "/"
      : pathname === item.to || pathname.startsWith(item.to + "/");
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-navy-mid text-navy-fg font-semibold"
          : "text-navy-muted hover:bg-navy-mid/60 hover:text-navy-fg",
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.badge ? (
            <span className="rounded bg-navy-mid px-1.5 font-mono text-[10px] text-navy-fg">{item.badge}</span>
          ) : null}
        </>
      ) : null}
    </Link>
  );
}

function Section({
  title,
  items,
  collapsed,
  onNavigate,
}: {
  title: string;
  items: Item[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-0.5">
      {!collapsed ? (
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-navy-muted">{title}</div>
      ) : (
        <div className="mx-auto my-2 h-px w-6 bg-navy-fg/10" />
      )}
      {items.map((item) => (
        <NavLink key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

export function Sidebar({
  collapsed,
  onNavigate,
  className,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const userId = useHub((s) => s.currentUserId);
  const toggle = useHub((s) => s.toggleSidebar);
  const setProfileDialog = useHub((s) => s.setProfileDialog);
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
        id: "loading",
        name: "Loading...",
        short: "RV",
        role: "member",
        title: "Team Member",
        dept: "RVIT",
        email: "",
        presence: "active",
        projectIds: [],
        hoursThisWeek: 0,
        taskLoad: 0,
        streak: 0,
        attendance: 100,
      };

  const admin = isAdminRole(user.role);

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-navy text-navy-fg",
        collapsed ? "w-[72px]" : "w-[240px]",
        className,
      )}
    >
      <div className={cn("flex h-14 items-center gap-2.5 border-b border-white/10 px-3", collapsed && "justify-center px-2")}>
        <Crest className="h-8 w-8" />
        {!collapsed ? (
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-bold leading-tight">TeamHub</div>
            <div className="truncate font-mono text-[10px] text-navy-muted">Technical Project Ops</div>
          </div>
        ) : null}
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-2.5">
          <Section title="Workspace" items={workspace} collapsed={collapsed} onNavigate={onNavigate} />
          <Section title="Collaboration" items={collab} collapsed={collapsed} onNavigate={onNavigate} />
          {admin || user.role === "lead" ? (
            <Section
              title="Management"
              items={admin ? management : management.filter((i) => i.to === "/settings" || i.to === "/reviews")}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ) : (
            <Section
              title="Account"
              items={[{ to: "/settings", label: "Settings", icon: Settings }]}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          )}
        </div>
      </ScrollArea>
      <div className="border-t border-white/10 bg-navy-mid/40 p-2.5">
        {!collapsed ? (
          <button
            type="button"
            onClick={() => setProfileDialog(true, user.id)}
            className="mb-2 flex w-full items-center justify-between rounded-md p-1.5 text-left transition-colors hover:bg-navy-mid/80 cursor-pointer group"
            title="Click to view and edit profile"
          >
            <div className="flex items-center gap-2 min-w-0">
              <PersonAvatar person={user} showPresence />
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold group-hover:text-accent-soft">{user.name}</div>
                <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-accent-soft">
                  {user.role.replace("_", " ")}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-navy-muted opacity-0 group-hover:opacity-100 transition-opacity">
              Profile
            </span>
          </button>
        ) : (
          <div className="mb-2 flex justify-center">
            <button
              type="button"
              onClick={() => setProfileDialog(true, user.id)}
              className="cursor-pointer"
              title={user.name}
            >
              <PersonAvatar person={user} showPresence />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between">
          {!collapsed ? (
            <button
              type="button"
              onClick={() => signOut("/login")}
              className="flex items-center gap-1.5 text-[11px] text-navy-muted hover:text-red-400 cursor-pointer transition-colors"
              title="Sign out of TeamHub"
            >
              <LogOut className="h-3 w-3" />
              <span>Sign out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => signOut("/login")}
              className="text-navy-muted hover:text-red-400 cursor-pointer"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
          <Button variant="ghost" size="icon-sm" className="text-navy-muted hover:bg-navy-mid hover:text-navy-fg" onClick={toggle}>
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </Button>
        </div>
      </div>
    </aside>
  );
}
