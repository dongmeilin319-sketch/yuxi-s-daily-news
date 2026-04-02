import { NextResponse } from "next/server";
import { getDefaultNewUserPermissions, isReservedUsername } from "@/lib/permissions";
import { createSiteUser, isDbUnavailableError, usernameExists } from "@/lib/users-store";

export const runtime = "nodejs";

const USERNAME_RE = /^[\w\u4e00-\u9fa5-]{2,32}$/u;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };
  const username = (body.username ?? "").trim();
  const password = body.password ?? "";

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { ok: false, message: "账号 2–32 位，支持字母数字下划线、中文与短横线" },
      { status: 400 },
    );
  }
  if (isReservedUsername(username)) {
    return NextResponse.json({ ok: false, message: "该账号名为管理员保留" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, message: "密码至少 8 位" }, { status: 400 });
  }

  try {
    if (await usernameExists(username)) {
      return NextResponse.json({ ok: false, message: "该账号已被注册" }, { status: 409 });
    }
    await createSiteUser(username, password, getDefaultNewUserPermissions());
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isDbUnavailableError(e)) {
      return NextResponse.json(
        { ok: false, message: "注册服务暂不可用，请确认数据库已配置" },
        { status: 503 },
      );
    }
    throw e;
  }
}
