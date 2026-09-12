import { getDb } from "@/server/db/kysely";
import type { ActivityKindType } from "@/server/db/types";

export const ActivityRepository = {
  async listRecent(limit = 15) {
    const db = getDb();
    const rows = await db
      .selectFrom("activity")
      .selectAll()
      .orderBy("created_at", "desc")
      .limit(limit)
      .execute();

    return rows.map((a) => ({
      id: a.id,
      kind: a.kind,
      actorId: a.actor_id,
      text: a.text,
      detail: a.detail ?? undefined,
      at: new Date(a.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }),
    }));
  },

  async create(data: {
    id: string;
    actorId: string;
    kind: ActivityKindType;
    text: string;
    detail?: string | null;
    projectId?: string | null;
  }) {
    const db = getDb();
    return db
      .insertInto("activity")
      .values({
        id: data.id,
        actor_id: data.actorId,
        kind: data.kind,
        text: data.text,
        detail: data.detail ?? null,
        project_id: data.projectId ?? null,
        created_at: new Date(),
      })
      .execute();
  },
};
