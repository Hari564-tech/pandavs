import { TaskRepository } from "@/server/repositories/task.repo";
import { NotificationRepository } from "@/server/repositories/notification.repo";
import { ActivityRepository } from "@/server/repositories/activity.repo";
import { AuditRepository } from "@/server/repositories/audit.repo";
import { getAuthContext, requireCanManageTask, requireCanUpdateTask } from "@/server/policies/rbac";
import type { TaskPriorityType, TaskStatusType } from "@/server/db/types";

export const TaskService = {
  async listTasks(filter?: {
    projectId?: string;
    assigneeId?: string;
    status?: TaskStatusType;
    priority?: TaskPriorityType;
    search?: string;
  }) {
    return TaskRepository.list(filter);
  },

  async getTask(id: string) {
    return TaskRepository.findById(id);
  },

  async createTask(
    callerUserId: string,
    data: {
      code: string;
      title: string;
      projectId: string;
      assigneeId: string;
      priority: TaskPriorityType;
      status?: TaskStatusType;
      progress?: number;
      dueAt: string;
      dueLabel: string;
      branch?: string;
      blocker?: string;
      pages?: string;
      subtasks?: { title: string; done?: boolean }[];
    },
  ) {
    const ctx = await getAuthContext(callerUserId);
    await requireCanManageTask(ctx, data.projectId);

    const id = `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const task = await TaskRepository.create({
      id,
      code: data.code,
      title: data.title,
      project_id: data.projectId,
      assignee_id: data.assigneeId,
      assigner_id: callerUserId,
      priority: data.priority,
      status: data.status ?? "todo",
      progress: data.progress ?? 0,
      due_at: data.dueAt,
      due_label: data.dueLabel,
      branch: data.branch,
      blocker: data.blocker,
      pages: data.pages,
      subtasks: data.subtasks,
    });

    // Notify assignee
    await NotificationRepository.create({
      id: `notif-${Date.now()}`,
      userId: data.assigneeId,
      kind: "alert",
      title: "New task assigned",
      body: `${data.code}: ${data.title} (${data.priority} priority)`,
      href: "/workspace",
    });

    // Operational activity
    await ActivityRepository.create({
      id: `act-${Date.now()}`,
      actorId: callerUserId,
      kind: "commit",
      text: `assigned task ${data.code} to member`,
      detail: data.title,
      projectId: data.projectId,
    });

    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "task_created",
      targetType: "task",
      targetId: id,
      metadataJson: { code: data.code, assigneeId: data.assigneeId },
    });

    return task;
  },

  async updateTaskStatus(
    callerUserId: string,
    taskId: string,
    status: TaskStatusType,
    progress?: number,
    blocker?: string | null,
  ) {
    const ctx = await getAuthContext(callerUserId);
    await requireCanUpdateTask(ctx, taskId);

    const updated = await TaskRepository.updateStatus(taskId, status, progress, blocker);

    if (status === "blocked" && blocker) {
      await ActivityRepository.create({
        id: `act-${Date.now()}`,
        actorId: callerUserId,
        kind: "blocker",
        text: `flagged blocker on ${updated?.code ?? taskId}`,
        detail: blocker,
        projectId: updated?.projectId,
      });

      // Also create notification for assigner / lead
      if (updated?.assignerId) {
        await NotificationRepository.create({
          id: `notif-${Date.now()}`,
          userId: updated.assignerId,
          kind: "alert",
          title: `Blocker on ${updated.code}`,
          body: blocker,
          href: "/tasks",
        });
      }
    } else if (status === "done") {
      await ActivityRepository.create({
        id: `act-${Date.now()}`,
        actorId: callerUserId,
        kind: "commit",
        text: `completed task ${updated?.code ?? taskId}`,
        detail: updated?.title,
        projectId: updated?.projectId,
      });
    }

    return updated;
  },

  async toggleSubtask(callerUserId: string, taskId: string, subtaskId: string, done: boolean) {
    const ctx = await getAuthContext(callerUserId);
    await requireCanUpdateTask(ctx, taskId);
    return TaskRepository.toggleSubtask(taskId, subtaskId, done);
  },
};
