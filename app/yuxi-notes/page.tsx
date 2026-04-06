import { SubpageHeader } from "@/components/subpage-header";
import { getSessionUser } from "@/lib/auth";

export default async function YuxiNotesPage() {
  const sessionUser = await getSessionUser();

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-8 pt-0 sm:px-6">
      <SubpageHeader
        title="Yuxi随记"
        subtitle="记录想法、灵感与阶段性总结。"
        englishSubtitle="Yuxi Notes"
        activeTab="notes"
        sessionUsername={sessionUser?.username}
        sessionPermissions={sessionUser?.permissions}
      />

      <section className="rounded-xl border border-zinc-200/90 bg-white/70 p-6 text-center shadow-sm backdrop-blur-sm dark:border-zinc-700/90 dark:bg-zinc-900/45">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">即将上线</p>
      </section>
    </main>
  );
}
