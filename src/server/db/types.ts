import type { ColumnType } from "kysely";

export type RoleType = "super_admin" | "faculty" | "lead" | "member";
export type PresenceType = "active" | "review" | "offline";
export type ProjectStatusType = "healthy" | "at_risk" | "delayed" | "planning";
export type TaskPriorityType = "high" | "medium" | "low";
export type TaskStatusType = "todo" | "in_progress" | "blocked" | "review" | "done";
export type ReportStatusType = "draft" | "submitted" | "approved" | "revision";
export type DocKindType = "prd" | "trd" | "arch" | "spec" | "other";
export type NotifKindType = "alert" | "review" | "mention" | "system";
export type ActivityKindType = "approve" | "commit" | "report" | "blocker" | "comment" | "ping" | "upload";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string | undefined>;
type NullableTimestamp = ColumnType<Date | null, Date | string | null | undefined, Date | string | null | undefined>;

export interface UserTable {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SessionTable {
  id: string;
  expiresAt: Date;
  token: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string;
}

export interface AccountTable {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  password: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface VerificationTable {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProfilesTable {
  id: string;
  user_id: string;
  name: string;
  short: string;
  email: string;
  role: RoleType;
  title: string;
  dept: string;
  year: string | null;
  registration_no: string | null;
  presence: PresenceType;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  college: string | null;
  skills: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  location: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface UserSettingsTable {
  user_id: string;
  dark_mode: boolean;
  sidebar_collapsed: boolean;
  email_notifications: boolean;
  in_app_notifications: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ProjectsTable {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  status: ProjectStatusType;
  progress: number;
  lead_id: string;
  faculty_id: string;
  target_date: string;
  target_note: string;
  abstract: string;
  repo_url: string;
  preview_url: string | null;
  cycle: string;
  stack_json: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ProjectMembersTable {
  project_id: string;
  user_id: string;
  member_role: "lead" | "faculty" | "member";
  created_at: Timestamp;
}

export interface MilestonesTable {
  id: string;
  project_id: string;
  title: string;
  detail: string;
  status: "done" | "active" | "planned";
  date: string;
  score: string | null;
  meta: string;
  blocker: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TasksTable {
  id: string;
  code: string;
  title: string;
  project_id: string;
  assignee_id: string;
  assigner_id: string;
  priority: TaskPriorityType;
  status: TaskStatusType;
  progress: number;
  due_at: string;
  due_label: string;
  branch: string | null;
  blocker: string | null;
  pages: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SubtasksTable {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  position: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface DailyReportsTable {
  id: string;
  author_id: string;
  project_id: string;
  report_date: string;
  hours: number;
  completed: string;
  next_steps: string;
  blockers: string;
  progress: number;
  status: ReportStatusType;
  pr_url: string | null;
  attachment: string | null;
  submitted_at: NullableTimestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ReportTasksTable {
  report_id: string;
  task_id: string;
}

export interface ReportReviewsTable {
  id: string;
  report_id: string;
  reviewer_id: string;
  status: "approved" | "revision";
  feedback: string;
  reviewed_at: Timestamp;
  created_at: Timestamp;
}

export interface DocumentsTable {
  id: string;
  project_id: string;
  name: string;
  kind: DocKindType;
  current_version_id: string | null;
  created_by: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface DocumentVersionsTable {
  id: string;
  document_id: string;
  version: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string;
  uploaded_by: string;
  created_at: Timestamp;
}

export interface ChannelsTable {
  id: string;
  project_id: string | null;
  name: string;
  topic: string;
  created_at: Timestamp;
}

export interface MessagesTable {
  id: string;
  channel_id: string;
  author_id: string;
  body: string;
  created_at: Timestamp;
  edited_at: NullableTimestamp;
}

export interface MessageReadsTable {
  channel_id: string;
  user_id: string;
  last_read_at: Timestamp;
}

export interface CalendarEventsTable {
  id: string;
  project_id: string | null;
  title: string;
  event_date: string;
  start_time: string;
  place: string;
  kind: "review" | "standup" | "deadline" | "lab";
  created_by: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface NotificationsTable {
  id: string;
  user_id: string;
  kind: NotifKindType;
  title: string;
  body: string;
  href: string;
  read_at: NullableTimestamp;
  created_at: Timestamp;
}

export interface ActivityTable {
  id: string;
  actor_id: string;
  kind: ActivityKindType;
  text: string;
  detail: string | null;
  project_id: string | null;
  created_at: Timestamp;
}

export interface AuditLogsTable {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata_json: unknown;
  ip_hash: string;
  created_at: Timestamp;
}

export interface Database {
  user: UserTable;
  session: SessionTable;
  account: AccountTable;
  verification: VerificationTable;
  profiles: ProfilesTable;
  user_settings: UserSettingsTable;
  projects: ProjectsTable;
  project_members: ProjectMembersTable;
  milestones: MilestonesTable;
  tasks: TasksTable;
  subtasks: SubtasksTable;
  daily_reports: DailyReportsTable;
  report_tasks: ReportTasksTable;
  report_reviews: ReportReviewsTable;
  documents: DocumentsTable;
  document_versions: DocumentVersionsTable;
  channels: ChannelsTable;
  messages: MessagesTable;
  message_reads: MessageReadsTable;
  calendar_events: CalendarEventsTable;
  notifications: NotificationsTable;
  activity: ActivityTable;
  audit_logs: AuditLogsTable;
}
