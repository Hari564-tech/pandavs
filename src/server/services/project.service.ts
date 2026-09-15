import { ProjectRepository } from "@/server/repositories/project.repo";
import { AuditRepository } from "@/server/repositories/audit.repo";
import { ActivityRepository } from "@/server/repositories/activity.repo";
import { getAuthContext, requireRole, requireProjectAccess, requireCanManageProjectMembers } from "@/server/policies/rbac";
import { ValidationError } from "@/server/errors";
import type { ProjectStatusType } from "@/server/db/types";

export const ProjectService = {
  async listProjects() {
    return ProjectRepository.listAll();
  },

  async getProject(projectId: string, callerUserId?: string) {
    if (callerUserId) {
      const ctx = await getAuthContext(callerUserId);
      await requireProjectAccess(ctx, projectId);
    }
    return ProjectRepository.findById(projectId);
  },

  async createProject(
    callerUserId: string,
    data: {
      code: string;
      name: string;
      subtitle?: string;
      status?: ProjectStatusType;
      progress?: number;
      leadId: string;
      facultyId: string;
      targetDate?: string;
      targetNote?: string;
      abstract?: string;
      repoUrl?: string;
      previewUrl?: string;
      cycle?: string;
      stack?: { name: string; note: string }[];
    },
  ) {
    const ctx = await getAuthContext(callerUserId);
    requireRole(ctx, ["super_admin", "faculty", "lead"]);

    const id = data.code.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const existing = await ProjectRepository.findById(id);
    if (existing) {
      throw new ValidationError(`A project with code '${data.code}' already exists. Please choose a different code.`);
    }
    await ProjectRepository.create({
      id,
      code: data.code,
      name: data.name,
      subtitle: data.subtitle ?? "",
      status: data.status ?? "planning",
      progress: data.progress ?? 0,
      lead_id: data.leadId,
      faculty_id: data.facultyId,
      target_date: data.targetDate ?? "TBD",
      target_note: data.targetNote ?? "Planning",
      abstract: data.abstract ?? "",
      repo_url: data.repoUrl ?? "",
      preview_url: data.previewUrl ?? null,
      cycle: data.cycle ?? "Sprint 01",
      stack: data.stack ?? [],
      memberIds: [data.leadId, data.facultyId],
    });

    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "project_created",
      targetType: "project",
      targetId: id,
      metadataJson: { code: data.code, name: data.name },
    });

    await ActivityRepository.create({
      id: `act-${Date.now()}`,
      actorId: callerUserId,
      kind: "commit",
      text: `created strategic project ${data.name} (${data.code})`,
      projectId: id,
    });

    return ProjectRepository.findById(id);
  },

  async updateProject(
    callerUserId: string,
    projectId: string,
    updates: {
      name?: string;
      code?: string;
      subtitle?: string;
      status?: ProjectStatusType;
      progress?: number;
      leadId?: string;
      facultyId?: string;
      targetDate?: string;
      targetNote?: string;
      abstract?: string;
      repoUrl?: string;
      previewUrl?: string;
      cycle?: string;
      stack?: { name: string; note: string }[];
      memberIds?: string[];
    },
  ) {
    const ctx = await getAuthContext(callerUserId);
    requireRole(ctx, ["super_admin", "faculty", "lead"]);

    const repoUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) repoUpdates.name = updates.name;
    if (updates.code !== undefined) repoUpdates.code = updates.code;
    if (updates.subtitle !== undefined) repoUpdates.subtitle = updates.subtitle;
    if (updates.status !== undefined) repoUpdates.status = updates.status;
    if (updates.progress !== undefined) repoUpdates.progress = updates.progress;
    if (updates.leadId !== undefined) repoUpdates.lead_id = updates.leadId;
    if (updates.facultyId !== undefined) repoUpdates.faculty_id = updates.facultyId;
    if (updates.targetDate !== undefined) repoUpdates.target_date = updates.targetDate;
    if (updates.targetNote !== undefined) repoUpdates.target_note = updates.targetNote;
    if (updates.abstract !== undefined) repoUpdates.abstract = updates.abstract;
    if (updates.repoUrl !== undefined) repoUpdates.repo_url = updates.repoUrl;
    if (updates.previewUrl !== undefined) repoUpdates.preview_url = updates.previewUrl;
    if (updates.cycle !== undefined) repoUpdates.cycle = updates.cycle;
    if (updates.stack !== undefined) repoUpdates.stack = updates.stack;
    if (updates.memberIds !== undefined) repoUpdates.memberIds = updates.memberIds;

    const updated = await ProjectRepository.update(projectId, repoUpdates);

    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "project_updated",
      targetType: "project",
      targetId: projectId,
      metadataJson: updates,
    });

    await ActivityRepository.create({
      id: `act-${Date.now()}`,
      actorId: callerUserId,
      kind: "commit",
      text: `updated project details for ${updated?.name || projectId}`,
      projectId,
    });

    return ProjectRepository.findById(projectId);
  },

  async deleteProject(callerUserId: string, projectId: string) {
    const ctx = await getAuthContext(callerUserId);
    requireRole(ctx, ["super_admin", "faculty", "lead"]);

    const project = await ProjectRepository.findById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found.`);
    }

    await ProjectRepository.delete(projectId);

    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "project_deleted",
      targetType: "project",
      targetId: projectId,
      metadataJson: { code: project.code, name: project.name },
    });

    await ActivityRepository.create({
      id: `act-${Date.now()}`,
      actorId: callerUserId,
      kind: "blocker",
      text: `deleted project ${project.name} (${project.code})`,
      projectId: null,
    });

    return { success: true, id: projectId };
  },

  async addMember(
    callerUserId: string,
    projectId: string,
    data: { userId: string; role?: "lead" | "faculty" | "member" },
  ) {
    const ctx = await getAuthContext(callerUserId);
    await requireCanManageProjectMembers(ctx, projectId);

    const updated = await ProjectRepository.addMember(projectId, data.userId, data.role ?? "member");

    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "project_member_added",
      targetType: "project",
      targetId: projectId,
      metadataJson: { userId: data.userId, role: data.role ?? "member" },
    });

    await ActivityRepository.create({
      id: `act-${Date.now()}`,
      actorId: callerUserId,
      kind: "commit",
      text: `added member to project`,
      projectId,
    });

    return updated;
  },

  async removeMember(callerUserId: string, projectId: string, userId: string) {
    const ctx = await getAuthContext(callerUserId);
    await requireCanManageProjectMembers(ctx, projectId);

    const project = await ProjectRepository.findById(projectId);
    if (project && (project.leadId === userId || project.facultyId === userId)) {
      throw new ValidationError("Cannot remove designated project lead or faculty PM from members.");
    }

    const updated = await ProjectRepository.removeMember(projectId, userId);

    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "project_member_removed",
      targetType: "project",
      targetId: projectId,
      metadataJson: { userId },
    });

    await ActivityRepository.create({
      id: `act-${Date.now()}`,
      actorId: callerUserId,
      kind: "blocker",
      text: `removed member from project`,
      projectId,
    });

    return updated;
  },
};
