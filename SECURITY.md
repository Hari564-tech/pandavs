# Security & RBAC Specification: TeamHub

## 1. Security Architecture Overview
Security in TeamHub follows a zero-trust model where the browser and frontend clients are treated as untrusted presentation runtimes. All access control, role authorization, and scope validations are enforced server-side before any SQL statement or transaction is executed.

---

## 2. RBAC Model & Permission Matrix

| Operation | Super Admin | Faculty | Lead | Member |
|---|:---:|:---:|:---:|:---:|
| **Manage Users & Change Roles** | ✅ | ❌ | ❌ | ❌ |
| **View Audit Logs** | ✅ | ❌ | ❌ | ❌ |
| **Create Strategic Projects** | ✅ | ✅ | ✅ | ❌ |
| **Assign Tasks** | ✅ | ✅ (assigned) | ✅ (assigned) | ❌ |
| **Update Any Task Status** | ✅ | ✅ (assigned) | ✅ (assigned) | ❌ |
| **Update Own Assigned Task** | ✅ | ✅ | ✅ | ✅ |
| **Toggle Own Subtasks** | ✅ | ✅ | ✅ | ✅ |
| **Submit Daily Work Report** | ✅ | ✅ | ✅ | ✅ |
| **Review & Approve Reports** | ✅ | ✅ (assigned) | ✅ (assigned) | ❌ |
| **Review Own Report** | ❌ (Strictly Forbidden) | ❌ (Strictly Forbidden) | ❌ (Strictly Forbidden) | ❌ |
| **Upload Project Documents** | ✅ | ✅ (assigned) | ✅ (assigned) | ✅ (assigned) |
| **Read Project Chat Channels** | ✅ | ✅ (assigned) | ✅ (assigned) | ✅ (assigned) |

---

## 3. Server-Side Security Policies

All authorization policies are centralized in `src/server/policies/rbac.ts`:
- `requireRole(ctx, allowedRoles)`: Enforces user's assigned role against required roles.
- `requireProjectAccess(ctx, projectId)`: Enforces that the user is a registered member of the project or super_admin.
- `requireCanManageTask(ctx, projectId)`: Ensures task creation or deletion is authorized by a project supervisor.
- `requireCanUpdateTask(ctx, taskId)`: Restricts task progress updates to either the task assignee or project supervisors. Prevents horizontal mutation of peers' tasks.
- `requireCanReviewReport(ctx, reportId)`:
  - Validates that the reviewer has supervisory authority over the report's project.
  - **Self-Approval Prevention**: Enforces that `report.author_id !== ctx.userId`, strictly blocking users from approving their own reports.
- `requireUserAdmin(ctx)`: Restricts role modifications strictly to `super_admin`.
- `requireAuditView(ctx)`: Restricts audit inspection strictly to `super_admin`.

---

## 4. Mitigation of Common Vulnerabilities

1. **Privilege Escalation**:
   - The user cannot supply their own role in mutation payloads. The role is loaded from the database using the verified session token.
   - Any attempt by a `member`, `lead`, or `faculty` to invoke `UserService.updateRole` throws `ForbiddenError` (403).
2. **Insecure Direct Object References (IDOR)**:
   - Project, task, report, and document endpoints verify that the requesting user has legitimate membership in the target project before returning or modifying data.
3. **SQL Injection**:
   - 100% of queries use Kysely parameterized statements or parameterized tagged templates (`sql` $1, $2). No raw SQL string interpolation is permitted.
4. **File Storage Security**:
   - File uploads only receive short-lived signed URLs with strict MIME type and size checks (50MB maximum).
   - Direct public access to buckets is disabled; downloads require authenticated signed URLs.
5. **CSRF & Session Hijacking**:
   - `__Host-` prefixed secure cookies prevent subdomain tossing.
   - SameSite Lax cookies and origin validation prevent cross-site request forgery on state-changing endpoints.
