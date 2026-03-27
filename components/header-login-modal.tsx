"use client";

type HeaderLoginModalProps = {
  open: boolean;
  onClose: () => void;
};

export function HeaderLoginModal({ open, onClose }: HeaderLoginModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">账号登录</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-2 py-0.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            关闭
          </button>
        </div>
        <form className="mt-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">账号</label>
            <input
              type="text"
              placeholder="请输入账号"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">密码</label>
            <input
              type="password"
              placeholder="请输入密码"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          <button
            type="button"
            className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          >
            登录（样式占位）
          </button>
        </form>
      </div>
    </div>
  );
}
