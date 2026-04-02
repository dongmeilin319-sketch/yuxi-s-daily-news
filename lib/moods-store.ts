import { sql } from "@vercel/postgres";
import { daysInCstMonth } from "@/lib/cst-calendar";
import { isValidMoodId, type MoodId } from "@/lib/home-mood-calendar";

export type UserMoodRow = {
  dateKey: string;
  moodId: MoodId;
  updatedAt: string;
};

async function ensureMoodTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS user_daily_moods (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      mood_date DATE NOT NULL,
      mood_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, mood_date)
    );
  `;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthDateRangeKeys(year: number, month: number): { start: string; end: string } {
  const last = daysInCstMonth(year, month);
  return {
    start: `${year}-${pad2(month)}-01`,
    end: `${year}-${pad2(month)}-${pad2(last)}`,
  };
}

export function isValidYmdKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const [y, m, d] = key.split("-").map(Number);
  if (m < 1 || m > 12) return false;
  const dim = daysInCstMonth(y, m);
  return d >= 1 && d <= dim;
}

export async function listUserMoodsInMonth(
  userId: string,
  year: number,
  month: number,
): Promise<UserMoodRow[]> {
  if (!userId) return [];
  await ensureMoodTables();
  const { start, end } = monthDateRangeKeys(year, month);
  const rows = await sql<{
    d: string;
    mood_id: string;
    updated_at: Date;
  }>`
    SELECT mood_date::text AS d, mood_id, updated_at
    FROM user_daily_moods
    WHERE user_id = ${userId}
      AND mood_date >= ${start}::date
      AND mood_date <= ${end}::date
    ORDER BY mood_date ASC
  `;
  return rows.rows
    .filter((r) => isValidMoodId(r.mood_id))
    .map((r) => ({
      dateKey: r.d,
      moodId: r.mood_id as MoodId,
      updatedAt: r.updated_at.toISOString(),
    }));
}

export async function setUserDailyMood(
  userId: string,
  dateKey: string,
  moodId: MoodId | null,
): Promise<void> {
  if (!userId) throw new Error("Missing user");
  if (!isValidYmdKey(dateKey)) throw new Error("Invalid date");
  await ensureMoodTables();

  if (moodId === null) {
    await sql`
      DELETE FROM user_daily_moods
      WHERE user_id = ${userId} AND mood_date = ${dateKey}::date
    `;
    return;
  }

  if (!isValidMoodId(moodId)) throw new Error("Invalid mood");

  await sql`
    INSERT INTO user_daily_moods (user_id, mood_date, mood_id)
    VALUES (${userId}, ${dateKey}::date, ${moodId})
    ON CONFLICT (user_id, mood_date)
    DO UPDATE SET
      mood_id = EXCLUDED.mood_id,
      updated_at = NOW()
  `;
}
