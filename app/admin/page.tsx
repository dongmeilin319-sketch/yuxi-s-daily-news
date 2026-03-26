import Link from "next/link";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAllNews, getAllReviewNews } from "@/lib/content";
import { logoutAdmin, publishReviewToDaily } from "@/app/admin/actions";
import { NewsLabels } from "@/components/news-labels";

const ADMIN_COOKIE_NAME = "admin_auth";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE_NAME)?.value === "1";

  if (!authed) {
    redirect("/admin/login");
  }

  const news = getAllNews();
  const reviewNews = getAllReviewNews();
  const reviewDir = path.join(process.cwd(), "content", "review");
  const reviewSlugToFile = new Map<string, string>();
  if (fs.existsSync(reviewDir)) {
    const files = fs.readdirSync(reviewDir).filter((name) => name.endsWith(".mdx"));
    for (const fileName of files) {
      const raw = fs.readFileSync(path.join(reviewDir, fileName), "utf8");
      const { data } = matter(raw);
      if (data?.slug) {
        reviewSlugToFile.set(String(data.slug), fileName);
      }
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">管理后台（MVP）</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">当前先提供审核列表占位，后续接入一键发布/编辑/删除。</p>
        </div>
        <form action={logoutAdmin}>
          <button type="submit" className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
            退出登录
          </button>
        </form>
      </header>

      <section className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold">待审核（review）</h2>
        {reviewNews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            当前没有待审核内容。
          </div>
        ) : (
          reviewNews.map((item) => {
            const fileName = reviewSlugToFile.get(item.slug);
            return (
              <article key={`review-${item.slug}`} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{item.summary}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span>发布时间：{new Date(item.publishAt).toLocaleDateString("zh-CN")}</span>
                  <span>置信度 {item.confidence.toFixed(2)}</span>
                  <span>情绪 {item.sentiment}</span>
                  <span>赛道 {item.track}</span>
                </div>
                <NewsLabels labels={item.labels} linkable={false} />
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs text-zinc-500">文件：{fileName ?? "unknown"}</span>
                  {fileName ? (
                    <form action={publishReviewToDaily}>
                      <input type="hidden" name="fileName" value={fileName} />
                      <button
                        type="submit"
                        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                      >
                        发布到 daily
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-red-500">未找到对应文件名，无法发布</span>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">已发布（daily）</h2>
        {news.map((item) => (
          <article key={item.slug} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{item.summary}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
              <span>发布时间：{new Date(item.publishAt).toLocaleDateString("zh-CN")}</span>
              <span>置信度 {item.confidence.toFixed(2)}</span>
              <span>情绪 {item.sentiment}</span>
              <span>赛道 {item.track}</span>
            </div>
            <NewsLabels labels={item.labels} linkable={false} />
            <p className="mt-2 text-sm">
              <Link href={`/news/${item.slug}`} className="underline underline-offset-4">
                查看详情
              </Link>
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
