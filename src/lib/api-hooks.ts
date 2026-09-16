import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeUploadFn,
  createProjectFn,
  updateProjectFn,
  deleteProjectFn,
  addProjectMemberFn,
  removeProjectMemberFn,
  createTaskFn,
  getDashboardAnalyticsFn,
  getDocumentDownloadUrlFn,
  deleteDocumentFn,
  getMeFn,
  getProjectDetailFn,
  listAuditLogsFn,
  listCalendarEventsFn,
  listChannelsFn,
  listDocumentsFn,
  listMessagesFn,
  listNotificationsFn,
  listProjectsFn,
  listReportsFn,
  listTasksFn,
  listTeamFn,
  markAllNotificationsReadFn,
  markChannelReadFn,
  markNotificationReadFn,
  pingAllPendingFn,
  pingMemberFn,
  presignAvatarUploadFn,
  presignUploadFn,
  resetUserPasswordFn,
  reviewReportFn,
  sendReminderFn,
  sendMessageFn,
  submitReportFn,
  getDailyReportFn,
  updateDailyReportFn,
  toggleSubtaskFn,
  updateProfileFn,
  updateTaskStatusFn,
  updateUserRoleFn,
  updateUserSettingsFn,
  createUserFn,
  deleteUserFn,
  uploadAvatarFn,
  uploadDocumentDirectFn,
  clearMessagesFn,
} from "@/server/fns";
import type { RoleType, TaskPriorityType, TaskStatusType } from "@/server/db/types";

// User & Team
export function useMeQuery() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
    staleTime: 30000,
  });
}

export function useTeamQuery() {
  return useQuery({
    queryKey: ["team"],
    queryFn: () => listTeamFn(),
    staleTime: 60000,
  });
}

export function useUpdateProfileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateProfileFn>[0]["data"]) => updateProfileFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

export function usePresignAvatarUploadMutation() {
  return useMutation({
    mutationFn: (data: Parameters<typeof presignAvatarUploadFn>[0]["data"]) =>
      presignAvatarUploadFn({ data }),
  });
}

export function useUploadAvatarMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof uploadAvatarFn>[0]["data"]) => uploadAvatarFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

export function useCreateUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createUserFn>[0]["data"]) => createUserFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      qc.invalidateQueries({ queryKey: ["audit_logs"] });
    },
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (data: Parameters<typeof resetUserPasswordFn>[0]["data"]) =>
      resetUserPasswordFn({ data }),
  });
}

export function useDeleteUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof deleteUserFn>[0]["data"]) => deleteUserFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      qc.invalidateQueries({ queryKey: ["audit_logs"] });
    },
  });
}

export function useUpdateUserRoleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; role: RoleType }) => updateUserRoleFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["audit_logs"] });
    },
  });
}

export function useUpdateSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { dark_mode?: boolean; sidebar_collapsed?: boolean }) => updateUserSettingsFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

// Projects
export function useProjectsQuery() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjectsFn(),
    staleTime: 60000,
  });
}

export function useProjectDetailQuery(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => getProjectDetailFn({ data: projectId }),
    enabled: Boolean(projectId),
  });
}

export function useCreateProjectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createProjectFn>[0]["data"]) => createProjectFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard_analytics"] });
      qc.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

export function useUpdateProjectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateProjectFn>[0]["data"]) => updateProjectFn({ data }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      if (vars?.projectId) {
        qc.invalidateQueries({ queryKey: ["projects", vars.projectId] });
      }
      qc.invalidateQueries({ queryKey: ["dashboard_analytics"] });
    },
  });
}

export function useDeleteProjectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof deleteProjectFn>[0]["data"]) => deleteProjectFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard_analytics"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useAddProjectMemberMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof addProjectMemberFn>[0]["data"]) =>
      addProjectMemberFn({ data }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["projects", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

export function useRemoveProjectMemberMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof removeProjectMemberFn>[0]["data"]) =>
      removeProjectMemberFn({ data }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["projects", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

// Tasks
export function useTasksQuery(filter?: {
  projectId?: string;
  assigneeId?: string;
  status?: TaskStatusType;
  priority?: TaskPriorityType;
  search?: string;
}) {
  return useQuery({
    queryKey: ["tasks", filter],
    queryFn: () => listTasksFn({ data: filter }),
    staleTime: 10000,
  });
}

export function useCreateTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createTaskFn>[0]["data"]) => createTaskFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard_analytics"] });
    },
  });
}

