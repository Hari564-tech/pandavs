import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PEOPLE, PROJECTS } from "@/lib/seed";
import { useHub } from "@/lib/store";
import { useProjectsQuery, useTasksQuery, useTeamQuery } from "@/lib/api-hooks";

const pages = [
  { label: "Command Center", to: "/" },
  { label: "My Desk", to: "/workspace" },
  { label: "Tasks", to: "/tasks" },
  { label: "Daily Reports", to: "/reports" },
  { label: "Projects", to: "/projects" },
  { label: "Team Directory", to: "/team" },
  { label: "Chat", to: "/chat" },
  { label: "Documents", to: "/documents" },
  { label: "Calendar", to: "/calendar" },
  { label: "Analytics", to: "/analytics" },
  { label: "Report Reviews", to: "/reviews" },
  { label: "Users & Roles", to: "/admin/users" },
  { label: "Audit Logs", to: "/admin/audit" },
  { label: "Settings", to: "/settings" },
];

export function CommandPalette() {
  const open = useHub((s) => s.commandOpen);
  const setOpen = useHub((s) => s.setCommandOpen);
  const { data: serverTasks } = useTasksQuery();
  const { data: serverProjects } = useProjectsQuery();
  const { data: serverTeam } = useTeamQuery();

  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const query = q.trim().toLowerCase();
  const results = useMemo(() => {
    const match = (s: string) => s.toLowerCase().includes(query);

    const peopleList = (serverTeam && serverTeam.length > 0)
      ? serverTeam.map((m) => ({ id: m.id, name: m.name, title: m.title, dept: m.dept }))
      : PEOPLE;

    const projectList = (serverProjects && serverProjects.length > 0)
      ? serverProjects.map((p) => ({ id: p.id, name: p.name, code: p.code }))
      : PROJECTS;

    const taskList = (serverTasks && serverTasks.length > 0)
      ? serverTasks.map((t) => ({ id: t.id, title: t.title, code: t.code }))
      : [];

    return {
      pages: pages.filter((p) => !query || match(p.label)),
      people: peopleList.filter((p) => !query || match(p.name) || match(p.title || "") || match(p.dept || "")),
      projects: projectList.filter((p) => !query || match(p.name) || match(p.code)),
      tasks: taskList.filter((t) => !query || match(t.title) || match(t.code)).slice(0, 6),
    };
  }, [query, serverTasks, serverProjects, serverTeam]);

  function go(to: string) {
    setOpen(false);
    router.history.push(to);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="border-b border-border p-3">
          <Input
            autoFocus
            placeholder="Jump to a page, person, project, or task"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="max-h-96 overflow-y-auto p-2 text-sm">
          <Group title="Pages">
            {results.pages.map((p) => (
              <Row key={p.to} label={p.label} hint={p.to} onClick={() => go(p.to)} />
            ))}
          </Group>
          <Group title="People">
            {results.people.slice(0, 6).map((p) => (
              <Row key={p.id} label={p.name} hint={p.title} onClick={() => go("/team")} />
            ))}
          </Group>
          <Group title="Projects">
            {results.projects.map((p) => (
              <Row key={p.id} label={p.name} hint={p.code} onClick={() => go(`/projects/${p.id}`)} />
            ))}
          </Group>
          <Group title="Tasks">
            {results.tasks.map((t) => (
              <Row key={t.id} label={t.title} hint={t.code} onClick={() => go("/tasks")} />
            ))}
          </Group>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-2">
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, hint, onClick }: { label: string; hint?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-surface-2"
    >
      <span className="truncate font-medium">{label}</span>
      {hint ? <span className="ml-3 shrink-0 font-mono text-[11px] text-subtle">{hint}</span> : null}
    </button>
  );
}
