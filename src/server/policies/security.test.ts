import test from "node:test";
import assert from "node:assert/strict";
import {
  requireRole,
  requireUserAdmin,
  requireCanReviewReport,
  requireCanManageTask,
  requireCanUpdateTask,
} from "./rbac.ts";
import { ForbiddenError } from "../errors/index.ts";
import { PresignUploadSchema, SubmitDailyReportSchema } from "../schemas/index.ts";
import { getDb } from "../db/kysely.ts";

test.before(async () => {
  const db = getDb();

  // Insert dummy users to satisfy foreign keys
  await db
    .insertInto("user")
    .values([
      {
        id: "lead-self-author",
        name: "Lead Author",
        email: "lead.author@rvit.ac.in",
        emailVerified: true,
      },
      {
        id: "user-target",
        name: "Target Member",
        email: "target.member@rvit.ac.in",
        emailVerified: true,
      },
      {
        id: "lead-1",
        name: "Lead One",
        email: "lead.one@rvit.ac.in",
        emailVerified: true,
      },
    ])
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();

  // Insert dummy project to satisfy foreign keys
  await db
    .insertInto("projects")
    .values({
      id: "proj-test",
      code: "PRJ-SEC-TEST",
      name: "Security Test Project",
      subtitle: "Security tests project",
      status: "planning",
      progress: 0,
      lead_id: "lead-1",
      faculty_id: "lead-1",
      target_date: "2026-12-31",
      target_note: "",
      abstract: "",
      repo_url: "",
      cycle: "Sprint 01",
      stack_json: "[]",
    })
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();

  await db
    .insertInto("daily_reports")
    .values({
      id: "test-rep-self-review",
      author_id: "lead-self-author",
      project_id: "proj-test",
      report_date: "2026-09-11",
      hours: 5,
      completed: "Testing self-review prevention",
      next_steps: "",
      blockers: "",
      progress: 50,
      status: "submitted",
      submitted_at: new Date(),
    })
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();

  await db
    .insertInto("tasks")
    .values({
      id: "test-task-forbidden",
      code: "TASK-FORBIDDEN",
      title: "Task assigned to user-target",
      project_id: "proj-test",
      assignee_id: "user-target",
      assigner_id: "lead-1",
      priority: "medium",
      status: "todo",
      progress: 0,
      due_at: "2026-09-18",
      due_label: "Sep 18",
    })
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();
});

test("Security - Member cannot access user administration", () => {
  const memberCtx = { userId: "user-member-1", role: "member" as const, profileId: "prof-1" };
  assert.throws(
    () => requireUserAdmin(memberCtx),
    (err: unknown) => err instanceof ForbiddenError,
  );
});

test("Security - Member cannot elevate roles (privilege escalation prevention)", () => {
  const memberCtx = { userId: "user-member-1", role: "member" as const, profileId: "prof-1" };
  assert.throws(
    () => requireRole(memberCtx, ["super_admin"]),
    (err: unknown) => err instanceof ForbiddenError,
  );
});

test("Security - Author cannot review or approve own report", async () => {
  const leadCtx = { userId: "lead-self-author", role: "lead" as const, profileId: "prof-lead" };
  await assert.rejects(
    async () => {
      await requireCanReviewReport(leadCtx, "test-rep-self-review");
    },
    (err: unknown) => {
      return err instanceof ForbiddenError && (err as Error).message.includes("own daily report");
    },
  );
});

test("Security - Ordinary member cannot review any report", async () => {
  const memberCtx = { userId: "user-other", role: "member" as const, profileId: "prof-other" };
  await assert.rejects(
    async () => {
      await requireCanReviewReport(memberCtx, "test-rep-self-review");
    },
    (err: unknown) => err instanceof ForbiddenError,
  );
});

test("Security - Ordinary member cannot create or manage tasks on project without authority", async () => {
  const memberCtx = { userId: "user-member-1", role: "member" as const, profileId: "prof-1" };
  await assert.rejects(
    async () => {
      await requireCanManageTask(memberCtx, "proj-test");
    },
    (err: unknown) => err instanceof ForbiddenError,
  );
});

test("Security - Non-assigned member cannot update another member's task", async () => {
  const memberCtx = { userId: "user-attacker", role: "member" as const, profileId: "prof-attacker" };
  await assert.rejects(
    async () => {
      await requireCanUpdateTask(memberCtx, "test-task-forbidden");
    },
    (err: unknown) => err instanceof ForbiddenError,
  );
});

test("Security - Malicious file upload extensions & MIME types are rejected", () => {
  // Reject dangerous executable .exe
  assert.throws(() => {
    PresignUploadSchema.parse({
      projectId: "proj-1",
      name: "malware.exe",
      mimeType: "application/pdf",
      sizeBytes: 1024,
    });
  });

  // Reject shell script .sh
  assert.throws(() => {
    PresignUploadSchema.parse({
      projectId: "proj-1",
      name: "exploit.sh",
      mimeType: "text/plain",
      sizeBytes: 1024,
    });
  });

  // Reject unsupported MIME type
  assert.throws(() => {
    PresignUploadSchema.parse({
      projectId: "proj-1",
      name: "doc.bin",
      mimeType: "application/octet-stream",
      sizeBytes: 1024,
    });
  });

  // Reject oversized file (> 25MB)
  assert.throws(() => {
    PresignUploadSchema.parse({
      projectId: "proj-1",
      name: "giant-dump.pdf",
      mimeType: "application/pdf",
      sizeBytes: 30 * 1024 * 1024,
    });
  });
});

test("Security - Daily report validation rejects forged hours or invalid schemas", () => {
  // Negative hours rejected
  assert.throws(() => {
    SubmitDailyReportSchema.parse({
      projectId: "proj-1",
      date: "2026-09-11",
      hours: -5,
      completed: "Valid text describing work",
      next: "Next steps",
      blockers: "",
      progress: 50,
    });
  });

  // Impossible hours > 24 rejected
  assert.throws(() => {
    SubmitDailyReportSchema.parse({
      projectId: "proj-1",
      date: "2026-09-11",
      hours: 28,
      completed: "Valid text describing work",
      next: "Next steps",
      blockers: "",
      progress: 50,
    });
  });

  // Malformed date rejected
  assert.throws(() => {
    SubmitDailyReportSchema.parse({
      projectId: "proj-1",
      date: "11/09/2026",
      hours: 7,
      completed: "Valid text describing work",
      next: "Next steps",
      blockers: "",
      progress: 50,
    });
  });
});
