import { NotificationRepository } from "@/server/repositories/notification.repo";
import { ActivityRepository } from "@/server/repositories/activity.repo";
import { UserRepository } from "@/server/repositories/user.repo";

export const NotificationService = {
  async listNotifications(callerUserId: string) {
    return NotificationRepository.listForUser(callerUserId);
  },

  async markRead(callerUserId: string, id: string) {
    return NotificationRepository.markRead(id, callerUserId);
  },

  async markAllRead(callerUserId: string) {
    return NotificationRepository.markAllRead(callerUserId);
  },

  async pingMember(
    callerUserId: string,
    targetUserId: string,
    customMessage?: string,
    customTitle?: string,
    href?: string,
  ) {
    const targetUser = await UserRepository.findById(targetUserId);
    const callerUser = await UserRepository.findById(callerUserId);

    await NotificationRepository.create({
      id: `ping-${Date.now()}-${targetUserId.slice(0, 8)}-${Math.random().toString(36).slice(2, 6)}`,
      userId: targetUserId,
      kind: "alert",
      title: customTitle || "Daily report reminder",
      body:
        customMessage ||
        `${callerUser?.name ?? "Supervisor"} reminded you to file today's daily work report.`,
      href: href || "/reports",
    });

    await ActivityRepository.create({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      actorId: callerUserId,
      kind: "ping",
      text: `reminded ${targetUser?.name ?? targetUserId} (${customTitle || "daily standup"})`,
    });

    return { success: true };
  },

  async pingAllPending(callerUserId: string, pendingIds: string[]) {
    for (const id of pendingIds) {
      await this.pingMember(callerUserId, id);
    }
    return { count: pendingIds.length };
  },

  async sendReminder(
    callerUserId: string,
    data: { targetUserId: string; title: string; body: string; href?: string },
  ) {
    return this.pingMember(
      callerUserId,
      data.targetUserId,
      data.body,
      data.title,
      data.href,
    );
  },
};
