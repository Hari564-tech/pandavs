import { getDb } from "@/server/db/kysely";

export const CalendarRepository = {
  async list(monthPrefix?: string) {
    const db = getDb();
    let query = db.selectFrom("calendar_events").selectAll().orderBy("event_date", "asc");
    if (monthPrefix) {
      query = query.where("event_date", "like", `${monthPrefix}%`);
    }
    const rows = await query.execute();
    return rows.map((e) => ({
      id: e.id,
      projectId: e.project_id ?? undefined,
      title: e.title,
      date: e.event_date,
      time: e.start_time,
      place: e.place,
      kind: e.kind,
    }));
  },

  async create(data: {
    id: string;
    projectId?: string | null;
    title: string;
    eventDate: string;
    startTime: string;
    place: string;
    kind: "review" | "standup" | "deadline" | "lab";
    createdBy: string;
  }) {
    const db = getDb();
    return db
      .insertInto("calendar_events")
      .values({
        id: data.id,
        project_id: data.projectId ?? null,
        title: data.title,
        event_date: data.eventDate,
        start_time: data.startTime,
        place: data.place,
        kind: data.kind,
        created_by: data.createdBy,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },
};
