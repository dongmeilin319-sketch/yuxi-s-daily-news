import {
  getAllArchiveNews,
  getAllNews,
  getAllReviewNews,
  getAllWeekly,
} from "@/lib/content";

export type GlobalSearchResult = {
  id: string;
  title: string;
  excerpt: string;
  href: string;
  kind: "news" | "weekly" | "archive" | "review";
  date: string;
};

function includesKeyword(parts: Array<string | undefined>, keyword: string): boolean {
  const haystack = parts.filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(keyword);
}

export function searchAllContent(keywordRaw: string, limit = 20): GlobalSearchResult[] {
  const keyword = keywordRaw.trim().toLowerCase();
  if (!keyword) return [];

  const news = getAllNews()
    .filter((item) => {
      const labels = item.labels.map((l) => `${l.type} ${l.value}`);
      return includesKeyword(
        [item.title, item.summary, item.track, item.impactType, ...labels],
        keyword,
      );
    })
    .map<GlobalSearchResult>((item) => ({
      id: `news:${item.slug}`,
      title: item.title,
      excerpt: item.summary,
      href: `/news/${item.slug}`,
      kind: "news",
      date: item.publishAt,
    }));

  const archive = getAllArchiveNews()
    .filter((item) => {
      const labels = item.labels.map((l) => `${l.type} ${l.value}`);
      return includesKeyword(
        [item.title, item.summary, item.track, item.impactType, ...labels],
        keyword,
      );
    })
    .map<GlobalSearchResult>((item) => ({
      id: `archive:${item.slug}`,
      title: item.title,
      excerpt: item.summary,
      href: `/news/${item.slug}`,
      kind: "archive",
      date: item.publishAt,
    }));

  const review = getAllReviewNews()
    .filter((item) => {
      const labels = item.labels.map((l) => `${l.type} ${l.value}`);
      return includesKeyword(
        [item.title, item.summary, item.track, item.impactType, ...labels],
        keyword,
      );
    })
    .map<GlobalSearchResult>((item) => ({
      id: `review:${item.slug}`,
      title: item.title,
      excerpt: item.summary,
      href: `/news/${item.slug}`,
      kind: "review",
      date: item.publishAt,
    }));

  const weekly = getAllWeekly()
    .filter((item) => includesKeyword([item.title, item.summary, item.weekLabel], keyword))
    .map<GlobalSearchResult>((item) => ({
      id: `weekly:${item.slug}`,
      title: item.title,
      excerpt: item.summary,
      href: `/weekly/${item.slug}`,
      kind: "weekly",
      date: item.date,
    }));

  return [...news, ...weekly, ...archive, ...review]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, limit);
}
