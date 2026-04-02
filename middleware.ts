import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-types";
import { pathnameToPermissionKey, userHasPagePermission } from "@/lib/permissions";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const key = pathnameToPermissionKey(pathname);
  if (!key) return NextResponse.next();

  const raw = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!raw) return NextResponse.next();

  let session: { username?: string; permissions?: unknown } | null = null;
  try {
    session = JSON.parse(raw) as { username?: string; permissions?: unknown };
  } catch {
    return NextResponse.next();
  }
  if (!session?.username) return NextResponse.next();

  if (userHasPagePermission(session.username, session.permissions, key)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("forbidden", "1");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
