import { z } from "zod";

const isoDateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "date must be a valid ISO date string");

const nonEmptyString = z.string().trim().min(1);

export const newsFrontmatterSchema = z.object({
  title: nonEmptyString,
  slug: nonEmptyString,
  date: isoDateString,
  summary: nonEmptyString,
  sources: z.array(nonEmptyString).min(1),
  tags: z.array(nonEmptyString).default([]),
  track: nonEmptyString,
  impactType: nonEmptyString,
  sentiment: z.enum(["positive", "neutral", "negative"]),
  confidence: z.number().min(0).max(1),
  relatedArticles: z.array(nonEmptyString).optional(),
  coverImage: z.string().optional(),
});

export const weeklyFrontmatterSchema = z.object({
  title: nonEmptyString,
  slug: nonEmptyString,
  date: isoDateString,
  summary: nonEmptyString,
  weekLabel: nonEmptyString,
});

export type NewsFrontmatter = z.infer<typeof newsFrontmatterSchema>;
export type WeeklyFrontmatter = z.infer<typeof weeklyFrontmatterSchema>;
