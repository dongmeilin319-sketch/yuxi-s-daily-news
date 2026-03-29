import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "news_auth_user";

export type AuthUser = {
  id: string;
  username: string;
};

type AuthRecord = AuthUser & {
  password: string;
};

function getConfiguredUsers(): AuthRecord[] {
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
        }));
    } catch {
      // fall through
    }
  }

  const username = (process.env.ADMIN_USERNAME ?? "admin").trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) return [];
  return [{ id: "admin", username, password }];
}

export function verifyLogin(username: string, password: string): AuthUser | null {
  const users = getConfiguredUsers();
  const matched = users.find((u) => u.username === username && u.password === password);
  return matched ? { id: matched.id, username: matched.username } : null;
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const raw = store.get(AUTH_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.id || !parsed?.username) return null;
    return parsed;
  } catch {
    return null;
  }
}
