import { z } from "zod";

export const RoleSchema = z.enum(["super_admin", "faculty", "lead", "member"]);
export const PresenceSchema = z.enum(["active", "review", "offline"]);
export const ProjectStatusSchema = z.enum(["healthy", "at_risk", "delayed", "planning"]);
export const TaskPrioritySchema = z.enum(["high", "medium", "low"]);
export const TaskStatusSchema = z.enum(["todo", "in_progress", "blocked", "review", "done"]);
export const ReportStatusSchema = z.enum(["draft", "submitted", "approved", "revision"]);
export const DocKindSchema = z.enum(["prd", "trd", "arch", "spec", "other"]);
export const NotifKindSchema = z.enum(["alert", "review", "mention", "system"]);

// Profile / Team schemas
export const UpdateProfileRoleSchema = z.object({
  userId: z.string().min(1),
  role: RoleSchema,
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(100).optional(),
  title: z.string().max(100).optional(),
  dept: z.string().max(100).optional(),
  year: z.string().max(20).optional().nullable(),
  registration_no: z.string().max(50).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  college: z.string().max(150).optional().nullable(),
  skills: z.string().max(500).optional().nullable(),
  linkedin_url: z
    .string()
    .url("Must be a valid URL")
    .regex(/^https:\/\/(www\.)?linkedin\.com\/.+/i, "Must be a valid LinkedIn profile URL (https://linkedin.com/in/...)")
    .optional()
    .or(z.literal(""))
    .nullable(),
  github_url: z
    .string()
    .url("Must be a valid URL")
    .regex(/^https:\/\/(www\.)?github\.com\/.+/i, "Must be a valid GitHub profile URL")
    .optional()
    .or(z.literal(""))
    .nullable(),
  portfolio_url: z.string().url("Must be a valid URL").optional().or(z.literal("")).nullable(),
  location: z.string().max(100).optional().nullable(),
  presence: PresenceSchema.optional(),
  avatar_url: z.string().url("Must be a valid URL").optional().or(z.literal("")).nullable(),
});

export const PresignAvatarSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024, "Avatar file size must be less than 5MB"),
  fileName: z.string().min(1).max(100),
});

export const CreateUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100),
  role: RoleSchema.default("member"),
  title: z.string().max(100).default("Member"),
  dept: z.string().max(100).default("ECE / CSE"),
  year: z.string().max(20).optional().nullable(),
  registration_no: z.string().max(50).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  college: z.string().max(150).optional().nullable(),
});

export const ResetUserPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const UpdateUserSettingsSchema = z.object({
  dark_mode: z.boolean().optional(),
  sidebar_collapsed: z.boolean().optional(),
  email_notifications: z.boolean().optional(),
  in_app_notifications: z.boolean().optional(),
});

// Project schemas
export const CreateProjectSchema = z.object({
  code: z.string().min(2).max(20).regex(/^[A-Z0-9_-]+$/i, "Invalid code format"),
  name: z.string().min(2).max(100),
  subtitle: z.string().max(150).default(""),
  status: ProjectStatusSchema.default("planning"),
  progress: z.number().int().min(0).max(100).default(0),
  leadId: z.string().min(1),
  facultyId: z.string().min(1),
  targetDate: z.string().default(""),
  targetNote: z.string().default(""),
  abstract: z.string().max(2000).default(""),
  repoUrl: z.string().max(255).default(""),
  previewUrl: z.string().url().optional().or(z.literal("")),
  cycle: z.string().default("Sprint 01"),
  stack: z.array(z.object({ name: z.string(), note: z.string() })).default([]),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

// Task schemas
export const CreateTaskSchema = z.object({
  code: z.string().min(2).max(20),
  title: z.string().min(2).max(250),
  projectId: z.string().min(1),
  assigneeId: z.string().min(1),
  priority: TaskPrioritySchema.default("medium"),
  status: TaskStatusSchema.default("todo"),
  progress: z.number().int().min(0).max(100).default(0),
  dueAt: z.string().default(""),
  dueLabel: z.string().default(""),
  branch: z.string().max(100).optional(),
  blocker: z.string().max(300).optional(),
  pages: z.string().max(100).optional(),
  subtasks: z.array(z.object({ title: z.string().min(1), done: z.boolean().default(false) })).default([]),
});

export const UpdateTaskStatusSchema = z.object({
  taskId: z.string().min(1),
  status: TaskStatusSchema,
  progress: z.number().int().min(0).max(100).optional(),
  blocker: z.string().max(300).optional().nullable(),
});

export const ToggleSubtaskSchema = z.object({
  taskId: z.string().min(1),
  subtaskId: z.string().min(1),
  done: z.boolean(),
});

// Daily Report schemas
export const SubmitDailyReportSchema = z.object({
  projectId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  hours: z.number().min(0).max(24),
  completed: z.string().min(5, "Accomplishments must be at least 5 characters").max(5000),
  next: z.string().max(5000).default(""),
  blockers: z.string().max(2000).default(""),
  progress: z.number().int().min(0).max(100).default(0),
  prUrl: z.string().url("Invalid PR URL").optional().or(z.literal("")),
  attachment: z.string().max(255).optional(),
  taskCodes: z.array(z.string()).default([]),
});

export const ReviewReportSchema = z.object({
  reportId: z.string().min(1),
  status: z.enum(["approved", "revision"]),
  feedback: z.string().max(2000).default(""),
});

const DANGEROUS_EXTENSIONS = /\.(exe|bat|cmd|sh|bin|dll|so|msi|vbs|ps1)$/i;

// Document schemas
export const PresignUploadSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(255).refine((n) => !DANGEROUS_EXTENSIONS.test(n), {
    message: "Executable and script file extensions are prohibited",
  }),
  kind: DocKindSchema.default("other"),
  mimeType: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
    "image/svg+xml",
    "text/plain",
    "text/markdown",
  ] as const, { message: "Unsupported file type. Only PDF, Office documents, text, and images are permitted." }),
  sizeBytes: z.number().int().positive().max(25 * 1024 * 1024, "Max file size is 25MB"),
});

export const CompleteDocumentUploadSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  kind: DocKindSchema,
  storagePath: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  mimeType: z.string().min(1),
  version: z.string().default("v1.0"),
});

// Chat schemas
export const SendChatMessageSchema = z.object({
  channelId: z.string().min(1),
  body: z.string().min(1).max(4000),
});

// Calendar schemas
export const CreateCalendarEventSchema = z.object({
  projectId: z.string().optional().nullable(),
  title: z.string().min(2).max(200),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().default(""),
  place: z.string().max(200).default(""),
  kind: z.enum(["review", "standup", "deadline", "lab"]).default("standup"),
});
