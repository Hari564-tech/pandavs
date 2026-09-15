import { getDb } from "@/server/db/kysely";
import type { RoleType, UserSettingsTable } from "@/server/db/types";

export const UserRepository = {
  async findById(userId: string) {
    const db = getDb();
    return db
      .selectFrom("profiles")
      .selectAll()
      .where("user_id", "=", userId)
      .executeTakeFirst();
  },

  async findByEmail(email: string) {
    const db = getDb();
    return db
      .selectFrom("profiles")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirst();
  },

  async listAll() {
    const db = getDb();
    const profiles = await db.selectFrom("profiles").selectAll().orderBy("name", "asc").execute();

    // Fetch project IDs for each user
    const members = await db.selectFrom("project_members").selectAll().execute();
    const map = new Map<string, string[]>();
    for (const m of members) {
      const list = map.get(m.user_id) ?? [];
      list.push(m.project_id);
      map.set(m.user_id, list);
    }

    return profiles.map((p) => ({
      ...p,
      projectIds: map.get(p.user_id) ?? [],
    }));
  },

  async updateRole(userId: string, role: RoleType) {
    const db = getDb();
    return db
      .updateTable("profiles")
      .set({ role, updated_at: new Date() })
      .where("user_id", "=", userId)
      .returningAll()
      .executeTakeFirst();
  },

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      title?: string;
      dept?: string;
      year?: string | null;
      registration_no?: string | null;
      phone?: string | null;
      bio?: string | null;
      college?: string | null;
      skills?: string | null;
      linkedin_url?: string | null;
      github_url?: string | null;
      portfolio_url?: string | null;
      location?: string | null;
      presence?: "active" | "review" | "offline";
      avatar_url?: string | null;
    },
  ) {
    const db = getDb();
    if (data.name !== undefined || data.avatar_url !== undefined) {
      const userUpdate: Record<string, any> = { updatedAt: new Date() };
      if (data.name !== undefined) userUpdate.name = data.name;
      if (data.avatar_url !== undefined) userUpdate.image = data.avatar_url;
      await db
        .updateTable("user")
        .set(userUpdate)
        .where("id", "=", userId)
        .execute();
    }

    return db
      .updateTable("profiles")
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where("user_id", "=", userId)
      .returningAll()
      .executeTakeFirst();
  },

  async createUserWithAccountAndProfile(data: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    role: RoleType;
    title: string;
    dept: string;
    year?: string | null;
    registration_no?: string | null;
    phone?: string | null;
    college?: string | null;
  }) {
    const db = getDb();
    await db
      .insertInto("user")
      .values({
        id: data.id,
        name: data.name,
        email: data.email,
        emailVerified: true,
        image: null,
      })
      .execute();

    await db
      .insertInto("account")
      .values({
        id: `acc-${data.id}`,
        accountId: data.email,
        providerId: "credential",
        userId: data.id,
        password: data.passwordHash,
        updatedAt: new Date(),
      })
      .execute();

    const parts = data.name.trim().split(/\s+/);
    const short = parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : data.name.slice(0, 2).toUpperCase();

    const profile = await db
      .insertInto("profiles")
      .values({
        id: `prof-${data.id}`,
        user_id: data.id,
        name: data.name,
        short,
        email: data.email,
        role: data.role,
        title: data.title,
        dept: data.dept,
        year: data.year ?? null,
        registration_no: data.registration_no ?? null,
        phone: data.phone ?? null,
        college: data.college ?? null,
        presence: "active",
        avatar_url: null,
        bio: null,
        skills: null,
        linkedin_url: null,
        github_url: null,
        portfolio_url: null,
        location: null,
      })
      .returningAll()
      .executeTakeFirst();

    await db
      .insertInto("user_settings")
      .values({
        user_id: data.id,
        dark_mode: false,
        sidebar_collapsed: false,
        email_notifications: true,
        in_app_notifications: true,
      })
      .execute();

    return profile;
  },

  async resetPassword(userId: string, passwordHash: string) {
    const db = getDb();
    return db
      .updateTable("account")
      .set({
        password: passwordHash,
        updatedAt: new Date(),
      })
      .where("userId", "=", userId)
      .where("providerId", "=", "credential")
      .execute();
  },

  async deleteUser(userId: string) {
    const db = getDb();
    await db.deleteFrom("project_members").where("user_id", "=", userId).execute();
    await db.deleteFrom("user_settings").where("user_id", "=", userId).execute();
    await db.deleteFrom("profiles").where("user_id", "=", userId).execute();
    await db.deleteFrom("account").where("userId", "=", userId).execute();
    await db.deleteFrom("session").where("userId", "=", userId).execute();
    return db.deleteFrom("user").where("id", "=", userId).execute();
  },

  async updatePresence(userId: string, presence: "active" | "review" | "offline") {
    const db = getDb();
    return db
      .updateTable("profiles")
      .set({ presence, updated_at: new Date() })
      .where("user_id", "=", userId)
      .execute();
  },

  async getSettings(userId: string) {
    const db = getDb();
    return db
      .selectFrom("user_settings")
      .selectAll()
      .where("user_id", "=", userId)
      .executeTakeFirst();
  },

  async upsertSettings(
    userId: string,
    settings: Partial<Omit<UserSettingsTable, "user_id" | "created_at" | "updated_at">>,
  ) {
    const db = getDb();
    const existing = await this.getSettings(userId);
    if (existing) {
      return db
        .updateTable("user_settings")
        .set({
          ...settings,
          updated_at: new Date(),
        })
        .where("user_id", "=", userId)
        .returningAll()
        .executeTakeFirst();
    } else {
      return db
        .insertInto("user_settings")
        .values({
          user_id: userId,
          dark_mode: settings.dark_mode ?? false,
          sidebar_collapsed: settings.sidebar_collapsed ?? false,
          email_notifications: settings.email_notifications ?? true,
          in_app_notifications: settings.in_app_notifications ?? true,
        })
        .returningAll()
        .executeTakeFirst();
    }
  },
};
