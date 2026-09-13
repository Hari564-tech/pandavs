export type Role = "super_admin" | "faculty" | "lead" | "member";

export type Presence = "active" | "review" | "offline";

export type ProjectStatus = "healthy" | "at_risk" | "delayed" | "planning";

export type TaskPriority = "high" | "medium" | "low";

export type TaskStatus = "todo" | "in_progress" | "blocked" | "review" | "done";

export type ReportStatus = "draft" | "submitted" | "approved" | "revision";

export type DocKind = "prd" | "trd" | "arch" | "spec" | "other";

export type NotifKind = "alert" | "review" | "mention" | "system";

export type Person = {
  id: string;
  name: string;
  short: string;
  role: Role;
  title: string;
  dept: string;
  email: string;
  presence: Presence;
  projectIds: string[];
  hoursThisWeek: number;
  taskLoad: number;
  streak: number;
  attendance: number;
  year?: string | null;
  reg?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  bio?: string | null;
  college?: string | null;
  skills?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  location?: string | null;
};

export type Project = {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  status: ProjectStatus;
  progress: number;
  leadId: string;
  facultyId: string;
  memberIds: string[];
  targetDate: string;
  targetNote: string;
  stack: { name: string; note: string }[];
  abstract: string;
  repo: string;
  preview?: string;
  cycle: string;
};

export type Subtask = { id: string; title: string; done: boolean };

export type Task = {
  id: string;
  code: string;
  title: string;
  projectId: string;
  assigneeId: string;
  assignerId: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  due: string;
  dueLabel: string;
  subtasks: Subtask[];
  branch?: string;
  blocker?: string;
  pages?: string;
};

export type Report = {
  id: string;
  authorId: string;
  projectId: string;
  date: string;
  hours: number;
  completed: string;
  next: string;
  blockers: string;
  progress: number;
  status: ReportStatus;
  prUrl?: string;
  attachment?: string;
  taskCodes: string[];
  feedback?: string;
  submittedAt?: string;
};

export type Document = {
  id: string;
  projectId: string;
  name: string;
  kind: DocKind;
  version: string;
  updatedBy: string;
  updatedAt: string;
  size: string;
  current: boolean;
};

export type Channel = {
  id: string;
  name: string;
  topic: string;
  unread: number;
};

export type ChatMessage = {
  id: string;
  channelId: string;
  authorId: string;
  body: string;
  at: string;
  createdAt?: string;
};

export type Activity = {
  id: string;
  kind: "approve" | "commit" | "report" | "blocker" | "comment" | "ping" | "upload";
  actorId: string;
  text: string;
  detail?: string;
  at: string;
};

export type Notification = {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  at: string;
  href: string;
  read: boolean;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  place: string;
  kind: "review" | "standup" | "deadline" | "lab";
};

export type AuditEntry = {
  id: string;
  actorId: string;
  action: string;
  target: string;
  at: string;
  ip: string;
};

export type Milestone = {
  id: string;
  projectId: string;
  title: string;
  detail: string;
  status: "done" | "active" | "planned";
  date: string;
  score?: string;
  meta: string;
  blocker?: string;
};
