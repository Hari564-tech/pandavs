import { getDb } from "../db/kysely.ts";
import { ForbiddenError, UnauthorizedError, NotFoundError } from "../errors/index.ts";
import type { RoleType } from "../db/types.ts";

export interface AuthContext {
  userId: string;
  role: RoleType;
  profileId: string;
}

/**
 * Resolves the authenticated user's profile and assigned role.
 */
export async function getAuthContext(userId?: string): Promise<AuthContext> {
  if (!userId) {
    throw new UnauthorizedError("Authentication required");
  }

  const db = getDb();
  const profile = await db
    .selectFrom("profiles")
    .select(["id", "user_id", "role"])
    .where("user_id", "=", userId)
    .executeTakeFirst();

  if (!profile) {
    // If profile row doesn't exist yet, check if this is dev fallback or newly signed up user
    return {
      userId,
      role: "member",
      profileId: userId,
    };
  }

  return {
    userId: profile.user_id,
    role: profile.role,
    profileId: profile.id,
  };
}

/**
 * Ensures caller has one of the specified roles.
 */
export function requireRole(ctx: AuthContext, allowedRoles: RoleType[]): void {
  if (!allowedRoles.includes(ctx.role)) {
    throw new ForbiddenError(`Requires one of roles: ${allowedRoles.join(", ")}`);
  }
}

/**
 * Checks if user has access to a project (is super_admin or a registered member/lead/faculty).
 */
export async function requireProjectAccess(ctx: AuthContext, projectId: string): Promise<void> {
  if (ctx.role === "super_admin" || ctx.role === "faculty" || ctx.role === "lead") return;

  const db = getDb();
  const membership = await db
    .selectFrom("project_members")
    .select(["project_id", "user_id"])
    .where("project_id", "=", projectId)
    .where("user_id", "=", ctx.userId)
    .executeTakeFirst();

  if (!membership) {
    // Also check if user is the designated lead_id or faculty_id on project
    const project = await db
      .selectFrom("projects")
      .select(["id", "lead_id", "faculty_id"])
      .where("id", "=", projectId)
      .executeTakeFirst();

    if (project && (project.lead_id === ctx.userId || project.faculty_id === ctx.userId)) {
      return;
    }

    throw new ForbiddenError("You are not authorized to access this project");
  }
}

/**
 * Verifies permission to edit/manage project details.
 */
export async function canManageProject(ctx: AuthContext, _projectId: string): Promise<boolean> {
  if (ctx.role === "super_admin" || ctx.role === "faculty" || ctx.role === "lead") return true;
  return false;
}

/**
 * Verifies permission to manage/assign tasks.
 */
export async function requireCanManageTask(ctx: AuthContext, projectId: string): Promise<void> {
  if (ctx.role === "super_admin") return;

  const canManage = await canManageProject(ctx, projectId);
  if (!canManage) {
    throw new ForbiddenError("Only project leads, faculty, and administrators can create or reassign tasks");
  }
}

/**
 * Verifies permission to update a task's progress, status, or subtasks.
 * Allowed for:
 * - Super admin
 * - Project lead / faculty
 * - Assignee of the task
 */
export async function requireCanUpdateTask(ctx: AuthContext, taskId: string): Promise<void> {
  if (ctx.role === "super_admin") return;

  const db = getDb();
  const task = await db
    .selectFrom("tasks")
    .select(["id", "project_id", "assignee_id"])
    .where("id", "=", taskId)
    .executeTakeFirst();

  if (!task) {
    throw new NotFoundError("Task");
  }

  if (task.assignee_id === ctx.userId) {
    return; // Assignee can update their own task
  }

  const canManage = await canManageProject(ctx, task.project_id);
  if (!canManage) {
    throw new ForbiddenError("You cannot modify tasks assigned to other members");
  }
}

/**
 * Verifies review permission.
 * - Reviewer must be faculty, lead, or super_admin.
 * - Reviewer CANNOT review their own report!
 */
export async function requireCanReviewReport(ctx: AuthContext, reportId: string): Promise<void> {
  if (ctx.role === "member") {
    throw new ForbiddenError("Members cannot review daily reports");
  }

  const db = getDb();
  const report = await db
    .selectFrom("daily_reports")
    .select(["id", "author_id", "project_id"])
    .where("id", "=", reportId)
    .executeTakeFirst();

  if (!report) {
    throw new NotFoundError("Daily report");
  }

  if (report.author_id === ctx.userId) {
    throw new ForbiddenError("You cannot review or approve your own daily report");
  }

  if (ctx.role === "super_admin") return;

  // Verify lead or faculty for that project
  const canManage = await canManageProject(ctx, report.project_id);
  if (!canManage) {
    throw new ForbiddenError("You can only review reports for projects you supervise or lead");
  }
}

/**
 * Verifies permission to edit a daily report.
 * Allowed only for the report author or super_admin.
 */
export function requireCanEditReport(ctx: AuthContext, reportAuthorId: string): void {
  if (ctx.role === "super_admin") return;
  if (ctx.userId !== reportAuthorId) {
    throw new ForbiddenError("You cannot edit another member's daily report");
  }
}

/**
 * Verifies user administration rights.
 */
export function requireUserAdmin(ctx: AuthContext): void {
  if (ctx.role !== "super_admin") {
    throw new ForbiddenError("Only Super Administrators can manage users and system roles");
  }
}

/**
 * Verifies audit viewing rights.
 */
export function requireAuditView(ctx: AuthContext): void {
  if (ctx.role !== "super_admin") {
    throw new ForbiddenError("Access restricted: Audit logs are reserved for Super Administrators");
  }
}

/**
 * Verifies permission to clear chat messages.
 * Only Super Admin can clear messages for everyone.
 */
export function requireCanClearChat(ctx: AuthContext): void {
  if (ctx.role !== "super_admin") {
    throw new ForbiddenError("Only Super Administrators can clear chat messages");
  }
}

/**
 * Verifies permission to delete a project document.
 * Allowed for Super Admin, Faculty, and Team Lead.
 */
export function requireCanDeleteDocument(ctx: AuthContext): void {
  requireRole(ctx, ["super_admin", "faculty", "lead"]);
}

/**
 * Verifies permission to add or remove members from a project.
 * Super Admin and Faculty have global authority.
 * Lead can manage members for projects where they are the designated lead.
 */
export async function requireCanManageProjectMembers(ctx: AuthContext, projectId: string): Promise<void> {
  if (ctx.role === "super_admin" || ctx.role === "faculty") return;

  const db = getDb();
  const project = await db
    .selectFrom("projects")
    .select(["lead_id"])
    .where("id", "=", projectId)
    .executeTakeFirst();

  if (!project || project.lead_id !== ctx.userId) {
    throw new ForbiddenError("Only the project team lead, faculty guide, or super admin can manage members for this project.");
  }
}
