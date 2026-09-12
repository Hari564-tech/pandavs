import { UserRepository } from "@/server/repositories/user.repo";
import { AuditRepository } from "@/server/repositories/audit.repo";
import { ActivityRepository } from "@/server/repositories/activity.repo";
import { getAuthContext, requireUserAdmin } from "@/server/policies/rbac";
import { StorageService } from "@/server/storage/supabase-storage";
import { ForbiddenError, ConflictError, NotFoundError } from "@/server/errors";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import type { RoleType, UserSettingsTable } from "@/server/db/types";

export const UserService = {
  async getMe(userId: string) {
    const profile = await UserRepository.findById(userId);
    const settings = await UserRepository.getSettings(userId);
    return {
      profile,
      settings,
    };
  },

  async listTeam() {
    return UserRepository.listAll();
  },

  async updateProfile(
    callerUserId: string,
    targetUserId: string,
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
    // A user can only edit their own profile unless they are super_admin
    if (callerUserId !== targetUserId) {
      const ctx = await getAuthContext(callerUserId);
      requireUserAdmin(ctx);
    }

    const updated = await UserRepository.updateProfile(targetUserId, data);
    if (!updated) throw new NotFoundError("User profile");

    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "profile_updated",
      targetType: "user",
      targetId: targetUserId,
      metadataJson: { updatedFields: Object.keys(data) },
    });

    return updated;
  },

  async presignAvatarUpload(
    userId: string,
    data: {
      mimeType: string;
      sizeBytes: number;
      fileName: string;
    },
  ) {
    return StorageService.createSignedAvatarUploadUrl({
      userId,
      filename: data.fileName,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
    });
  },

  async uploadAvatarDirect(
    callerUserId: string,
    targetUserId: string,
    data: {
      fileName: string;
      mimeType: string;
      base64: string;
    },
  ) {
    if (callerUserId !== targetUserId) {
      const ctx = await getAuthContext(callerUserId);
      requireUserAdmin(ctx);
    }

    const base64Clean = data.base64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Clean, "base64");

    const { storagePath, publicUrl } = await StorageService.uploadAvatarDirect({
      userId: targetUserId,
      buffer,
      mimeType: data.mimeType,
      filename: data.fileName,
    });

    const updated = await UserRepository.updateProfile(targetUserId, {
      avatar_url: publicUrl,
    });

    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "avatar_updated",
      targetType: "user",
      targetId: targetUserId,
      metadataJson: { storagePath, publicUrl },
    });

    return {
      avatarUrl: publicUrl,
      profile: updated,
    };
  },

  async createUser(
    callerUserId: string,
    data: {
      email: string;
      password: string;
      name: string;
      role: RoleType;
      title: string;
      dept: string;
      year?: string | null;
      registration_no?: string | null;
      phone?: string | null;
      college?: string | null;
    },
  ) {
    const ctx = await getAuthContext(callerUserId);
    requireUserAdmin(ctx);

    const existing = await UserRepository.findByEmail(data.email.trim().toLowerCase());
    if (existing) {
      throw new ConflictError("A user with this email address already exists.");
    }

    const passwordHash = await hashPassword(data.password);
    const id = `u_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

    const profile = await UserRepository.createUserWithAccountAndProfile({
      ...data,
      id,
      email: data.email.trim().toLowerCase(),
      passwordHash,
    });

    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "user_created",
      targetType: "user",
      targetId: id,
      metadataJson: { email: data.email, role: data.role },
    });

    await ActivityRepository.create({
      id: `act-${Date.now()}`,
      actorId: callerUserId,
      kind: "commit",
      text: `created account for ${data.name} (${data.role})`,
    });

    try {
      const { getDb } = await import("@/server/db/kysely");
      const db = getDb();
      await db
        .insertInto("project_members")
        .values({
          project_id: "team-portal",
          user_id: id,
          member_role: data.role === "lead" || data.role === "super_admin" ? "lead" : "member",
        })
        .onConflict((oc) => oc.columns(["project_id", "user_id"]).doNothing())
        .execute();
    } catch (err) {
      console.warn("[UserService] Failed to assign user to project:", err);
    }

    return profile;
  },

  async resetPassword(callerUserId: string, targetUserId: string, newPass: string) {
    const ctx = await getAuthContext(callerUserId);
    requireUserAdmin(ctx);

    const target = await UserRepository.findById(targetUserId);
    if (!target) throw new NotFoundError("User");

    const passwordHash = await hashPassword(newPass);
    await UserRepository.resetPassword(targetUserId, passwordHash);

    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "password_reset",
      targetType: "user",
      targetId: targetUserId,
      metadataJson: {},
    });

    return { success: true };
  },

  async deleteUser(callerUserId: string, targetUserId: string) {
    const ctx = await getAuthContext(callerUserId);
    requireUserAdmin(ctx);

    if (callerUserId === targetUserId) {
      throw new ForbiddenError("You cannot delete your own account.");
    }

    await UserRepository.deleteUser(targetUserId);

    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "user_deleted",
      targetType: "user",
      targetId: targetUserId,
      metadataJson: {},
    });

    return { success: true };
  },

  async updateRole(callerUserId: string, targetUserId: string, newRole: RoleType) {
    const ctx = await getAuthContext(callerUserId);
    requireUserAdmin(ctx);

    const updated = await UserRepository.updateRole(targetUserId, newRole);

    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "role_updated",
      targetType: "user",
      targetId: targetUserId,
      metadataJson: { newRole },
    });

    await ActivityRepository.create({
      id: `act-${Date.now()}`,
      actorId: callerUserId,
      kind: "commit",
      text: `updated role for ${updated?.name ?? targetUserId} to ${newRole}`,
    });

    return updated;
  },

  async updateSettings(userId: string, settings: Partial<UserSettingsTable>) {
    return UserRepository.upsertSettings(userId, settings);
  },
};
