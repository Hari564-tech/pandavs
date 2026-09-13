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

  async listMessages(channelId: string, limit = 100) {
    const db = getDb();
    const rows = await db
      .selectFrom("messages")
      .selectAll()
      .where("channel_id", "=", channelId)
      .orderBy("created_at", "asc")
      .limit(limit)
      .execute();

    return rows.map((m) => {
      const date = new Date(m.created_at);
      return {
        id: m.id,
        channelId: m.channel_id,
        authorId: m.author_id,
        body: m.body,
        at: date.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        createdAt: date.toISOString(),
      };
    });
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

    const createdDate = new Date(created.created_at);
    return {
      id: created.id,
      channelId: created.channel_id,
      authorId: created.author_id,
      body: created.body,
      at: createdDate.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      createdAt: createdDate.toISOString(),
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

  async clearMessages(options?: { channelId?: string; all?: boolean }) {
    const db = getDb();
    if (options?.all) {
      await db.deleteFrom("messages").execute();
      await db.deleteFrom("message_reads").execute();
    } else if (options?.channelId) {
      await db.deleteFrom("messages").where("channel_id", "=", options.channelId).execute();
      await db.deleteFrom("message_reads").where("channel_id", "=", options.channelId).execute();
    } else {
      await db.deleteFrom("messages").execute();
      await db.deleteFrom("message_reads").execute();
    }
    return { success: true };
  },
};
