import { sql } from "@vercel/postgres";

export type NewsRating = {
  slug: string;
  userId: string;
  rating: number;
  updatedAt: string;
};

function assertRatingValue(value: number | null): void {
  if (value === null) return;
  if (!Number.isFinite(value)) throw new Error("Invalid rating");
  if (value < 0.5 || value > 5) throw new Error("Rating out of range");
  if (Math.round(value * 2) !== value * 2) throw new Error("Rating must be in 0.5 steps");
}

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS news_ratings (
      id BIGSERIAL PRIMARY KEY,
      news_slug TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rating NUMERIC(2, 1) NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(news_slug, user_id)
    );
  `;
}

export async function getRatingsByUserAndSlugs(userId: string, slugs: string[]) {
  if (!userId || slugs.length === 0) return new Map<string, number>();
  await ensureTables();
  const set = new Set(slugs);
  const rows = await sql<{
    news_slug: string;
    rating: string | number;
  }>`
    SELECT news_slug, rating
    FROM news_ratings
    WHERE user_id = ${userId}
  `;
  const map = new Map<string, number>();
  for (const row of rows.rows) {
    if (!set.has(row.news_slug)) continue;
    map.set(row.news_slug, Number(row.rating));
  }
  return map;
}

export async function setNewsRating(userId: string, slug: string, rating: number | null) {
  if (!userId || !slug.trim()) throw new Error("Missing rating target");
  assertRatingValue(rating);
  await ensureTables();

  if (rating === null) {
    await sql`
      DELETE FROM news_ratings
      WHERE user_id = ${userId}
        AND news_slug = ${slug}
    `;
    return;
  }

  await sql`
    INSERT INTO news_ratings (news_slug, user_id, rating, updated_at)
    VALUES (${slug}, ${userId}, ${rating}, NOW())
    ON CONFLICT (news_slug, user_id)
    DO UPDATE SET
      rating = EXCLUDED.rating,
      updated_at = NOW()
  `;
}
