import { getDb } from "../db/kysely.ts";
import { hashPassword } from "better-auth/crypto";
import {
  ACTIVITY,
  AUDIT,
  CHANNELS,
  DOCUMENTS,
  EVENTS,
  MESSAGES,
  MILESTONES,
  NOTIFICATIONS,
  PEOPLE,
  PROJECTS,
  REPORTS,
  TASKS,
} from "../../lib/seed.ts";

export async function seedDatabase() {
  const db = getDb();

  console.log("[seed] Starting database seed...");

  // Clean up legacy mock data that does not belong to the real cohort or real projects
  const validPeopleIds = PEOPLE.map((p) => p.id);

  try {
    console.log("[seed] Cleaning up legacy mock records...");
    // 1. Delete dependent records for projects to ensure a 100% clean baseline
    await db.deleteFrom("milestones").execute();
    await db.deleteFrom("subtasks").execute();
    await db.deleteFrom("tasks").execute();
    await db.deleteFrom("report_reviews").execute();
    await db.deleteFrom("daily_reports").execute();
    await db.deleteFrom("document_versions").execute();
    await db.deleteFrom("documents").execute();
    await db.deleteFrom("project_members").execute();
    await db.deleteFrom("projects").execute();

    // 2. Identify mock users to remove (any user not in validPeopleIds and not a dynamically created user u_...)
    const mockUsers = await db
      .selectFrom("user")
      .select("id")
      .where("id", "not in", validPeopleIds)
      .where("id", "not like", "u_%")
      .execute();
    const mockUserIds = mockUsers.map((u) => u.id);

    if (mockUserIds.length > 0) {
      console.log(`[seed] Found ${mockUserIds.length} legacy mock users to purge:`, mockUserIds);
      await db.deleteFrom("audit_logs").where("actor_id", "in", mockUserIds).execute();
      await db.deleteFrom("activity").where("actor_id", "in", mockUserIds).execute();
      await db.deleteFrom("notifications").where("user_id", "in", mockUserIds).execute();
      await db.deleteFrom("calendar_events").where("created_by", "in", mockUserIds).execute();
      await db.deleteFrom("messages").where("author_id", "in", mockUserIds).execute();
      await db.deleteFrom("report_reviews").where("reviewer_id", "in", mockUserIds).execute();
      await db.deleteFrom("daily_reports").where("author_id", "in", mockUserIds).execute();
      await db.deleteFrom("tasks").where("assignee_id", "in", mockUserIds).execute();
      await db.deleteFrom("tasks").where("assigner_id", "in", mockUserIds).execute();
      await db.deleteFrom("document_versions").where("uploaded_by", "in", mockUserIds).execute();
      await db.deleteFrom("documents").where("created_by", "in", mockUserIds).execute();
      await db.deleteFrom("project_members").where("user_id", "in", mockUserIds).execute();
      await db.deleteFrom("user_settings").where("user_id", "in", mockUserIds).execute();
      await db.deleteFrom("profiles").where("user_id", "in", mockUserIds).execute();
      await db.deleteFrom("account").where("userId", "in", mockUserIds).execute();
      await db.deleteFrom("session").where("userId", "in", mockUserIds).execute();
      await db.deleteFrom("user").where("id", "in", mockUserIds).execute();
    }
  } catch (cleanErr) {
    console.warn("[seed] Warning during cleanup of legacy mock data:", cleanErr);
  }

  // 1. Seed Better Auth Users & Accounts & Profiles
  const defaultPassword = "TeamHub@2026!";
  const passwordHash = await hashPassword(defaultPassword);

  for (const p of PEOPLE) {
    // Insert/upsert Better Auth User
    await db
      .insertInto("user")
      .values({
        id: p.id,
        name: p.name,
        email: p.email,
        emailVerified: true,
        image: null,
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({
          name: p.name,
          email: p.email,
        }),
      )
      .execute();

    // Insert/upsert Better Auth Account (credential login)
    await db
      .insertInto("account")
      .values({
        id: `acc-${p.id}`,
        accountId: p.email,
        providerId: "credential",
        userId: p.id,
        password: passwordHash,
        updatedAt: new Date(),
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({
          password: passwordHash,
        }),
      )
      .execute();

    // Insert/upsert Profile
    await db
      .insertInto("profiles")
      .values({
        id: `prof-${p.id}`,
        user_id: p.id,
        name: p.name,
        short: p.short,
        email: p.email,
        role: p.role,
        title: p.title,
        dept: p.dept,
        year: p.year ?? null,
        registration_no: p.reg ?? null,
        presence: p.presence,
        avatar_url: p.avatar_url ?? null,
        phone: p.phone ?? null,
        bio: p.bio ?? null,
        college: p.college ?? null,
        skills: p.skills ?? null,
        linkedin_url: p.linkedin_url ?? null,
        github_url: p.github_url ?? null,
        portfolio_url: p.portfolio_url ?? null,
        location: p.location ?? null,
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({
          name: p.name,
          role: p.role,
          title: p.title,
          dept: p.dept,
          presence: p.presence,
          phone: p.phone ?? null,
          bio: p.bio ?? null,
          college: p.college ?? null,
          skills: p.skills ?? null,
          linkedin_url: p.linkedin_url ?? null,
          github_url: p.github_url ?? null,
          portfolio_url: p.portfolio_url ?? null,
          location: p.location ?? null,
        }),
      )
      .execute();

    // Insert User Settings
    await db
      .insertInto("user_settings")
      .values({
        user_id: p.id,
        dark_mode: false,
        sidebar_collapsed: false,
        email_notifications: true,
        in_app_notifications: true,
      })
      .onConflict((oc) => oc.column("user_id").doNothing())
      .execute();
  }

  // 2. Seed Projects & Project Members
  for (const pr of PROJECTS) {
    await db
      .insertInto("projects")
      .values({
        id: pr.id,
        code: pr.code,
        name: pr.name,
        subtitle: pr.subtitle,
        status: pr.status,
        progress: pr.progress,
        lead_id: pr.leadId,
        faculty_id: pr.facultyId,
        target_date: pr.targetDate,
        target_note: pr.targetNote,
        abstract: pr.abstract,
        repo_url: pr.repo,
        preview_url: pr.preview ?? null,
        cycle: pr.cycle,
        stack_json: JSON.stringify(pr.stack),
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({
          code: pr.code,
          name: pr.name,
          subtitle: pr.subtitle,
          status: pr.status,
          progress: pr.progress,
          lead_id: pr.leadId,
          faculty_id: pr.facultyId,
        }),
      )
      .execute();

    for (const memId of pr.memberIds) {
      await db
        .insertInto("project_members")
        .values({
          project_id: pr.id,
          user_id: memId,
          member_role: memId === pr.leadId ? "lead" : memId === pr.facultyId ? "faculty" : "member",
        })
        .onConflict((oc) => oc.columns(["project_id", "user_id"]).doNothing())
        .execute();
    }
  }

  // 3. Seed Milestones
  for (const m of MILESTONES) {
    await db
      .insertInto("milestones")
      .values({
        id: m.id,
        project_id: m.projectId,
        title: m.title,
        detail: m.detail,
        status: m.status,
        date: m.date,
        score: m.score ?? null,
        meta: m.meta,
        blocker: m.blocker ?? null,
      })
      .onConflict((oc) => oc.column("id").doNothing())
      .execute();
  }

  // 4. Seed Tasks and Subtasks
  for (const t of TASKS) {
    await db
      .insertInto("tasks")
      .values({
        id: t.id,
        code: t.code,
        title: t.title,
        project_id: t.projectId,
        assignee_id: t.assigneeId,
        assigner_id: t.assignerId,
        priority: t.priority,
        status: t.status,
        progress: t.progress,
        due_at: t.due,
        due_label: t.dueLabel,
        branch: t.branch ?? null,
        blocker: t.blocker ?? null,
        pages: t.pages ?? null,
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({
          status: t.status,
          progress: t.progress,
          blocker: t.blocker ?? null,
        }),
      )
      .execute();

    for (let i = 0; i < t.subtasks.length; i++) {
      const s = t.subtasks[i];
      await db
        .insertInto("subtasks")
        .values({
          id: s.id,
          task_id: t.id,
          title: s.title,
          done: s.done,
          position: i,
        })
        .onConflict((oc) => oc.column("id").doNothing())
        .execute();
    }
  }

  // 5. Seed Daily Reports and Report Reviews
  for (const r of REPORTS) {
    await db
      .insertInto("daily_reports")
      .values({
        id: r.id,
        author_id: r.authorId,
        project_id: r.projectId,
        report_date: r.date,
        hours: r.hours,
        completed: r.completed,
        next_steps: r.next,
        blockers: r.blockers,
        progress: r.progress,
        status: r.status,
        pr_url: r.prUrl ?? null,
        attachment: r.attachment ?? null,
        submitted_at: new Date(),
      })
      .onConflict((oc) =>
        oc.columns(["author_id", "project_id", "report_date"]).doUpdateSet({
          status: r.status,
          completed: r.completed,
        }),
      )
      .execute();

    if (r.feedback) {
      await db
        .insertInto("report_reviews")
        .values({
          id: `rev-${r.id}`,
          report_id: r.id,
          reviewer_id: "shaik",
          status: r.status === "revision" ? "revision" : "approved",
          feedback: r.feedback,
        })
        .onConflict((oc) => oc.column("id").doNothing())
        .execute();
    }
  }

  // 6. Seed Documents
  for (const d of DOCUMENTS) {
    const versionId = `ver-${d.id}`;
    await db
      .insertInto("documents")
      .values({
        id: d.id,
        project_id: d.projectId,
        name: d.name,
        kind: d.kind,
        current_version_id: versionId,
        created_by: d.updatedBy,
      })
      .onConflict((oc) => oc.column("id").doNothing())
      .execute();

    await db
      .insertInto("document_versions")
      .values({
        id: versionId,
        document_id: d.id,
        version: d.version,
        storage_path: `projects/${d.projectId}/${d.name}`,
        size_bytes: Math.round(d.size.includes("MB") ? parseFloat(d.size) * 1024 * 1024 : parseFloat(d.size) * 1024),
        mime_type: d.name.endsWith(".pdf") ? "application/pdf" : "text/plain",
        uploaded_by: d.updatedBy,
      })
      .onConflict((oc) => oc.column("id").doNothing())
      .execute();
  }

  // 7. Seed Channels & Messages
  for (const c of CHANNELS) {
    const proj = await db
      .selectFrom("projects")
      .select(["id"])
      .where("id", "=", c.id)
      .executeTakeFirst();

    await db
      .insertInto("channels")
      .values({
        id: c.id,
        project_id: proj ? c.id : null,
        name: c.name,
        topic: c.topic,
      })
      .onConflict((oc) => oc.column("id").doNothing())
      .execute();
  }

  for (const m of MESSAGES) {
    await db
      .insertInto("messages")
      .values({
        id: m.id,
        channel_id: m.channelId,
        author_id: m.authorId,
        body: m.body,
        created_at: new Date(),
      })
      .onConflict((oc) => oc.column("id").doNothing())
      .execute();
  }

  // 8. Seed Calendar Events
  for (const e of EVENTS) {
    await db
      .insertInto("calendar_events")
      .values({
        id: e.id,
        title: e.title,
        event_date: e.date,
        start_time: e.time,
        place: e.place,
        kind: e.kind,
        created_by: "sekhar",
      })
      .onConflict((oc) => oc.column("id").doNothing())
      .execute();
  }

  // 9. Seed Notifications
  for (const n of NOTIFICATIONS) {
    await db
      .insertInto("notifications")
      .values({
        id: n.id,
        user_id: "sekhar",
        kind: n.kind,
        title: n.title,
        body: n.body,
        href: n.href,
        read_at: n.read ? new Date() : null,
      })
      .onConflict((oc) => oc.column("id").doNothing())
      .execute();
  }

  // 10. Seed Activity
  for (const a of ACTIVITY) {
    await db
      .insertInto("activity")
      .values({
        id: a.id,
        actor_id: a.actorId,
        kind: a.kind,
        text: a.text,
        detail: a.detail ?? null,
      })
      .onConflict((oc) => oc.column("id").doNothing())
      .execute();
  }

  // 11. Seed Audit Logs
  for (const u of AUDIT) {
    await db
      .insertInto("audit_logs")
      .values({
        id: u.id,
        actor_id: u.actorId,
        action: u.action,
        target_type: u.target.split("/")[0]?.trim() ?? "General",
        target_id: u.target.split("/")[1]?.trim() ?? "",
        ip_hash: u.ip,
      })
      .onConflict((oc) => oc.column("id").doNothing())
      .execute();
  }

  console.log("[seed] Database seed completed successfully.");
}
