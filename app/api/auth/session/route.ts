import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdminUsername } from "@/lib/permissions";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: {
      ...user,
      isSuperAdmin: isAdminUsername(user.username),
    },
  });
}
