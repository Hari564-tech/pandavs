import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ChatMessage,
  Notification,
  Project,
  ProjectStatus,
  Report,
  Task,
  TaskStatus,
} from "./types";
import {
  ACTIVITY,
  MESSAGES,
  NOTIFICATIONS,
  PEOPLE,
  PROJECTS,
  REPORTS,
  TASKS,
  TODAY,
} from "./seed";

type HubState = {
  currentUserId: string;
  dark: boolean;
  sidebarCollapsed: boolean;
  commandOpen: boolean;
  reportDialogOpen: boolean;
  projectDialogOpen: boolean;
  taskDialogOpen: boolean;
  profileDialogOpen: boolean;
  profileTargetUserId: string | null;
  notifOpen: boolean;
  hydrated: boolean;
  pinged: string[];
  tasks: Task[];
  reports: Report[];
  projects: Project[];
  messages: ChatMessage[];
  notifications: Notification[];
  setHydrated: () => void;
  setUser: (id: string) => void;
  toggleDark: () => void;
  toggleSidebar: () => void;
  setCommandOpen: (v: boolean) => void;
  setReportDialog: (v: boolean) => void;
  setProjectDialog: (v: boolean) => void;
  setTaskDialog: (v: boolean) => void;
  setProfileDialog: (open: boolean, userId?: string | null) => void;
  setNotifOpen: (v: boolean) => void;
  pingMember: (id: string) => void;
  pingAllPending: (ids: string[]) => void;
  toggleSubtask: (taskId: string, subId: string) => void;
  setTaskProgress: (taskId: string, progress: number) => void;
  setTaskStatus: (taskId: string, status: TaskStatus, blocker?: string) => void;
  addTask: (task: Task) => void;
  addProject: (project: Project) => void;
  submitReport: (report: Omit<Report, "id" | "status" | "submittedAt">) => void;
  reviewReport: (id: string, status: "approved" | "revision", feedback: string) => void;
  sendMessage: (channelId: string, body: string) => void;
  markAllNotifsRead: () => void;
  markNotifRead: (id: string) => void;
};

function applyDark(dark: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", dark);
}

export const useHub = create<HubState>()(
  persist(
    (set, get) => ({
      currentUserId: "sekhar",
      dark: false,
      sidebarCollapsed: false,
      commandOpen: false,
      reportDialogOpen: false,
      projectDialogOpen: false,
      taskDialogOpen: false,
      profileDialogOpen: false,
      profileTargetUserId: null,
      notifOpen: false,
      hydrated: false,
      pinged: [],
      tasks: TASKS,
      reports: REPORTS,
      projects: PROJECTS,
      messages: MESSAGES,
      notifications: NOTIFICATIONS,
      setHydrated: () => set({ hydrated: true }),
      setUser: (id) => set({ currentUserId: id }),
      toggleDark: () => {
        const dark = !get().dark;
        applyDark(dark);
        set({ dark });
      },
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setCommandOpen: (v) => set({ commandOpen: v }),
      setReportDialog: (v) => set({ reportDialogOpen: v }),
      setProjectDialog: (v) => set({ projectDialogOpen: v }),
      setTaskDialog: (v) => set({ taskDialogOpen: v }),
      setProfileDialog: (open, userId = null) =>
        set({ profileDialogOpen: open, profileTargetUserId: userId }),
      setNotifOpen: (v) => set({ notifOpen: v }),
      pingMember: (id) =>
        set((s) => ({
          pinged: s.pinged.includes(id) ? s.pinged : [...s.pinged, id],
          notifications: [
            {
              id: `ping-${id}-${Date.now()}`,
              kind: "alert",
              title: "Ping sent",
              body: `${PEOPLE.find((p) => p.id === id)?.name ?? "Member"} reminded to file today's report.`,
              at: "Just now",
              href: "/reviews",
              read: false,
            },
            ...s.notifications,
          ],
        })),
      pingAllPending: (ids) =>
        set((s) => ({
          pinged: Array.from(new Set([...s.pinged, ...ids])),
        })),
      toggleSubtask: (taskId, subId) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== taskId) return t;
            const subtasks = t.subtasks.map((st) =>
              st.id === subId ? { ...st, done: !st.done } : st,
            );
            const done = subtasks.filter((st) => st.done).length;
            const progress =
              subtasks.length === 0 ? t.progress : Math.round((done / subtasks.length) * 100);
            return { ...t, subtasks, progress };
          }),
        })),
      setTaskProgress: (taskId, progress) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, progress } : t)),
        })),
      setTaskStatus: (taskId, status, blocker) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status,
                  blocker: status === "blocked" ? blocker ?? t.blocker : undefined,
                  progress: status === "done" ? 100 : t.progress,
                }
              : t,
          ),
        })),
      addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
      addProject: (project) => set((s) => ({ projects: [...s.projects, project] })),
      submitReport: (report) =>
        set((s) => {
          const existing = s.reports.find((r) => r.authorId === report.authorId && r.date === report.date);
          const next: Report = {
            ...report,
            id: existing?.id ?? `r-${report.authorId}-${report.date}`,
            status: "submitted",
            submittedAt: new Date().toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }) + " IST",
          };
          const reports = existing
            ? s.reports.map((r) => (r.id === existing.id ? next : r))
            : [next, ...s.reports];
          return { reports, reportDialogOpen: false };
        }),
      reviewReport: (id, status, feedback) =>
        set((s) => ({
          reports: s.reports.map((r) => (r.id === id ? { ...r, status, feedback } : r)),
        })),
      sendMessage: (channelId, body) =>
        set((s) => ({
          messages: [
            ...s.messages,
            {
              id: `m-${Date.now()}`,
              channelId,
              authorId: s.currentUserId,
              body,
              at: new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }),
            },
          ],
        })),
      markAllNotifsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),
      markNotifRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
    }),
    {
      name: "teamhub-ops-v1",
      partialize: (s) => ({
        currentUserId: s.currentUserId,
        dark: s.dark,
        sidebarCollapsed: s.sidebarCollapsed,
        pinged: s.pinged,
      }),
      skipHydration: true,
    },
  ),
);

export function personById(id: string) {
  return PEOPLE.find((p) => p.id === id);
}

export function projectById(id: string, projects = useHub.getState().projects) {
  return projects.find((p) => p.id === id);
}

export function isAdminRole(role: string) {
  return role === "super_admin" || role === "faculty";
}

export function statusTone(status: ProjectStatus | TaskStatus | string) {
  if (status === "healthy" || status === "done" || status === "approved" || status === "active")
    return "success";
  if (status === "at_risk" || status === "review" || status === "revision" || status === "planning")
    return "warn";
  if (status === "delayed" || status === "blocked" || status === "high") return "danger";
  return "neutral";
}

export { PEOPLE, ACTIVITY, TODAY };
