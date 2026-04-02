import { ScheduleMoodsClient } from "@/components/schedule-moods-client";
import { SubpageHeader } from "@/components/subpage-header";
import { cstCalendarPartsFromDate } from "@/lib/cst-wall-clock";

export default function SchedulePage() {
  const { year, month, todayKey } = cstCalendarPartsFromDate(new Date());

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <SubpageHeader
        title="日程"
        subtitle="左侧月历选择日期，右侧编辑当日文字日程与心情（登录后按账号存储）。"
        englishSubtitle="Schedule"
        activeTab="schedule"
      />

      <ScheduleMoodsClient initialYear={year} initialMonth={month} todayKey={todayKey} />
    </main>
  );
}