export function useUpdateTaskStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { taskId: string; status: TaskStatusType; progress?: number; blocker?: string | null }) =>
      updateTaskStatusFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard_analytics"] });
    },
  });
}

export function useToggleSubtaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { taskId: string; subtaskId: string; done: boolean }) => toggleSubtaskFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// Reports & Reviews
export function useReportsQuery(filter?: {
  authorId?: string;
  projectId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: "draft" | "submitted" | "approved" | "revision";
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["reports", filter],
    queryFn: () => listReportsFn({ data: filter }),
    staleTime: 10000,
  });
}

export function useDailyReportQuery(date: string, projectId?: string, authorId?: string, enabled = true) {
  return useQuery({
    queryKey: ["daily_report", { date, projectId, authorId }],
    queryFn: () => getDailyReportFn({ data: { date, projectId, authorId } }),
    enabled: enabled && Boolean(date),
    staleTime: 10000,
  });
}

export function useSubmitReportMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof submitReportFn>[0]["data"]) => submitReportFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["daily_report"] });
      qc.invalidateQueries({ queryKey: ["dashboard_analytics"] });
    },
  });
}

export function useUpdateDailyReportMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateDailyReportFn>[0]["data"]) => updateDailyReportFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["daily_report"] });
      qc.invalidateQueries({ queryKey: ["dashboard_analytics"] });
    },
  });
}

export function useReviewReportMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { reportId: string; status: "approved" | "revision"; feedback: string }) =>
      reviewReportFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["dashboard_analytics"] });
    },
  });
}

// Documents
export function useDocumentsQuery(projectId?: string) {
  return useQuery({
    queryKey: ["documents", projectId],
    queryFn: () => listDocumentsFn({ data: projectId }),
  });
}

export function usePresignUploadMutation() {
  return useMutation({
    mutationFn: (data: { projectId: string; name: string; mimeType: string; sizeBytes: number }) =>
      presignUploadFn({ data }),
  });
}

export function useCompleteUploadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof completeUploadFn>[0]["data"]) => completeUploadFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useUploadDocumentDirectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof uploadDocumentDirectFn>[0]["data"]) =>
      uploadDocumentDirectFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard_analytics"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useDeleteDocumentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof deleteDocumentFn>[0]["data"]) =>
      deleteDocumentFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard_analytics"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useDocumentDownloadUrl(documentId: string) {
  return useQuery({
    queryKey: ["document_download", documentId],
    queryFn: () => getDocumentDownloadUrlFn({ data: documentId }),
    enabled: Boolean(documentId),
  });
}

// Chat
export function useChannelsQuery() {
  return useQuery({
    queryKey: ["channels"],
    queryFn: () => listChannelsFn(),
    staleTime: 10000,
  });
}

export function useMessagesQuery(channelId: string) {
  return useQuery({
    queryKey: ["messages", channelId],
    queryFn: () => listMessagesFn({ data: channelId }),
    refetchInterval: 5000, // Poll every 5s for live conversation updates
  });
}

export function useSendMessageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { channelId: string; body: string }) => sendMessageFn({ data }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", vars.channelId] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkChannelReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) => markChannelReadFn({ data: channelId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

export function useClearMessagesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data?: { channelId?: string; all?: boolean }) => clearMessagesFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
      qc.invalidateQueries({ queryKey: ["channels"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Calendar
export function useCalendarEventsQuery(monthPrefix?: string) {
  return useQuery({
    queryKey: ["calendar_events", monthPrefix],
    queryFn: () => listCalendarEventsFn({ data: monthPrefix }),
  });
}

// Notifications
export function useNotificationsQuery() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotificationsFn(),
    refetchInterval: 5000,
  });
}

export function useMarkNotificationReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationReadFn({ data: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsReadFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function usePingMemberMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => pingMemberFn({ data: targetUserId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function usePingAllPendingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pendingIds: string[]) => pingAllPendingFn({ data: pendingIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useSendReminderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof sendReminderFn>[0]["data"]) =>
      sendReminderFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Analytics & Admin
export function useDashboardAnalyticsQuery() {
  return useQuery({
    queryKey: ["dashboard_analytics"],
    queryFn: () => getDashboardAnalyticsFn(),
    staleTime: 30000,
  });
}

export function useAuditLogsQuery(filter?: { actorId?: string; action?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["audit_logs", filter],
    queryFn: () => listAuditLogsFn({ data: filter }),
  });
}
