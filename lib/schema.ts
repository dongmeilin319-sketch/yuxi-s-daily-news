import { z } from "zod";

const isoDateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "date must be a valid ISO date string");

const nonEmptyString = z.string().trim().min(1);

export const labelSchema = z.object({
  type: nonEmptyString,
  value: nonEmptyString,
});

export type NewsLabel = z.infer<typeof labelSchema>;

export const newsFrontmatterSchema = z.object({
  title: nonEmptyString,
  slug: nonEmptyString,
  date: isoDateString,
  publishAt: isoDateString,
  // 采集入库时间（生成端写入）
  collectedAt: isoDateString.optional(),
  summary: nonEmptyString,
  sources: z.array(nonEmptyString).min(1),
  labels: z.array(labelSchema).min(1),
  track: nonEmptyString,
  impactType: nonEmptyString,
  sentiment: z.enum(["positive", "neutral", "negative"]),
  confidence: z.number().min(0).max(1),
  relatedArticles: z.array(nonEmptyString).optional(),
  coverImage: z.string().optional(),
  // 原文链接：点击“查看原文”跳转到新闻源页面
  originalUrl: z.string().url().optional(),
});

export const weeklyFrontmatterSchema = z.object({
  title: nonEmptyString,
  slug: nonEmptyString,
  date: isoDateString,
  summary: nonEmptyString,
  weekLabel: nonEmptyString,
  /** 本周活跃公司（列表副标题展示；可选） */
  activeCompanies: z.array(nonEmptyString).optional(),
});

export type NewsFrontmatter = z.infer<typeof newsFrontmatterSchema>;
export type WeeklyFrontmatter = z.infer<typeof weeklyFrontmatterSchema>;
