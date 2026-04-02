import { cookies } from "next/headers";
import {
  getAllPermissionKeys,
  getLegacyDefaultPermissions,
  isAdminUsername,
  normalizeSessionPermissions,
} from "@/lib/permissions";
import { AUTH_COOKIE_NAME, type AuthUser } from "@/lib/auth-types";
import {
  findActiveUserByUsername,
  isDbUnavailableError,
  verifyPassword,
} from "@/lib/users-store";

export { AUTH_COOKIE_NAME, type AuthUser };

type LegacyAuthRecord = AuthUser & { password: string };

function getConfiguredUsers(): LegacyAuthRecord[] {
  const json = process.env.APP_USERS_JSON?.trim();
  if (json) {
    try {
      const parsed = JSON.parse(json) as Array<{
        id?: string;
        username?: string;
        password?: string;
      }>;
      return parsed
        .filter((x) => x.username && x.password)
        .map((x, i) => ({
          id: x.id?.trim() || `user_${i + 1}`,
          username: String(x.username).trim(),
          password: String(x.password),
          permissions: getLegacyDefaultPermissions(),
        }));
    } catch {
      // fall through
    }
  }

  const username = (process.env.ADMIN_USERNAME ?? "admin").trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) return [];
  return [{ id: "admin", username, password, permissions: getAllPermissionKeys() }];
}

export async function verifyLoginCredential(
  username: string,
  password: string,
): Promise<AuthUser | null> {
  const u = username.trim();
  if (!u) return null;

  try {
    const row = await findActiveUserByUsername(u);
    if (row && verifyPassword(password, row.password_hash)) {
      return {
        id: row.id,
        username: row.username,
        permissions: row.permissions,
      };
    }
  } catch (e) {
    if (!isDbUnavailableError(e)) throw e;
  }

  if (isAdminUsername(u)) {
    const envPass = process.env.ADMIN_PASSWORD?.trim();
    if (envPass && password === envPass) {
      return {
        id: "admin",
        username: u,
        permissions: getAllPermissionKeys(),
      };
    }
  }

  const legacy = getConfiguredUsers();
  const matched = legacy.find((x) => x.username === u && x.password === password);
  if (!matched) return null;
  return {
    id: matched.id,
    username: matched.username,
    permissions: isAdminUsername(matched.username)
      ? getAllPermissionKeys()
      : matched.permissions,
  };
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const raw = store.get(AUTH_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser> & { permissions?: unknown };
    if (!parsed?.id || !parsed?.username) return null;
    const permissions = normalizeSessionPermissions(parsed.username, parsed.permissions);
    return { id: parsed.id, username: parsed.username, permissions };
  } catch {
    return null;
  }
}
