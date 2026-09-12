import { AuditRepository } from "@/server/repositories/audit.repo";
import { getAuthContext, requireAuditView } from "@/server/policies/rbac";

export const AdminService = {
  async listAuditLogs(
    callerUserId: string,
    filter?: {
      actorId?: string;
      action?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const ctx = await getAuthContext(callerUserId);
    requireAuditView(ctx);

    return AuditRepository.list(filter);
  },
};
