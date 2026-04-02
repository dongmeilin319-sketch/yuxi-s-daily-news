import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";
import type { PagePermissionKey } from "@/lib/permissions";

export type SiteUserRow = {
  id: string;
  username: string;
  password_hash: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
};

async function ensureUserTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS site_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      permissions TEXT NOT NULL DEFAULT '[]',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
}

function parsePermissionsJson(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function isDbUnavailableError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("missing_connection_string") ||
    msg.includes("VercelPostgresError") ||
    msg.includes("connection")
  );
}

export async function findActiveUserByUsername(username: string): Promise<SiteUserRow | null> {
  const u = username.trim();
  if (!u) return null;
  await ensureUserTables();
  const rows = await sql<{
    id: string;
    username: string;
    password_hash: string;
    permissions: string;
    is_active: boolean;
    created_at: Date;
  }>`
    SELECT id, username, password_hash, permissions, is_active, created_at
    FROM site_users
    WHERE lower(username) = lower(${u}) AND is_active = TRUE
    LIMIT 1
  `;
  const row = rows.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    password_hash: row.password_hash,
    permissions: parsePermissionsJson(row.permissions),
    is_active: row.is_active,
    created_at: row.created_at.toISOString(),
  };
}

export async function usernameExists(username: string): Promise<boolean> {
  const u = username.trim();
  if (!u) return false;
  await ensureUserTables();
  const rows = await sql<{ x: number }>`
    SELECT 1 AS x FROM site_users WHERE lower(username) = lower(${u}) LIMIT 1
  `;
  return rows.rows.length > 0;
}

export async function createSiteUser(
  username: string,
  plainPassword: string,
  permissions: PagePermissionKey[],
): Promise<SiteUserRow> {
  await ensureUserTables();
  const id = crypto.randomUUID();
  const hash = bcrypt.hashSync(plainPassword, 10);
  const perms = [...new Set(permissions)];
  const permsJson = JSON.stringify(perms);
  await sql`
    INSERT INTO site_users (id, username, password_hash, permissions, is_active)
    VALUES (${id}, ${username.trim()}, ${hash}, ${permsJson}, TRUE)
  `;
  return {
    id,
    username: username.trim(),
    password_hash: hash,
    permissions: perms,
    is_active: true,
    created_at: new Date().toISOString(),
  };
}

export async function listSiteUsers(): Promise<Omit<SiteUserRow, "password_hash">[]> {
  await ensureUserTables();
  const rows = await sql<{
    id: string;
    username: string;
    permissions: string;
    is_active: boolean;
    created_at: Date;
  }>`
    SELECT id, username, permissions, is_active, created_at
    FROM site_users
    ORDER BY created_at ASC
  `;
  return rows.rows.map((r) => ({
    id: r.id,
    username: r.username,
    permissions: parsePermissionsJson(r.permissions),
    is_active: r.is_active,
    created_at: r.created_at.toISOString(),
  }));
}

export async function updateSiteUserPermissions(
  userId: string,
  permissions: PagePermissionKey[],
): Promise<void> {
  await ensureUserTables();
  const perms = [...new Set(permissions)];
  const permsJson = JSON.stringify(perms);
  await sql`
    UPDATE site_users
    SET permissions = ${permsJson}
    WHERE id = ${userId}
  `;
}

export async function setSiteUserActive(userId: string, active: boolean): Promise<void> {
  await ensureUserTables();
  await sql`
    UPDATE site_users SET is_active = ${active} WHERE id = ${userId}
  `;
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}
