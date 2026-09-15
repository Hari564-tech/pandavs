import test from "node:test";
import assert from "node:assert/strict";
import {
  requireRole,
  requireUserAdmin,
  requireCanReviewReport,
  requireCanManageTask,
  requireCanUpdateTask,
  requireCanClearChat,
  requireCanDeleteDocument,
  requireCanManageProjectMembers,
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
      {
        id: "superadmin-sec",
        name: "Admin Sec",
        email: "admin.sec@rvit.ac.in",
        emailVerified: true,
      },
      {
        id: "lead-sec",
        name: "Lead Sec",
        email: "lead.sec@rvit.ac.in",
        emailVerified: true,
      },
      {
        id: "member-sec",
        name: "Member Sec",
        email: "member.sec@rvit.ac.in",
        emailVerified: true,
      },
    ])
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();

  await db
    .insertInto("profiles")
    .values([
      { id: "p-lead-self", user_id: "lead-self-author", name: "Lead Author", short: "LA", email: "lead.author@rvit.ac.in", role: "lead", title: "Lead", dept: "CSE", presence: "offline" },
      { id: "p-user-target", user_id: "user-target", name: "Target Member", short: "TM", email: "target.member@rvit.ac.in", role: "member", title: "Member", dept: "CSE", presence: "offline" },
      { id: "p-lead-1", user_id: "lead-1", name: "Lead One", short: "L1", email: "lead.one@rvit.ac.in", role: "lead", title: "Lead", dept: "CSE", presence: "offline" },
      { id: "p-superadmin-sec", user_id: "superadmin-sec", name: "Admin Sec", short: "AS", email: "admin.sec@rvit.ac.in", role: "super_admin", title: "Admin", dept: "IT", presence: "offline" },
      { id: "p-lead-sec", user_id: "lead-sec", name: "Lead Sec", short: "LS", email: "lead.sec@rvit.ac.in", role: "lead", title: "Lead", dept: "ECE", presence: "offline" },
      { id: "p-member-sec", user_id: "member-sec", name: "Member Sec", short: "MS", email: "member.sec@rvit.ac.in", role: "member", title: "Member", dept: "ECE", presence: "offline" },
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

  await db
    .insertInto("channels")
    .values({
      id: "sec-channel",
      name: "sec-channel",
      topic: "Security testing channel",
    })
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();

  await db
    .insertInto("documents")
    .values({
      id: "doc-sec-test",
      project_id: "proj-test",
      name: "Security Spec Document.pdf",
      kind: "trd",
      created_by: "lead-1",
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

test("Security - Only Super Admin can clear chat messages", () => {
  const memberCtx = { userId: "member-sec", role: "member" as const, profileId: "p-member-sec" };
  const leadCtx = { userId: "lead-sec", role: "lead" as const, profileId: "p-lead-sec" };
  const adminCtx = { userId: "superadmin-sec", role: "super_admin" as const, profileId: "p-superadmin-sec" };

  // Member fails
  assert.throws(
    () => requireCanClearChat(memberCtx),
    (err: unknown) => err instanceof ForbiddenError,
  );

  // Lead fails
  assert.throws(
    () => requireCanClearChat(leadCtx),
    (err: unknown) => err instanceof ForbiddenError,
  );

  // Super Admin succeeds
  assert.doesNotThrow(() => requireCanClearChat(adminCtx));
});

test("Security - Project member management enforces lead / faculty / admin authority", async () => {
  const memberCtx = { userId: "member-sec", role: "member" as const, profileId: "p-member-sec" };
  const nonLeadCtx = { userId: "lead-sec", role: "lead" as const, profileId: "p-lead-sec" };
  const designatedLeadCtx = { userId: "lead-1", role: "lead" as const, profileId: "p-lead-1" };
  const adminCtx = { userId: "superadmin-sec", role: "super_admin" as const, profileId: "p-superadmin-sec" };

  // Regular member cannot manage members
  await assert.rejects(
    async () => {
      await requireCanManageProjectMembers(memberCtx, "proj-test");
    },
    (err: unknown) => err instanceof ForbiddenError,
  );

  // Non-designated lead cannot manage members of another project
  await assert.rejects(
    async () => {
      await requireCanManageProjectMembers(nonLeadCtx, "proj-test");
    },
    (err: unknown) => err instanceof ForbiddenError,
  );

  // Designated lead of the project succeeds
  await assert.doesNotReject(async () => {
    await requireCanManageProjectMembers(designatedLeadCtx, "proj-test");
  });

  // Super Admin succeeds globally
  await assert.doesNotReject(async () => {
    await requireCanManageProjectMembers(adminCtx, "proj-test");
  });
});

test("Security - Document deletion allows lead/faculty/super_admin and rejects regular member", () => {
  const memberCtx = { userId: "member-sec", role: "member" as const, profileId: "p-member-sec" };
  const leadCtx = { userId: "lead-1", role: "lead" as const, profileId: "p-lead-1" };
  const adminCtx = { userId: "superadmin-sec", role: "super_admin" as const, profileId: "p-superadmin-sec" };

  // Member fails
  assert.throws(
    () => requireCanDeleteDocument(memberCtx),
    (err: unknown) => err instanceof ForbiddenError,
  );

  // Lead succeeds
  assert.doesNotThrow(() => requireCanDeleteDocument(leadCtx));

  // Super Admin succeeds
  assert.doesNotThrow(() => requireCanDeleteDocument(adminCtx));
});

