import { getDb } from "@/server/db/kysely";
import type { NotifKindType } from "@/server/db/types";

export const NotificationRepository = {
  async listForUser(userId: string) {
    const db = getDb();
    const rows = await db
      .selectFrom("notifications")
      .selectAll()
      .where("user_id", "=", userId)
      .orderBy("created_at", "desc")
      .limit(30)
      .execute();

    return rows.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      href: n.href,
      read: Boolean(n.read_at),
      at: new Date(n.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }),
    }));
  },

  async create(data: {
    id: string;
    userId: string;
    kind: NotifKindType;
    title: string;
    body: string;
    href?: string;
  }) {
    const db = getDb();
    return db
      .insertInto("notifications")
      .values({
        id: data.id,
        user_id: data.userId,
        kind: data.kind,
        title: data.title,
        body: data.body,
        href: data.href ?? "/",
        created_at: new Date(),
      })
      .execute();
  },

  async markRead(id: string, userId: string) {
    const db = getDb();
    return db
      .updateTable("notifications")
      .set({ read_at: new Date() })
      .where("id", "=", id)
      .where("user_id", "=", userId)
      .execute();
  },

  async markAllRead(userId: string) {
    const db = getDb();
    return db
      .updateTable("notifications")
      .set({ read_at: new Date() })
      .where("user_id", "=", userId)
      .where("read_at", "is", null)
      .execute();
  },
};
