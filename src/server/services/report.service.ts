import { ReportRepository } from "@/server/repositories/report.repo";
import { ProjectRepository } from "@/server/repositories/project.repo";
import { NotificationRepository } from "@/server/repositories/notification.repo";
import { ActivityRepository } from "@/server/repositories/activity.repo";
import { AuditRepository } from "@/server/repositories/audit.repo";
import { EmailService } from "@/server/email/resend";
import { RealtimeService } from "@/server/realtime/supabase-realtime.ts";
import { getAuthContext, requireProjectAccess, requireCanReviewReport, requireCanEditReport } from "@/server/policies/rbac";
import { NotFoundError, ForbiddenError } from "@/server/errors";
import { SubmitDailyReportSchema, UpdateDailyReportSchema, DailyReportQuerySchema, ReviewReportSchema } from "@/server/schemas";

export const ReportService = {
  async listReports(filter?: {
    authorId?: string;
    projectId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: "draft" | "submitted" | "approved" | "revision";
    limit?: number;
    offset?: number;
  }) {
    return ReportRepository.list(filter);
  },

  async getReport(id: string) {
    const report = await ReportRepository.findById(id);
    if (!report) throw new NotFoundError("Daily report");
    return report;
  },

  async getDailyReport(
    callerUserId: string,
    rawInput: { date: string; projectId?: string; authorId?: string },
  ) {
    const data = DailyReportQuerySchema.parse(rawInput);
    const ctx = await getAuthContext(callerUserId);
    const targetAuthorId = data.authorId || callerUserId;

    if (targetAuthorId !== callerUserId && ctx.role === "member") {
      throw new ForbiddenError("You cannot view another member's daily report");
    }

    if (data.projectId) {
      await requireProjectAccess(ctx, data.projectId);
      return ReportRepository.findByAuthorAndDateWithDetails(targetAuthorId, data.projectId, data.date);
    }

    const list = await ReportRepository.list({ authorId: targetAuthorId, date: data.date });
    return list[0] ?? null;
  },

  async updateReport(
    callerUserId: string,
    rawInput: unknown,
  ) {
    const data = UpdateDailyReportSchema.parse(rawInput);
    const ctx = await getAuthContext(callerUserId);
    const report = await ReportRepository.findById(data.reportId);
    if (!report) throw new NotFoundError("Daily report");

    requireCanEditReport(ctx, report.authorId);

    await ReportRepository.updateReport(data.reportId, {
      hours: data.hours,
      completed: data.completed,
      next_steps: data.next,
      blockers: data.blockers,
      progress: data.progress,
      pr_url: data.prUrl,
      attachment: data.attachment,
      taskCodes: data.taskCodes,
    });

    await ActivityRepository.create({
      id: `act-${Date.now()}`,
      actorId: callerUserId,
      kind: "report",
      text: `updated daily report for ${report.date}`,
      detail: data.completed ? `${data.completed.slice(0, 80)}...` : undefined,
      projectId: report.projectId,
    });

    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "report_updated",
      targetType: "report",
      targetId: data.reportId,
      metadataJson: { projectId: report.projectId, date: report.date },
    });

    await RealtimeService.publish({
      channel: `project:${report.projectId}`,
      event: "report:updated",
      payload: { reportId: data.reportId, authorId: callerUserId, date: report.date },
    });

    return ReportRepository.findById(data.reportId);
  },

  async submitReport(
    callerUserId: string,
    rawInput: unknown,
  ) {
    const data = SubmitDailyReportSchema.parse(rawInput);
    const ctx = await getAuthContext(callerUserId);
    await requireProjectAccess(ctx, data.projectId);

    const id = `r-${callerUserId}-${data.date}`;
    const reportId = await ReportRepository.upsert({
      id,
      author_id: callerUserId,
      project_id: data.projectId,
      report_date: data.date,
      hours: data.hours,
      completed: data.completed,
      next_steps: data.next,
      blockers: data.blockers,
      progress: data.progress,
      status: "submitted",
      pr_url: data.prUrl,
      attachment: data.attachment,
      taskCodes: data.taskCodes,
    });

    // Notify project lead and faculty
    const project = await ProjectRepository.findById(data.projectId);
    const supervisors = Array.from(new Set([project?.leadId, project?.facultyId])).filter(Boolean) as string[];

    for (const supId of supervisors) {
      if (supId !== callerUserId) {
        await NotificationRepository.create({
          id: `notif-${Date.now()}-${supId}`,
          userId: supId,
          kind: "system",
          title: "Daily report filed",
          body: `${project?.name ?? "Project"}: ${data.hours}h logged · ${data.taskCodes.length} tasks linked.`,
          href: "/reports",
        });
      }
    }

    // Activity stream
    await ActivityRepository.create({
      id: `act-${Date.now()}`,
      actorId: callerUserId,
      kind: "report",
      text: `filed daily report for ${project?.name ?? data.projectId}`,
      detail: `${data.hours}h · ${data.completed.slice(0, 80)}...`,
      projectId: data.projectId,
    });

    // Audit log
    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "report_submitted",
      targetType: "report",
      targetId: reportId,
      metadataJson: { projectId: data.projectId, date: data.date, hours: data.hours },
    });

    // Realtime notification broadcast
    await RealtimeService.publish({
      channel: `project:${data.projectId}`,
      event: "report:submitted",
      payload: { reportId, authorId: callerUserId, date: data.date },
    });

    return ReportRepository.findById(reportId);
  },

  async reviewReport(
    callerUserId: string,
    rawInput: unknown,
  ) {
    const data = ReviewReportSchema.parse(rawInput);
    const ctx = await getAuthContext(callerUserId);
    await requireCanReviewReport(ctx, data.reportId);

    const report = await ReportRepository.findById(data.reportId);
    if (!report) throw new NotFoundError("Daily report");

    const reviewId = `rev-${Date.now()}`;
    await ReportRepository.recordReview({
      id: reviewId,
      report_id: data.reportId,
      reviewer_id: callerUserId,
      status: data.status,
      feedback: data.feedback,
    });

    // Notify report author
    await NotificationRepository.create({
      id: `notif-${Date.now()}`,
      userId: report.authorId,
      kind: data.status === "approved" ? "system" : "alert",
      title: data.status === "approved" ? "Daily report approved" : "Revision requested on daily report",
      body: data.feedback || (data.status === "approved" ? "Verified by reviewer." : "Please update report."),
      href: "/reports",
    });

    // Operational activity
    await ActivityRepository.create({
      id: `act-${Date.now()}`,
      actorId: callerUserId,
      kind: "approve",
      text: `${data.status === "approved" ? "approved" : "requested revision on"} Daily Report for ${report.date}`,
      detail: data.feedback,
      projectId: report.projectId,
    });

    // Audit log
    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: `report_${data.status}`,
      targetType: "report",
      targetId: data.reportId,
      metadataJson: { status: data.status, feedback: data.feedback },
    });

    // Transactional email dispatch
    await EmailService.sendTransactionalEmail({
      to: `${report.authorId}@rvit.ac.in`,
      subject: `TeamHub Report Review: ${data.status.toUpperCase()}`,
      html: `<p>Your daily report for <strong>${report.date}</strong> was <strong>${data.status}</strong>.</p><p>Feedback: ${data.feedback || "None"}</p>`,
    });

    // Realtime notification broadcast
    await RealtimeService.publish({
      channel: `project:${report.projectId}`,
      event: "report:reviewed",
      payload: { reportId: data.reportId, status: data.status },
    });

    return ReportRepository.findById(data.reportId);
  },
};
