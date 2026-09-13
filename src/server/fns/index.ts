import { createServerFn } from "@tanstack/react-start";
import { authMiddleware, optionalAuthMiddleware } from "@/lib/auth/middleware";
import { UserService } from "@/server/services/user.service";
import { ProjectService } from "@/server/services/project.service";
import { TaskService } from "@/server/services/task.service";
import { ReportService } from "@/server/services/report.service";
import { DocumentService } from "@/server/services/document.service";
import { ChatService } from "@/server/services/chat.service";
import { CalendarService } from "@/server/services/calendar.service";
import { NotificationService } from "@/server/services/notification.service";
import { AnalyticsService } from "@/server/services/analytics.service";
import { AdminService } from "@/server/services/admin.service";
import type { RoleType, TaskPriorityType, TaskStatusType } from "@/server/db/types";

// User & Team
export const getMeFn = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    if (!context.userId) return null;
    return UserService.getMe(context.userId);
  });

export const listTeamFn = createServerFn({ method: "GET" }).handler(async () => {
  return UserService.listTeam();
});

export const updateUserRoleFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string; role: RoleType }) => d)
  .handler(async ({ data, context }) => {
    return UserService.updateRole(context.userId, data.userId, data.role);
  });

export const updateProfileFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: {
    userId: string;
    data: {
      name?: string;
      title?: string;
      dept?: string;
      year?: string | null;
      registration_no?: string | null;
      phone?: string | null;
      bio?: string | null;
      college?: string | null;
      skills?: string | null;
      linkedin_url?: string | null;
      github_url?: string | null;
      portfolio_url?: string | null;
      location?: string | null;
      presence?: "active" | "review" | "offline";
      avatar_url?: string | null;
    };
  }) => d)
  .handler(async ({ data, context }) => {
    return UserService.updateProfile(context.userId, data.userId, data.data);
  });

export const presignAvatarUploadFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: {
    mimeType: string;
    sizeBytes: number;
    fileName: string;
  }) => d)
  .handler(async ({ data, context }) => {
    return UserService.presignAvatarUpload(context.userId, data);
  });

export const uploadAvatarFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: {
    targetUserId?: string;
    fileName: string;
    mimeType: string;
    base64: string;
  }) => d)
  .handler(async ({ data, context }) => {
    return UserService.uploadAvatarDirect(
      context.userId,
      data.targetUserId || context.userId,
      data,
    );
  });

export const createUserFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: {
    email: string;
    password: string;
    name: string;
    role: RoleType;
    title: string;
    dept: string;
    year?: string | null;
    registration_no?: string | null;
    phone?: string | null;
    college?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    return UserService.createUser(context.userId, data);
  });

export const resetUserPasswordFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string; newPassword: string }) => d)
  .handler(async ({ data, context }) => {
    return UserService.resetPassword(context.userId, data.userId, data.newPassword);
  });

export const deleteUserFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    return UserService.deleteUser(context.userId, data.userId);
  });

export const updateUserSettingsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { dark_mode?: boolean; sidebar_collapsed?: boolean }) => d)
  .handler(async ({ data, context }) => {
    return UserService.updateSettings(context.userId, data);
  });

// Projects
export const listProjectsFn = createServerFn({ method: "GET" }).handler(async () => {
  return ProjectService.listProjects();
});

export const getProjectDetailFn = createServerFn({ method: "GET" })
  .validator((projectId: string) => projectId)
  .handler(async ({ data }) => {
    return ProjectService.getProject(data);
  });

export const createProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      code: string;
      name: string;
      subtitle?: string;
      leadId: string;
      facultyId: string;
      targetDate?: string;
      targetNote?: string;
      abstract?: string;
      repoUrl?: string;
      previewUrl?: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    return ProjectService.createProject(context.userId, data);
  });

export const updateProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      projectId: string;
      data: {
        name?: string;
        code?: string;
        subtitle?: string;
        status?: "planning" | "healthy" | "at_risk" | "delayed";
        progress?: number;
        leadId?: string;
        facultyId?: string;
        targetDate?: string;
        targetNote?: string;
        abstract?: string;
        repoUrl?: string;
        previewUrl?: string;
        cycle?: string;
        stack?: { name: string; note: string }[];
        memberIds?: string[];
      };
    }) => d,
  )
  .handler(async ({ data, context }) => {
    return ProjectService.updateProject(context.userId, data.projectId, data.data);
  });

export const deleteProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { projectId: string }) => d)
  .handler(async ({ data, context }) => {
    return ProjectService.deleteProject(context.userId, data.projectId);
  });

export const addProjectMemberFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { projectId: string; userId: string; role?: "lead" | "faculty" | "member" }) => d)
  .handler(async ({ data, context }) => {
    return ProjectService.addMember(context.userId, data.projectId, data);
  });

export const removeProjectMemberFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { projectId: string; userId: string }) => d)
  .handler(async ({ data, context }) => {
    return ProjectService.removeMember(context.userId, data.projectId, data.userId);
  });

// Tasks
export const listTasksFn = createServerFn({ method: "GET" })
  .validator(
    (filter?: {
      projectId?: string;
      assigneeId?: string;
      status?: TaskStatusType;
      priority?: TaskPriorityType;
      search?: string;
    }) => filter,
  )
  .handler(async ({ data }) => {
    return TaskService.listTasks(data);
  });

