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

  async pingMember(callerUserId: string, targetUserId: string) {
    const targetUser = await UserRepository.findById(targetUserId);
    const callerUser = await UserRepository.findById(callerUserId);

    await NotificationRepository.create({
      id: `ping-${Date.now()}-${targetUserId}`,
      userId: targetUserId,
      kind: "alert",
      title: "Daily report reminder",
      body: `${callerUser?.name ?? "Supervisor"} reminded you to file today's daily work report.`,
      href: "/reports",
    });

    await ActivityRepository.create({
      id: `act-${Date.now()}`,
      actorId: callerUserId,
      kind: "ping",
      text: `nudged ${targetUser?.name ?? targetUserId} to submit today's standup`,
    });

    return { success: true };
  },

  async pingAllPending(callerUserId: string, pendingIds: string[]) {
    for (const id of pendingIds) {
      await this.pingMember(callerUserId, id);
    }
    return { count: pendingIds.length };
  },
};
