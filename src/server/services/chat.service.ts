import { ChatRepository } from "@/server/repositories/chat.repo";
import { RealtimeService } from "@/server/realtime/supabase-realtime";
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

    return message;
  },

  async markRead(callerUserId: string, channelId: string) {
    return ChatRepository.markRead(channelId, callerUserId);
  },
};
