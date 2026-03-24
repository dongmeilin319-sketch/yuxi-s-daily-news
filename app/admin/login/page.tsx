import Link from "next/link";
import { loginAdmin } from "@/app/admin/actions";

type AdminLoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const params = await searchParams;
  const error = params.error;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">管理员登录</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">请输入后台密码进入审核页面。</p>
      </header>

      <form action={loginAdmin} className="mt-6 space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <label className="block space-y-1">
          <span className="text-sm">密码</span>
          <input
            type="password"
            name="password"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            required
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          登录
        </button>
      </form>

      {error === "invalid" && <p className="mt-3 text-sm text-red-500">密码错误，请重试。</p>}
      {error === "config" && (
        <p className="mt-3 text-sm text-red-500">未配置 ADMIN_PASSWORD，请先更新环境变量。</p>
      )}

      <p className="mt-4 text-sm">
        <Link href="/" className="underline underline-offset-4">
          返回首页
        </Link>
      </p>
    </main>
  );
}
