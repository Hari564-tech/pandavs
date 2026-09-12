import { getDb } from "@/server/db/kysely";
import type { ProjectsTable } from "@/server/db/types";

export const ProjectRepository = {
  async listAll() {
    const db = getDb();
    const projects = await db.selectFrom("projects").selectAll().orderBy("name", "asc").execute();
    const members = await db.selectFrom("project_members").selectAll().execute();

    const memberMap = new Map<string, string[]>();
    for (const m of members) {
      const list = memberMap.get(m.project_id) ?? [];
      list.push(m.user_id);
      memberMap.set(m.project_id, list);
    }

    return projects.map((p) => {
      let stack: { name: string; note: string }[] = [];
      try {
        stack = typeof p.stack_json === "string" ? JSON.parse(p.stack_json) : (p.stack_json as unknown as { name: string; note: string }[]) ?? [];
      } catch {
        stack = [];
      }
      return {
        ...p,
        leadId: p.lead_id,
        facultyId: p.faculty_id,
        targetDate: p.target_date,
        targetNote: p.target_note,
        repo: p.repo_url,
        preview: p.preview_url ?? undefined,
        stack,
        memberIds: memberMap.get(p.id) ?? [],
      };
    });
  },

  async findById(id: string) {
    const db = getDb();
    const project = await db.selectFrom("projects").selectAll().where("id", "=", id).executeTakeFirst();
    if (!project) return null;

    const members = await db
      .selectFrom("project_members")
      .select("user_id")
      .where("project_id", "=", id)
      .execute();

    let stack: { name: string; note: string }[] = [];
    try {
      stack = typeof project.stack_json === "string" ? JSON.parse(project.stack_json) : (project.stack_json as unknown as { name: string; note: string }[]) ?? [];
    } catch {
      stack = [];
    }

    return {
      ...project,
      leadId: project.lead_id,
      facultyId: project.faculty_id,
      targetDate: project.target_date,
      targetNote: project.target_note,
      repo: project.repo_url,
      preview: project.preview_url ?? undefined,
      stack,
      memberIds: members.map((m) => m.user_id),
    };
  },

  async create(data: {
    id: string;
    code: string;
    name: string;
    subtitle: string;
    status: ProjectsTable["status"];
    progress: number;
    lead_id: string;
    faculty_id: string;
    target_date: string;
    target_note: string;
    abstract: string;
    repo_url: string;
    preview_url?: string | null;
    cycle: string;
    stack: { name: string; note: string }[];
    memberIds?: string[];
  }) {
    const db = getDb();
    const created = await db
      .insertInto("projects")
      .values({
        id: data.id,
        code: data.code,
        name: data.name,
        subtitle: data.subtitle,
        status: data.status,
        progress: data.progress,
        lead_id: data.lead_id,
        faculty_id: data.faculty_id,
        target_date: data.target_date,
        target_note: data.target_note,
        abstract: data.abstract,
        repo_url: data.repo_url,
        preview_url: data.preview_url ?? null,
        cycle: data.cycle,
        stack_json: JSON.stringify(data.stack),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const memberIds = Array.from(new Set([data.lead_id, data.faculty_id, ...(data.memberIds ?? [])]));
    for (const uId of memberIds) {
      await db
        .insertInto("project_members")
        .values({
          project_id: data.id,
          user_id: uId,
          member_role: uId === data.lead_id ? "lead" : uId === data.faculty_id ? "faculty" : "member",
        })
        .onConflict((oc) => oc.columns(["project_id", "user_id"]).doNothing())
        .execute();
    }

    return created;
  },

  async update(id: string, updates: Partial<ProjectsTable> & { stack?: { name: string; note: string }[] }) {
    const db = getDb();
    const updateValues: Record<string, unknown> = {
      ...updates,
      updated_at: new Date(),
    };
    if (updates.stack) {
      updateValues.stack_json = JSON.stringify(updates.stack);
      delete updateValues.stack;
    }

    return db
      .updateTable("projects")
      .set(updateValues)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
  },

  async getMilestones(projectId: string) {
    const db = getDb();
    return db
      .selectFrom("milestones")
      .selectAll()
      .where("project_id", "=", projectId)
      .orderBy("date", "asc")
      .execute();
  },
};
