/** 未登录时替代整站主内容区（顶栏仍由 layout 保留） */
export function AuthSiteGate() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">请注册账号后使用本站</p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        本站内容需登录后浏览。请点击右上角「登录」，在弹窗中可注册新账号或使用已有账号登录。
      </p>
    </main>
  );
}
