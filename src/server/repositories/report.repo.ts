import { getDb } from "@/server/db/kysely";
import type { ReportStatusType } from "@/server/db/types";

export const ReportRepository = {
  async list(filter?: {
    authorId?: string;
    projectId?: string;
    date?: string;
    status?: ReportStatusType;
  }) {
    const db = getDb();
    let query = db.selectFrom("daily_reports").selectAll().orderBy("report_date", "desc");

    if (filter?.authorId) {
      query = query.where("author_id", "=", filter.authorId);
    }
    if (filter?.projectId) {
      query = query.where("project_id", "=", filter.projectId);
    }
    if (filter?.date) {
      query = query.where("report_date", "=", filter.date);
    }
    if (filter?.status) {
      query = query.where("status", "=", filter.status);
    }

    const reports = await query.execute();
    const reportIds = reports.map((r) => r.id);

    // Fetch review feedbacks
    const reviews = reportIds.length
      ? await db
          .selectFrom("report_reviews")
          .selectAll()
          .where("report_id", "in", reportIds)
          .orderBy("reviewed_at", "desc")
          .execute()
      : [];

    const reviewMap = new Map<string, typeof reviews[0]>();
    for (const rev of reviews) {
      if (!reviewMap.has(rev.report_id)) {
        reviewMap.set(rev.report_id, rev);
      }
    }

    // Fetch linked task codes
    const linkedTasks = reportIds.length
      ? await db
          .selectFrom("report_tasks")
          .innerJoin("tasks", "tasks.id", "report_tasks.task_id")
          .select(["report_tasks.report_id", "tasks.code"])
          .where("report_tasks.report_id", "in", reportIds)
          .execute()
      : [];

    const taskCodeMap = new Map<string, string[]>();
    for (const lt of linkedTasks) {
      const list = taskCodeMap.get(lt.report_id) ?? [];
      list.push(lt.code);
      taskCodeMap.set(lt.report_id, list);
    }

    return reports.map((r) => {
      const latestReview = reviewMap.get(r.id);
      return {
        ...r,
        authorId: r.author_id,
        projectId: r.project_id,
        date: r.report_date,
        hours: Number(r.hours),
        next: r.next_steps,
        prUrl: r.pr_url ?? undefined,
        attachment: r.attachment ?? undefined,
        taskCodes: taskCodeMap.get(r.id) ?? [],
        feedback: latestReview?.feedback ?? undefined,
        submittedAt: r.submitted_at ? new Date(r.submitted_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) + " IST" : undefined,
      };
    });
  },

  async findById(id: string) {
    const list = await this.list();
    return list.find((r) => r.id === id) ?? null;
  },

  async findByAuthorAndDate(authorId: string, projectId: string, date: string) {
    const db = getDb();
    return db
      .selectFrom("daily_reports")
      .selectAll()
      .where("author_id", "=", authorId)
      .where("project_id", "=", projectId)
      .where("report_date", "=", date)
      .executeTakeFirst();
  },

  async upsert(data: {
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
    pr_url?: string | null;
    attachment?: string | null;
    taskCodes?: string[];
  }) {
    const db = getDb();

    // Perform inside transaction for multi-table atomicity & idempotency
    return db.transaction().execute(async (tx) => {
      const existing = await tx
        .selectFrom("daily_reports")
        .select("id")
        .where("author_id", "=", data.author_id)
        .where("project_id", "=", data.project_id)
        .where("report_date", "=", data.report_date)
        .executeTakeFirst();

      const reportId = existing?.id ?? data.id;

      await tx
        .insertInto("daily_reports")
        .values({
          id: reportId,
          author_id: data.author_id,
          project_id: data.project_id,
          report_date: data.report_date,
          hours: data.hours,
          completed: data.completed,
          next_steps: data.next_steps,
          blockers: data.blockers,
          progress: data.progress,
          status: data.status,
          pr_url: data.pr_url ?? null,
          attachment: data.attachment ?? null,
          submitted_at: new Date(),
          updated_at: new Date(),
        })
        .onConflict((oc) =>
          oc.columns(["author_id", "project_id", "report_date"]).doUpdateSet({
            hours: data.hours,
            completed: data.completed,
            next_steps: data.next_steps,
            blockers: data.blockers,
            progress: data.progress,
            status: data.status,
            pr_url: data.pr_url ?? null,
            attachment: data.attachment ?? null,
            submitted_at: new Date(),
            updated_at: new Date(),
          }),
        )
        .execute();

      // Upsert report_tasks relations if taskCodes provided
      if (data.taskCodes && data.taskCodes.length) {
        await tx.deleteFrom("report_tasks").where("report_id", "=", reportId).execute();

        const tasks = await tx
          .selectFrom("tasks")
          .select("id")
          .where("code", "in", data.taskCodes)
          .execute();

        for (const t of tasks) {
          await tx
            .insertInto("report_tasks")
            .values({
              report_id: reportId,
              task_id: t.id,
            })
            .onConflict((oc) => oc.columns(["report_id", "task_id"]).doNothing())
            .execute();
        }
      }

      return reportId;
    });
  },

  async recordReview(data: {
    id: string;
    report_id: string;
    reviewer_id: string;
    status: "approved" | "revision";
    feedback: string;
  }) {
    const db = getDb();

    return db.transaction().execute(async (tx) => {
      // 1. Insert review
      await tx
        .insertInto("report_reviews")
        .values({
          id: data.id,
          report_id: data.report_id,
          reviewer_id: data.reviewer_id,
          status: data.status,
          feedback: data.feedback,
          reviewed_at: new Date(),
        })
        .execute();

      // 2. Update report status
      await tx
        .updateTable("daily_reports")
        .set({
          status: data.status,
          updated_at: new Date(),
        })
        .where("id", "=", data.report_id)
        .execute();

      return data.id;
    });
  },
};
