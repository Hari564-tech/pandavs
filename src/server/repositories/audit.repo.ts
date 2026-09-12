import { getDb } from "@/server/db/kysely";

export const AuditRepository = {
  async log(data: {
    id: string;
    actorId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    metadataJson?: Record<string, unknown>;
    ipHash?: string;
  }) {
    const db = getDb();
    return db
      .insertInto("audit_logs")
      .values({
        id: data.id,
        actor_id: data.actorId,
        action: data.action,
        target_type: data.targetType ?? "",
        target_id: data.targetId ?? "",
        metadata_json: JSON.stringify(data.metadataJson ?? {}),
        ip_hash: data.ipHash ?? "127.0.0.1",
        created_at: new Date(),
      })
      .execute();
  },

  async list(filter?: {
    actorId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) {
    const db = getDb();
    let query = db.selectFrom("audit_logs").selectAll().orderBy("created_at", "desc");

    if (filter?.actorId) {
      query = query.where("actor_id", "=", filter.actorId);
    }
    if (filter?.action) {
      query = query.where("action", "ilike", `%${filter.action}%`);
    }

    const rows = await query.limit(filter?.limit ?? 50).offset(filter?.offset ?? 0).execute();

    return rows.map((r) => ({
      id: r.id,
      actorId: r.actor_id,
      action: r.action,
      target: `${r.target_type} ${r.target_id}`.trim() || "System",
      at: new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }),
      ip: r.ip_hash,
      metadata: typeof r.metadata_json === "string" ? JSON.parse(r.metadata_json) : r.metadata_json,
    }));
  },
};
