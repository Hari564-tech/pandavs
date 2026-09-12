import { CalendarRepository } from "@/server/repositories/calendar.repo";
import { CreateCalendarEventSchema } from "@/server/schemas";

export const CalendarService = {
  async listEvents(monthPrefix?: string) {
    return CalendarRepository.list(monthPrefix);
  },

  async createEvent(callerUserId: string, rawInput: unknown) {
    const data = CreateCalendarEventSchema.parse(rawInput);
    const eventId = `e-${Date.now().toString(36)}`;
    return CalendarRepository.create({
      id: eventId,
      projectId: data.projectId,
      title: data.title,
      eventDate: data.eventDate,
      startTime: data.startTime,
      place: data.place,
      kind: data.kind,
      createdBy: callerUserId,
    });
  },
};
