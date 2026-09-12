import { ProjectRepository } from "@/server/repositories/project.repo";
import { AuditRepository } from "@/server/repositories/audit.repo";
import { ActivityRepository } from "@/server/repositories/activity.repo";
import { getAuthContext, requireRole, requireProjectAccess } from "@/server/policies/rbac";
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
    const created = await ProjectRepository.create({
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
      status?: ProjectStatusType;
      progress?: number;
      targetDate?: string;
      targetNote?: string;
      subtitle?: string;
    },
  ) {
    const ctx = await getAuthContext(callerUserId);
    await requireProjectAccess(ctx, projectId);

    const updated = await ProjectRepository.update(projectId, updates);

    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "project_updated",
      targetType: "project",
      targetId: projectId,
      metadataJson: updates,
    });

    return updated;
  },
};