export const createTaskFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      code: string;
      title: string;
      projectId: string;
      assigneeId: string;
      priority: TaskPriorityType;
      dueAt: string;
      dueLabel: string;
      subtasks?: { title: string }[];
    }) => d,
  )
  .handler(async ({ data, context }) => {
    return TaskService.createTask(context.userId, data);
  });

export const updateTaskStatusFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { taskId: string; status: TaskStatusType; progress?: number; blocker?: string | null }) => d)
  .handler(async ({ data, context }) => {
    return TaskService.updateTaskStatus(context.userId, data.taskId, data.status, data.progress, data.blocker);
  });

export const toggleSubtaskFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { taskId: string; subtaskId: string; done: boolean }) => d)
  .handler(async ({ data, context }) => {
    return TaskService.toggleSubtask(context.userId, data.taskId, data.subtaskId, data.done);
  });

// Reports & Reviews
export const listReportsFn = createServerFn({ method: "GET" })
  .validator(
    (filter?: {
      authorId?: string;
      projectId?: string;
      date?: string;
      status?: "draft" | "submitted" | "approved" | "revision";
    }) => filter,
  )
  .handler(async ({ data }) => {
    return ReportService.listReports(data);
  });

export const submitReportFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      projectId: string;
      date: string;
      hours: number;
      completed: string;
      next: string;
      blockers: string;
      progress: number;
      prUrl?: string;
      taskCodes?: string[];
    }) => d,
  )
  .handler(async ({ data, context }) => {
    return ReportService.submitReport(context.userId, data);
  });

export const reviewReportFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { reportId: string; status: "approved" | "revision"; feedback: string }) => d)
  .handler(async ({ data, context }) => {
    return ReportService.reviewReport(context.userId, data);
  });

// Documents & Files
export const listDocumentsFn = createServerFn({ method: "GET" })
  .validator((projectId?: string) => projectId)
  .handler(async ({ data }) => {
    return DocumentService.listDocuments(data);
  });

export const presignUploadFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { projectId: string; name: string; mimeType: string; sizeBytes: number }) => d)
  .handler(async ({ data, context }) => {
    return DocumentService.presignUpload(context.userId, data);
  });

export const completeUploadFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      projectId: string;
      name: string;
      kind: "prd" | "trd" | "arch" | "spec" | "other";
      storagePath: string;
      sizeBytes: number;
      mimeType: string;
      version: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    return DocumentService.completeUpload(context.userId, data);
  });

export const uploadDocumentDirectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      projectId: string;
      name: string;
      kind: "prd" | "trd" | "arch" | "spec" | "other";
      fileName: string;
      mimeType: string;
      base64: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    return DocumentService.uploadDocumentDirect(context.userId, data);
  });

export const getDocumentDownloadUrlFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((documentId: string) => documentId)
  .handler(async ({ data, context }) => {
    return DocumentService.getDownloadUrl(context.userId, data);
  });

export const deleteDocumentFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { documentId: string }) => d)
  .handler(async ({ data, context }) => {
    return DocumentService.deleteDocument(context.userId, data.documentId);
  });

// Chat
export const listChannelsFn = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    if (!context.userId) return [];
    return ChatService.listChannels(context.userId);
  });

export const listMessagesFn = createServerFn({ method: "GET" })
  .validator((channelId: string) => channelId)
  .handler(async ({ data }) => {
    return ChatService.listMessages(data);
  });

export const sendMessageFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { channelId: string; body: string }) => d)
  .handler(async ({ data, context }) => {
    return ChatService.sendMessage(context.userId, data);
  });

export const markChannelReadFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((channelId: string) => channelId)
  .handler(async ({ data, context }) => {
    return ChatService.markRead(context.userId, data);
  });

export const clearMessagesFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d?: { channelId?: string; all?: boolean }) => d)
  .handler(async ({ data, context }) => {
    return ChatService.clearMessages(context.userId, data);
  });

// Calendar
export const listCalendarEventsFn = createServerFn({ method: "GET" })
  .validator((monthPrefix?: string) => monthPrefix)
  .handler(async ({ data }) => {
    return CalendarService.listEvents(data);
  });

// Notifications
export const listNotificationsFn = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    if (!context.userId) return [];
    return NotificationService.listNotifications(context.userId);
  });

export const markNotificationReadFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ data, context }) => {
    return NotificationService.markRead(context.userId, data);
  });

export const markAllNotificationsReadFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return NotificationService.markAllRead(context.userId);
  });

export const pingMemberFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((targetUserId: string) => targetUserId)
  .handler(async ({ data, context }) => {
    return NotificationService.pingMember(context.userId, data);
  });

export const pingAllPendingFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((pendingIds: string[]) => pendingIds)
  .handler(async ({ data, context }) => {
    return NotificationService.pingAllPending(context.userId, data);
  });

export const sendReminderFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: { targetUserId: string; title: string; body: string; href?: string }) => d,
  )
  .handler(async ({ data, context }) => {
    return NotificationService.sendReminder(context.userId, data);
  });

// Analytics & Admin
export const getDashboardAnalyticsFn = createServerFn({ method: "GET" }).handler(async () => {
  return AnalyticsService.getDashboardAnalytics();
});

export const listAuditLogsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((filter?: { actorId?: string; action?: string; limit?: number; offset?: number }) => filter)
  .handler(async ({ data, context }) => {
    return AdminService.listAuditLogs(context.userId, data);
  });
