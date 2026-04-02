import { sql } from "@vercel/postgres";
import { daysInCstMonth } from "@/lib/cst-calendar";
import { isValidYmdKey } from "@/lib/moods-store";

async function ensureScheduleNotesTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS user_daily_schedule_notes (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      schedule_date DATE NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, schedule_date)
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

export async function listUserScheduleNotesInMonth(
  userId: string,
  year: number,
  month: number,
): Promise<Record<string, string>> {
  if (!userId) return {};
  await ensureScheduleNotesTable();
  const { start, end } = monthDateRangeKeys(year, month);
  const rows = await sql<{ d: string; body: string }>`
    SELECT schedule_date::text AS d, body
    FROM user_daily_schedule_notes
    WHERE user_id = ${userId}
      AND schedule_date >= ${start}::date
      AND schedule_date <= ${end}::date
    ORDER BY schedule_date ASC
  `;
  const out: Record<string, string> = {};
  for (const r of rows.rows) {
    out[r.d] = r.body ?? "";
  }
  return out;
}

export async function setUserScheduleNote(userId: string, dateKey: string, body: string): Promise<void> {
  if (!userId) throw new Error("Missing user");
  if (!isValidYmdKey(dateKey)) throw new Error("Invalid date");
  await ensureScheduleNotesTable();
  const trimmed = body.trim();
  if (trimmed === "") {
    await sql`
      DELETE FROM user_daily_schedule_notes
      WHERE user_id = ${userId} AND schedule_date = ${dateKey}::date
    `;
    return;
  }
  await sql`
    INSERT INTO user_daily_schedule_notes (user_id, schedule_date, body)
    VALUES (${userId}, ${dateKey}::date, ${trimmed})
    ON CONFLICT (user_id, schedule_date)
    DO UPDATE SET
      body = EXCLUDED.body,
      updated_at = NOW()
  `;
}
