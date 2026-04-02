"use client";

import { useCallback, useEffect, useState } from "react";
import { PAGE_PERMISSIONS, type PagePermissionKey } from "@/lib/permissions";

type Session = {
  id: string;
  username: string;
  permissions: string[];
  isSuperAdmin?: boolean;
} | null;

type UserRow = {
  id: string;
  username: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
};

export function AdminDashboard() {
  const [session, setSession] = useState<Session>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [bootLoading, setBootLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "accounts">("overview");
  const [msg, setMsg] = useState<string | null>(null);

  const refreshSession = useCallback(() => {
    void fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { user?: NonNullable<Session> | null }) => setSession(d.user ?? null))
      .finally(() => setBootLoading(false));
  }, []);

  const loadUsers = useCallback(() => {
    void fetch("/api/admin/users", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { ok?: boolean; users?: UserRow[]; message?: string }) => {
        if (!d.ok || !d.users) return;
        setUsers(d.users);
        const next: Record<string, string[]> = {};
        for (const u of d.users) next[u.id] = [...u.permissions];
        setDraft(next);
      });
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (session?.isSuperAdmin && tab === "accounts") loadUsers();
  }, [session?.isSuperAdmin, tab, loadUsers]);

  function togglePerm(userId: string, key: PagePermissionKey, checked: boolean) {
    setDraft((prev) => {
      const cur = [...(prev[userId] ?? [])];
      if (checked) {
        if (!cur.includes(key)) cur.push(key);
      } else {
        const i = cur.indexOf(key);
        if (i >= 0) cur.splice(i, 1);
      }
      return { ...prev, [userId]: cur };
    });
  }

  async function saveUser(userId: string) {
    setMsg(null);
    const perms = draft[userId];
    const r = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: perms }),
    });
    const d = (await r.json().catch(() => ({}))) as { message?: string };
    if (!r.ok) setMsg(d.message || "保存失败");
    else {
      setMsg("已保存权限");
      loadUsers();
    }
  }

  async function deactivateUser(userId: string, username: string) {
    if (!confirm(`确定注销用户「${username}」？该账号将无法再登录。`)) return;
    setMsg(null);
    const r = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    const d = (await r.json().catch(() => ({}))) as { message?: string };
    if (!r.ok) setMsg(d.message || "操作失败");
    else {
      setMsg("已注销该账号");
      loadUsers();
    }
  }

  const tabBtn = (active: boolean) =>
    `border-b-2 px-3 py-2 text-sm font-medium transition ${
      active
        ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300"
        : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
    }`;

  if (!bootLoading && !session) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">请先登录后访问管理后台。</p>
      </main>
    );
  }

  const canAccessAdmin =
    session && (session.permissions?.includes("admin") || session.isSuperAdmin);

  if (!bootLoading && session && !canAccessAdmin) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-sm text-rose-600 dark:text-rose-400">您没有管理后台访问权限。</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">管理后台</h1>
      <div className="mt-4 flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-700">
        <button type="button" className={tabBtn(tab === "overview")} onClick={() => setTab("overview")}>
          概览
        </button>
        {session?.isSuperAdmin ? (
          <button
            type="button"
            className={tabBtn(tab === "accounts")}
            onClick={() => setTab("accounts")}
          >
            账号管理
          </button>
        ) : null}
      </div>

      {msg ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {msg}
        </p>
      ) : null}

      {tab === "overview" ? (
        <section className="mt-6 rounded-xl border border-zinc-200/90 bg-white/70 p-6 shadow-sm dark:border-zinc-700/90 dark:bg-zinc-900/45">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            欢迎进入管理后台。更多运营能力将逐步接入。
          </p>
        </section>
      ) : null}

      {tab === "accounts" && session?.isSuperAdmin ? (
        <section className="mt-6">
          <p className="mb-3 text-xs text-zinc-500">
            仅展示数据库中的注册账号。环境变量管理员不在此列表中。勾选页面权限后点击保存；注销为软删除，用户无法再登录。
          </p>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60">
                  <th className="sticky left-0 z-10 bg-zinc-50 px-2 py-2 font-semibold dark:bg-zinc-800/90">
                    账号
                  </th>
                  <th className="px-2 py-2 font-semibold">状态</th>
                  {PAGE_PERMISSIONS.map((p) => (
                    <th key={p.key} className="whitespace-nowrap px-1 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                      {p.label}
                    </th>
                  ))}
                  <th className="px-2 py-2 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const editable = u.is_active;
                  const perms = draft[u.id] ?? u.permissions;
                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-zinc-100 dark:border-zinc-800 ${!u.is_active ? "opacity-50" : ""}`}
                    >
                      <td className="sticky left-0 z-10 bg-white px-2 py-2 font-medium dark:bg-zinc-950">
                        {u.username}
                      </td>
                      <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">
                        {u.is_active ? "正常" : "已注销"}
                      </td>
                      {PAGE_PERMISSIONS.map((p) => (
                        <td key={p.key} className="px-1 py-1 text-center">
                          <input
                            type="checkbox"
                            className="accent-indigo-600"
                            checked={perms.includes(p.key)}
                            disabled={!editable}
                            onChange={(e) => togglePerm(u.id, p.key, e.target.checked)}
                            aria-label={`${u.username} — ${p.label}`}
                          />
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={!editable}
                            className="rounded border border-zinc-300 px-2 py-0.5 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-600 dark:hover:bg-zinc-800"
                            onClick={() => void saveUser(u.id)}
                          >
                            保存权限
                          </button>
                          <button
                            type="button"
                            disabled={!editable}
                            className="rounded border border-rose-300 px-2 py-0.5 text-rose-700 hover:bg-rose-50 disabled:opacity-40 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                            onClick={() => void deactivateUser(u.id, u.username)}
                          >
                            注销
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {users.length === 0 ? (
              <p className="p-4 text-center text-sm text-zinc-500">暂无注册账号。</p>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
