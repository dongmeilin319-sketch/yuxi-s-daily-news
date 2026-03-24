"use server";

import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const ADMIN_COOKIE_NAME = "admin_auth";

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    redirect("/admin/login?error=config");
  }

  if (password !== expected) {
    redirect("/admin/login?error=invalid");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  redirect("/admin");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}

export async function publishReviewToDaily(formData: FormData) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE_NAME)?.value === "1";
  if (!authed) {
    redirect("/admin/login");
  }

  const fileName = String(formData.get("fileName") ?? "");
  if (!fileName.endsWith(".mdx") || fileName.includes("/") || fileName.includes("\\")) {
    throw new Error("Invalid review file name");
  }

  const reviewDir = path.join(process.cwd(), "content", "review");
  const dailyDir = path.join(process.cwd(), "content", "daily");
  fs.mkdirSync(reviewDir, { recursive: true });
  fs.mkdirSync(dailyDir, { recursive: true });

  const sourcePath = path.join(reviewDir, fileName);
  const targetPath = path.join(dailyDir, fileName);

  if (!fs.existsSync(sourcePath)) {
    throw new Error("Review file does not exist");
  }
  if (fs.existsSync(targetPath)) {
    throw new Error("Target file already exists in daily");
  }

  fs.renameSync(sourcePath, targetPath);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/news");
}
