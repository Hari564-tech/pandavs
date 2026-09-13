import { ChatRepository } from "@/server/repositories/chat.repo";
import { RealtimeService } from "@/server/realtime/supabase-realtime";
import { NotificationRepository } from "@/server/repositories/notification.repo";
import { UserRepository } from "@/server/repositories/user.repo";
import { AuditRepository } from "@/server/repositories/audit.repo";
import { ActivityRepository } from "@/server/repositories/activity.repo";
import { getDb } from "@/server/db/kysely";
import { getAuthContext, requireRole } from "@/server/policies/rbac";
import { SendChatMessageSchema } from "@/server/schemas";

export const ChatService = {
  async listChannels(callerUserId?: string) {
    return ChatRepository.listChannels(callerUserId);
  },

  async listMessages(channelId: string) {
    return ChatRepository.listMessages(channelId);
  },

  async sendMessage(callerUserId: string, rawInput: unknown) {
    const data = SendChatMessageSchema.parse(rawInput);
    const msgId = `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const message = await ChatRepository.createMessage({
      id: msgId,
      channelId: data.channelId,
      authorId: callerUserId,
      body: data.body,
    });

    // Broadcast message via realtime
    await RealtimeService.publish({
      channel: `chat:${data.channelId}`,
      event: "new_message",
      payload: message,
    });

    // Send in-app notification to recipients for the topbar bell bar
    try {
      const author = await UserRepository.findById(callerUserId);
      const authorName = author?.name || "Team Member";

      const db = getDb();
      const channel = await db
        .selectFrom("channels")
        .select(["id", "name", "project_id"])
        .where("id", "=", data.channelId)
        .executeTakeFirst();
      const channelName = channel?.name || data.channelId;

      const allUsers = await UserRepository.listAll();
      const recipients = allUsers.filter((u) => u.user_id !== callerUserId);

      for (const r of recipients) {
        await NotificationRepository.create({
          id: `msg-${Date.now()}-${r.user_id.slice(0, 8)}-${Math.random().toString(36).slice(2, 6)}`,
          userId: r.user_id,
          kind: "mention",
          title: `New message in #${channelName}`,
          body: `${authorName}: ${data.body.length > 70 ? data.body.slice(0, 67) + "..." : data.body}`,
          href: "/chat",
        });
      }
    } catch (notifErr) {
      console.error("Failed to fan out message notifications:", notifErr);
    }

    return message;
  },

  async markRead(callerUserId: string, channelId: string) {
    return ChatRepository.markRead(channelId, callerUserId);
  },

  async clearMessages(callerUserId: string, options?: { channelId?: string; all?: boolean }) {
    const ctx = await getAuthContext(callerUserId);
    requireRole(ctx, ["super_admin"]);

    await ChatRepository.clearMessages(options);

    // Broadcast clear event via realtime
    await RealtimeService.publish({
      channel: options?.all ? "chat:all" : `chat:${options?.channelId}`,
      event: "chat_cleared",
      payload: {
        clearedBy: callerUserId,
        channelId: options?.all ? null : options?.channelId,
        all: Boolean(options?.all),
      },
    });

    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "chat_cleared",
      targetType: "chat",
      targetId: options?.all ? "all" : (options?.channelId || "team-portal"),
      metadataJson: options || {},
    });

    await ActivityRepository.create({
      id: `act-${Date.now()}`,
      actorId: callerUserId,
      kind: "blocker",
      text: options?.all
        ? "cleared all chat history for everyone"
        : `cleared #${options?.channelId || "team-portal"} chat history`,
      projectId: null,
    });

    return { success: true };
  },
};
