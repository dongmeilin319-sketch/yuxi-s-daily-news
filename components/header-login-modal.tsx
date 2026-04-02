"use client";

import { FormEvent, useEffect, useState } from "react";

export type SessionUser = {
  id: string;
  username: string;
  permissions: string[];
  isSuperAdmin?: boolean;
};

type HeaderLoginModalProps = {
  open: boolean;
  onClose: () => void;
  onLoggedIn: (user: SessionUser) => void;
};

export function HeaderLoginModal({ open, onClose, onLoggedIn }: HeaderLoginModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMode("login");
      setUsername("");
      setPassword("");
      setPassword2("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  async function onSubmitLogin(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = (await resp.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        user?: SessionUser;
      };
      if (!resp.ok || !data.ok || !data.user) {
        throw new Error(data.message || "登录失败");
      }
      onLoggedIn(data.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitRegister(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    if (password !== password2) {
      setError("两次输入的密码不一致");
      setSubmitting(false);
      return;
    }
    try {
      const resp = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = (await resp.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!resp.ok || !data.ok) {
        throw new Error(data.message || "注册失败");
      }
      const loginResp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const loginData = (await loginResp.json().catch(() => ({}))) as {
        ok?: boolean;
        user?: SessionUser;
        message?: string;
      };
      if (!loginResp.ok || !loginData.ok || !loginData.user) {
        throw new Error(loginData.message || "注册成功，请手动登录");
      }
      onLoggedIn(loginData.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{mode === "login" ? "账号登录" : "注册账号"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-2 py-0.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            关闭
          </button>
        </div>

        {mode === "login" ? (
          <form className="mt-4 space-y-3" onSubmit={onSubmitLogin}>
            <div className="space-y-1">
              <label htmlFor="header-login-user" className="text-xs text-zinc-500">
                账号
              </label>
              <input
                id="header-login-user"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(ev) => setUsername(ev.target.value)}
                placeholder="请输入账号"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="header-login-pass" className="text-xs text-zinc-500">
                密码
              </label>
              <input
                id="header-login-pass"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                placeholder="请输入密码"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
            {error ? <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {submitting ? "登录中…" : "登录"}
            </button>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                className="text-xs text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
              >
                注册
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={onSubmitRegister}>
            <div className="space-y-1">
              <label htmlFor="header-reg-user" className="text-xs text-zinc-500">
                账号
              </label>
              <input
                id="header-reg-user"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(ev) => setUsername(ev.target.value)}
                placeholder="2–32 位，字母数字下划线、中文等"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="header-reg-pass" className="text-xs text-zinc-500">
                密码（至少 8 位）
              </label>
              <input
                id="header-reg-pass"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                placeholder="请输入密码"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="header-reg-pass2" className="text-xs text-zinc-500">
                确认密码
              </label>
              <input
                id="header-reg-pass2"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(ev) => setPassword2(ev.target.value)}
                placeholder="请再次输入密码"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
            {error ? <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {submitting ? "提交中…" : "注册并登录"}
            </button>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                className="text-xs text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
              >
                返回登录
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
