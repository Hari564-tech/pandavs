import { AnalyticsRepository } from "@/server/repositories/analytics.repo";
import { ActivityRepository } from "@/server/repositories/activity.repo";
import { TODAY } from "@/lib/seed";

export const AnalyticsService = {
  async getDashboardAnalytics() {
    const overview = await AnalyticsRepository.getOverviewMetrics();
    const dailyHours = await AnalyticsRepository.getDailyHoursBreakdown();
    const velocity = await AnalyticsRepository.getWeeklyVelocity();
    const compliance = await AnalyticsRepository.getCompliance(TODAY);
    const recentActivity = await ActivityRepository.listRecent(10);

    return {
      overview,
      dailyHours,
      velocity,
      compliance,
      recentActivity,
    };
  },
};
