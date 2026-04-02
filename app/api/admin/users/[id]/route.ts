import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAllPermissionKeys, isAdminUsername, type PagePermissionKey } from "@/lib/permissions";
import {
  isDbUnavailableError,
  listSiteUsers,
  setSiteUserActive,
  updateSiteUserPermissions,
} from "@/lib/users-store";

export const runtime = "nodejs";

const ALL = new Set<string>(getAllPermissionKeys());

function sanitizePermissions(raw: unknown): PagePermissionKey[] {
  if (!Array.isArray(raw)) return [];
  const out: PagePermissionKey[] = [];
  for (const x of raw) {
    const k = String(x);
    if (ALL.has(k)) out.push(k as PagePermissionKey);
  }
  return [...new Set(out)];
}

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const session = await getSessionUser();
  if (!session?.username || !isAdminUsername(session.username)) {
    return NextResponse.json({ ok: false, message: "无权限" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { permissions?: unknown };
  const permissions = sanitizePermissions(body.permissions);

  try {
    const users = await listSiteUsers();
    const target = users.find((u) => u.id === id);
    if (!target) {
      return NextResponse.json({ ok: false, message: "用户不存在" }, { status: 404 });
    }
    if (isAdminUsername(target.username)) {
      return NextResponse.json({ ok: false, message: "不能修改管理员权限" }, { status: 400 });
    }
    await updateSiteUserPermissions(id, permissions);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isDbUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: "数据库不可用" }, { status: 503 });
    }
    throw e;
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const session = await getSessionUser();
  if (!session?.username || !isAdminUsername(session.username)) {
    return NextResponse.json({ ok: false, message: "无权限" }, { status: 403 });
  }
  const { id } = await ctx.params;

  if (session.id === id) {
    return NextResponse.json({ ok: false, message: "不能注销当前登录账号" }, { status: 400 });
  }

  try {
    const users = await listSiteUsers();
    const target = users.find((u) => u.id === id);
    if (!target) {
      return NextResponse.json({ ok: false, message: "用户不存在" }, { status: 404 });
    }
    if (isAdminUsername(target.username)) {
      return NextResponse.json({ ok: false, message: "不能注销管理员账号" }, { status: 400 });
    }
    await setSiteUserActive(id, false);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isDbUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: "数据库不可用" }, { status: 503 });
    }
    throw e;
  }
}
