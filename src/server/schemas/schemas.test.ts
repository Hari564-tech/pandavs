import test from "node:test";
import assert from "node:assert/strict";
import {
  SubmitDailyReportSchema,
  ReviewReportSchema,
  CreateTaskSchema,
  PresignUploadSchema,
  UpdateProfileSchema,
  PresignAvatarSchema,
  CreateUserSchema,
  ResetUserPasswordSchema,
} from "./index.ts";

test("Schema - SubmitDailyReportSchema validation", () => {
  // Valid report
  const valid = {
    projectId: "team-portal",
    date: "2026-09-11",
    hours: 6.5,
    completed: "Finished RBAC and unit tests.",
    next: "Deploying to staging.",
    blockers: "",
    progress: 80,
    prUrl: "https://github.com/rvit-tech/team-portal/pull/42",
    taskCodes: ["PROJ-204"],
  };
  const parsed = SubmitDailyReportSchema.parse(valid);
  assert.equal(parsed.hours, 6.5);
  assert.equal(parsed.progress, 80);

  // Invalid hours > 24
  assert.throws(() => {
    SubmitDailyReportSchema.parse({ ...valid, hours: 26 });
  });

  // Invalid date format
  assert.throws(() => {
    SubmitDailyReportSchema.parse({ ...valid, date: "11-09-2026" });
  });

  // Short completed text
  assert.throws(() => {
    SubmitDailyReportSchema.parse({ ...valid, completed: "done" });
  });
});

test("Schema - ReviewReportSchema validation", () => {
  const validApproved = {
    reportId: "r-kavya-today",
    status: "approved" as const,
    feedback: "Looks good to merge.",
  };
  assert.doesNotThrow(() => {
    ReviewReportSchema.parse(validApproved);
  });

  // Invalid status
  assert.throws(() => {
    ReviewReportSchema.parse({ ...validApproved, status: "rejected" });
  });
});

test("Schema - PresignUploadSchema validation", () => {
  const validFile = {
    projectId: "team-portal",
    name: "PRD_v2.pdf",
    kind: "prd" as const,
    mimeType: "application/pdf",
    sizeBytes: 1024 * 1024,
  };
  assert.doesNotThrow(() => {
    PresignUploadSchema.parse(validFile);
  });

  // File size exceeding 50MB
  assert.throws(() => {
    PresignUploadSchema.parse({ ...validFile, sizeBytes: 60 * 1024 * 1024 });
  });
});

test("Schema - UpdateProfileSchema validation", () => {
  const valid = {
    name: "K. Hari Chandra Sekhar",
    title: "Admin Lead",
    dept: "CSE Faculty",
    phone: "+91 94401 23456",
    bio: "Super Administrator & Faculty PM.",
    college: "RV Institute of Technology",
    skills: "Cloud, Distributed Systems",
    linkedin_url: "https://linkedin.com/in/hcsekhar",
    github_url: "https://github.com/hcsekhar",
    portfolio_url: "https://sekhar.dev",
    location: "Bengaluru, India",
    presence: "active" as const,
  };

  const parsed = UpdateProfileSchema.parse(valid);
  assert.equal(parsed.name, "K. Hari Chandra Sekhar");
  assert.equal(parsed.linkedin_url, "https://linkedin.com/in/hcsekhar");

  // Invalid LinkedIn URL
  assert.throws(() => {
    UpdateProfileSchema.parse({ ...valid, linkedin_url: "not-a-valid-url" });
  });

  // Invalid empty name
  assert.throws(() => {
    UpdateProfileSchema.parse({ ...valid, name: "" });
  });
});

test("Schema - PresignAvatarSchema validation", () => {
  const validAvatar = {
    fileName: "profile.png",
    mimeType: "image/png" as const,
    sizeBytes: 1024 * 500,
  };
  assert.doesNotThrow(() => {
    PresignAvatarSchema.parse(validAvatar);
  });

  // Unsupported mime type
  assert.throws(() => {
    PresignAvatarSchema.parse({ ...validAvatar, mimeType: "application/pdf" });
  });

  // Exceeding 5MB
  assert.throws(() => {
    PresignAvatarSchema.parse({ ...validAvatar, sizeBytes: 6 * 1024 * 1024 });
  });
});

test("Schema - CreateUserSchema and ResetUserPasswordSchema validation", () => {
  const validUser = {
    email: "test.student@rvit.ac.in",
    password: "Password@123",
    name: "Test Student",
    role: "member" as const,
    title: "Junior Intern",
    dept: "CSE",
  };

  const parsed = CreateUserSchema.parse(validUser);
  assert.equal(parsed.email, "test.student@rvit.ac.in");

  // Short password (< 8 chars)
  assert.throws(() => {
    CreateUserSchema.parse({ ...validUser, password: "123" });
  });

  // Invalid email
  assert.throws(() => {
    CreateUserSchema.parse({ ...validUser, email: "invalid-email" });
  });

  // Password reset valid
  assert.doesNotThrow(() => {
    ResetUserPasswordSchema.parse({ userId: "u_123", newPassword: "NewSecretPassword@2026" });
  });

  // Password reset short password
  assert.throws(() => {
    ResetUserPasswordSchema.parse({ userId: "u_123", newPassword: "short" });
  });
});

test("Schema - CreateTaskSchema validation", () => {
  const validTask = {
    code: "TSK-101",
    title: "Implement database audit logs",
    projectId: "team-portal",
    assigneeId: "u_456",
    priority: "high" as const,
    dueAt: "2026-09-20",
    dueLabel: "Target Sep 20",
    subtasks: [{ title: "Create migration" }, { title: "Wire service" }],
  };

  assert.doesNotThrow(() => {
    CreateTaskSchema.parse(validTask);
  });

  // Empty title
  assert.throws(() => {
    CreateTaskSchema.parse({ ...validTask, title: "" });
  });

  // Invalid priority
  assert.throws(() => {
    CreateTaskSchema.parse({ ...validTask, priority: "invalid_priority" });
  });
});


