import { getDb } from "@/server/db/kysely";

export const ChatRepository = {
  async listChannels(userId?: string) {
    const db = getDb();
    const channels = await db.selectFrom("channels").selectAll().orderBy("name", "asc").execute();

    // Calculate unread counts if userId provided
    const unreadMap = new Map<string, number>();
    if (userId) {
      const reads = await db
        .selectFrom("message_reads")
        .selectAll()
        .where("user_id", "=", userId)
        .execute();

      const lastReadMap = new Map<string, Date>();
      for (const r of reads) {
        lastReadMap.set(r.channel_id, new Date(r.last_read_at));
      }

      for (const ch of channels) {
        const lastRead = lastReadMap.get(ch.id) ?? new Date(0);
        const countRes = await db
          .selectFrom("messages")
          .select((eb) => eb.fn.count<number>("id").as("cnt"))
          .where("channel_id", "=", ch.id)
          .where("created_at", ">", lastRead)
          .executeTakeFirst();
        unreadMap.set(ch.id, Number(countRes?.cnt ?? 0));
      }
    }

    return channels.map((c) => ({
      id: c.id,
      name: c.name,
      topic: c.topic,
      unread: unreadMap.get(c.id) ?? 0,
    }));
  },

  async listMessages(channelId: string, limit = 50) {
    const db = getDb();
    const rows = await db
      .selectFrom("messages")
      .selectAll()
      .where("channel_id", "=", channelId)
      .orderBy("created_at", "asc")
      .limit(limit)
      .execute();

    return rows.map((m) => ({
      id: m.id,
      channelId: m.channel_id,
      authorId: m.author_id,
      body: m.body,
      at: new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }),
    }));
  },

  async createMessage(data: {
    id: string;
    channelId: string;
    authorId: string;
    body: string;
  }) {
    const db = getDb();
    const created = await db
      .insertInto("messages")
      .values({
        id: data.id,
        channel_id: data.channelId,
        author_id: data.authorId,
        body: data.body,
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: created.id,
      channelId: created.channel_id,
      authorId: created.author_id,
      body: created.body,
      at: new Date(created.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }),
    };
  },

  async markRead(channelId: string, userId: string) {
    const db = getDb();
    return db
      .insertInto("message_reads")
      .values({
        channel_id: channelId,
        user_id: userId,
        last_read_at: new Date(),
      })
      .onConflict((oc) =>
        oc.columns(["channel_id", "user_id"]).doUpdateSet({
          last_read_at: new Date(),
        }),
      )
      .execute();
  },
};
