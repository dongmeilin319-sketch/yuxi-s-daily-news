import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifyLogin } from "@/lib/auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };
  const username = (body.username ?? "").trim();
  const password = body.password ?? "";
  const user = verifyLogin(username, password);
  if (!user) {
    return NextResponse.json({ ok: false, message: "账号或密码错误" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, user });
  res.cookies.set(AUTH_COOKIE_NAME, JSON.stringify(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
