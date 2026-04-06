import { ScheduleMoodsClient } from "@/components/schedule-moods-client";
import { SubpageHeader } from "@/components/subpage-header";
import { getSessionUser } from "@/lib/auth";
import { cstCalendarPartsFromDate } from "@/lib/cst-wall-clock";

export default async function SchedulePage() {
  const { year, month, todayKey } = cstCalendarPartsFromDate(new Date());
  const sessionUser = await getSessionUser();

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <SubpageHeader
        title="日程"
        subtitle="左侧月历选日，右侧 deer-dairy 手记与心情（登录后按账号存储）。"
        englishSubtitle="Schedule"
        activeTab="schedule"
        sessionUsername={sessionUser?.username}
        sessionPermissions={sessionUser?.permissions}
      />

      <ScheduleMoodsClient initialYear={year} initialMonth={month} todayKey={todayKey} />
    </main>
  );
}
