import { getDb } from "@/server/db/kysely";
import type { TaskPriorityType, TaskStatusType } from "@/server/db/types";

export const TaskRepository = {
  async list(filter?: {
    projectId?: string;
    assigneeId?: string;
    status?: TaskStatusType;
    priority?: TaskPriorityType;
    search?: string;
  }) {
    const db = getDb();
    let query = db.selectFrom("tasks").selectAll().orderBy("due_at", "asc");

    if (filter?.projectId && filter.projectId !== "all") {
      query = query.where("project_id", "=", filter.projectId);
    }
    if (filter?.assigneeId) {
      query = query.where("assignee_id", "=", filter.assigneeId);
    }
    if (filter?.status) {
      query = query.where("status", "=", filter.status);
    }
    if (filter?.priority) {
      query = query.where("priority", "=", filter.priority);
    }
    if (filter?.search) {
      const term = `%${filter.search.toLowerCase()}%`;
      query = query.where((eb) =>
        eb.or([
          eb("title", "ilike", term),
          eb("code", "ilike", term),
        ]),
      );
    }

    const tasks = await query.execute();
    const taskIds = tasks.map((t) => t.id);

    const subtasks = taskIds.length
      ? await db
          .selectFrom("subtasks")
          .selectAll()
          .where("task_id", "in", taskIds)
          .orderBy("position", "asc")
          .execute()
      : [];

    const subtaskMap = new Map<string, typeof subtasks>();
    for (const s of subtasks) {
      const list = subtaskMap.get(s.task_id) ?? [];
      list.push(s);
      subtaskMap.set(s.task_id, list);
    }

    return tasks.map((t) => ({
      ...t,
      projectId: t.project_id,
      assigneeId: t.assignee_id,
      assignerId: t.assigner_id,
      due: t.due_at,
      dueLabel: t.due_label,
      branch: t.branch ?? undefined,
      blocker: t.blocker ?? undefined,
      pages: t.pages ?? undefined,
      subtasks: subtaskMap.get(t.id) ?? [],
    }));
  },

  async findById(id: string) {
    const db = getDb();
    const task = await db.selectFrom("tasks").selectAll().where("id", "=", id).executeTakeFirst();
    if (!task) return null;

    const subtasks = await db
      .selectFrom("subtasks")
      .selectAll()
      .where("task_id", "=", id)
      .orderBy("position", "asc")
      .execute();

    return {
      ...task,
      projectId: task.project_id,
      assigneeId: task.assignee_id,
      assignerId: task.assigner_id,
      due: task.due_at,
      dueLabel: task.due_label,
      branch: task.branch ?? undefined,
      blocker: task.blocker ?? undefined,
      pages: task.pages ?? undefined,
      subtasks,
    };
  },

  async create(data: {
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
    branch?: string | null;
    blocker?: string | null;
    pages?: string | null;
    subtasks?: { title: string; done?: boolean }[];
  }) {
    const db = getDb();
    const created = await db
      .insertInto("tasks")
      .values({
        id: data.id,
        code: data.code,
        title: data.title,
        project_id: data.project_id,
        assignee_id: data.assignee_id,
        assigner_id: data.assigner_id,
        priority: data.priority,
        status: data.status,
        progress: data.progress,
        due_at: data.due_at,
        due_label: data.due_label,
        branch: data.branch ?? null,
        blocker: data.blocker ?? null,
        pages: data.pages ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    if (data.subtasks && data.subtasks.length) {
      let pos = 0;
      for (const s of data.subtasks) {
        await db
          .insertInto("subtasks")
          .values({
            id: `sub-${data.id}-${pos + 1}`,
            task_id: data.id,
            title: s.title,
            done: s.done ?? false,
            position: pos++,
          })
          .execute();
      }
    }

    return this.findById(created.id);
  },

  async updateStatus(id: string, status: TaskStatusType, progress?: number, blocker?: string | null) {
    const db = getDb();
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date(),
    };
    if (progress !== undefined) updates.progress = progress;
    if (blocker !== undefined) updates.blocker = blocker;
    if (status === "done") updates.progress = 100;

    await db.updateTable("tasks").set(updates).where("id", "=", id).execute();
    return this.findById(id);
  },

  async toggleSubtask(taskId: string, subtaskId: string, done: boolean) {
    const db = getDb();
    await db
      .updateTable("subtasks")
      .set({ done, updated_at: new Date() })
      .where("id", "=", subtaskId)
      .execute();

    // Recalculate task progress based on subtasks
    const subtasks = await db
      .selectFrom("subtasks")
      .select("done")
      .where("task_id", "=", taskId)
      .execute();

    if (subtasks.length > 0) {
      const doneCount = subtasks.filter((s) => s.done).length;
      const progress = Math.round((doneCount / subtasks.length) * 100);
      const status: TaskStatusType = progress === 100 ? "done" : "in_progress";
      await db
        .updateTable("tasks")
        .set({ progress, status, updated_at: new Date() })
        .where("id", "=", taskId)
        .execute();
    }

    return this.findById(taskId);
  },
};
