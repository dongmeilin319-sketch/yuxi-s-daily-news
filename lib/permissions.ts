/**
 * 站内「页面级」权限点。管理员账号（环境变量 ADMIN_USERNAME，默认 admin）始终拥有全部权限。
 * 本文件无 Node 专属 API，可供 middleware（Edge）与 Route Handler 共用。
 */
export const PAGE_PERMISSIONS = [
  { key: "home", label: "首页", path: "/" },
  { key: "daily", label: "每日新闻", path: "/daily" },
  { key: "weekly", label: "周刊", path: "/weekly" },
  { key: "archive", label: "归档", path: "/archive" },
  { key: "schedule", label: "日程", path: "/schedule" },
  { key: "yuxi_notes", label: "Yuxi 笔记", path: "/yuxi-notes" },
  { key: "search", label: "搜索", path: "/search" },
  { key: "news", label: "新闻正文", path: "/news/*" },
  { key: "admin", label: "管理后台", path: "/admin" },
] as const;

export type PagePermissionKey = (typeof PAGE_PERMISSIONS)[number]["key"];

export function getAllPermissionKeys(): PagePermissionKey[] {
  return PAGE_PERMISSIONS.map((p) => p.key);
}

export function isAdminUsername(username: string): boolean {
  const admin = (process.env.ADMIN_USERNAME ?? "admin").trim().toLowerCase();
  return username.trim().toLowerCase() === admin;
}

export function isReservedUsername(username: string): boolean {
  return isAdminUsername(username);
}

/** 新注册用户默认可访问的页面（不含管理后台） */
export function getDefaultNewUserPermissions(): PagePermissionKey[] {
  return ["home", "daily", "news", "weekly", "archive", "schedule", "search", "yuxi_notes"];
}

/** 旧版 cookie 无 permissions 字段时的兼容：除管理后台外均可访问 */
export function getLegacyDefaultPermissions(): PagePermissionKey[] {
  return getAllPermissionKeys().filter((k) => k !== "admin");
}

/** 与 getSessionUser / middleware 对齐：旧 cookie 无 permissions、管理员扩权 */
export function normalizeSessionPermissions(username: string, raw: unknown): string[] {
  if (isAdminUsername(username)) return getAllPermissionKeys();
  const arr = Array.isArray(raw) ? raw.map(String) : [];
  if (arr.length === 0) return getLegacyDefaultPermissions();
  return arr;
}

export function userHasPagePermission(
  username: string,
  permissions: unknown,
  key: PagePermissionKey,
): boolean {
  return normalizeSessionPermissions(username, permissions).includes(key);
}

/**
 * 将请求路径映射到权限 key；未列出的路径不做登录态拦截（由页面自行处理）。
 */
export function pathnameToPermissionKey(pathname: string): PagePermissionKey | null {
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) return null;
  if (pathname === "/" || pathname === "") return "home";
  if (pathname.startsWith("/daily")) return "daily";
  if (pathname.startsWith("/news/")) return "news";
  if (pathname.startsWith("/weekly")) return "weekly";
  if (pathname.startsWith("/archive")) return "archive";
  if (pathname.startsWith("/schedule")) return "schedule";
  if (pathname.startsWith("/yuxi-notes")) return "yuxi_notes";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/admin")) return "admin";
  return null;
}
