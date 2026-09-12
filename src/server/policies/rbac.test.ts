import test from "node:test";
import assert from "node:assert/strict";
import { requireRole, requireUserAdmin, requireAuditView } from "./rbac.ts";
import { ForbiddenError } from "../errors/index.ts";

test("RBAC - requireRole", () => {
  const adminCtx = { userId: "u1", role: "super_admin" as const, profileId: "p1" };
  const memberCtx = { userId: "u2", role: "member" as const, profileId: "p2" };

  // super_admin passes when super_admin is allowed
  assert.doesNotThrow(() => {
    requireRole(adminCtx, ["super_admin", "faculty"]);
  });

  // member throws ForbiddenError when only super_admin/faculty allowed
  assert.throws(
    () => {
      requireRole(memberCtx, ["super_admin", "faculty"]);
    },
    (err: unknown) => err instanceof ForbiddenError,
  );
});

test("RBAC - requireUserAdmin", () => {
  const adminCtx = { userId: "u1", role: "super_admin" as const, profileId: "p1" };
  const leadCtx = { userId: "u2", role: "lead" as const, profileId: "p2" };
  const memberCtx = { userId: "u3", role: "member" as const, profileId: "p3" };

  assert.doesNotThrow(() => {
    requireUserAdmin(adminCtx);
  });

  assert.throws(
    () => {
      requireUserAdmin(leadCtx);
    },
    (err: unknown) => err instanceof ForbiddenError,
  );

  assert.throws(
    () => {
      requireUserAdmin(memberCtx);
    },
    (err: unknown) => err instanceof ForbiddenError,
  );
});

test("RBAC - requireAuditView", () => {
  const adminCtx = { userId: "u1", role: "super_admin" as const, profileId: "p1" };
  const facultyCtx = { userId: "u2", role: "faculty" as const, profileId: "p2" };

  assert.doesNotThrow(() => {
    requireAuditView(adminCtx);
  });

  assert.throws(
    () => {
      requireAuditView(facultyCtx);
    },
    (err: unknown) => err instanceof ForbiddenError,
  );
});
