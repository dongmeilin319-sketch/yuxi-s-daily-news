#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const isoDateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "date must be a valid ISO date string");
const nonEmptyString = z.string().trim().min(1);

const labelSchema = z.object({
  type: nonEmptyString,
  value: nonEmptyString,
});

const newsFrontmatterSchema = z.object({
  title: nonEmptyString,
  slug: nonEmptyString,
  date: isoDateString,
  publishAt: isoDateString,
  summary: nonEmptyString,
  sources: z.array(nonEmptyString).min(1),
  labels: z.array(labelSchema).min(1),
  track: nonEmptyString,
  impactType: nonEmptyString,
  sentiment: z.enum(["positive", "neutral", "negative"]),
  confidence: z.number().min(0).max(1),
  relatedArticles: z.array(nonEmptyString).optional(),
  coverImage: z.string().optional(),
});

const weeklyFrontmatterSchema = z.object({
  title: nonEmptyString,
  slug: nonEmptyString,
  date: isoDateString,
  summary: nonEmptyString,
  weekLabel: nonEmptyString,
});

function readMdxFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir).filter((name) => name.endsWith(".mdx"));
}

function validateDirectory({ dir, schema, label }) {
  const files = readMdxFiles(dir);
  const slugSet = new Set();
  const errors = [];

  for (const fileName of files) {
    const fullPath = path.join(dir, fileName);
    const raw = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(raw);
    const result = schema.safeParse(data);

    if (!result.success) {
      errors.push(
        `[${label}] ${fileName}: ${JSON.stringify(result.error.flatten().fieldErrors, null, 2)}`,
      );
      continue;
    }

    if (slugSet.has(result.data.slug)) {
      errors.push(`[${label}] ${fileName}: duplicate slug "${result.data.slug}"`);
      continue;
    }
    slugSet.add(result.data.slug);
  }

  return { count: files.length, errors };
}

const root = process.cwd();
const dailyDir = path.join(root, "content", "daily");
const weeklyDir = path.join(root, "content", "weekly");
const reviewDir = path.join(root, "content", "review");
const archiveDir = path.join(root, "content", "archive");

const daily = validateDirectory({
  dir: dailyDir,
  schema: newsFrontmatterSchema,
  label: "daily",
});
const weekly = validateDirectory({
  dir: weeklyDir,
  schema: weeklyFrontmatterSchema,
  label: "weekly",
});
const review = validateDirectory({
  dir: reviewDir,
  schema: newsFrontmatterSchema,
  label: "review",
});
const archive = validateDirectory({
  dir: archiveDir,
  schema: newsFrontmatterSchema,
  label: "archive",
});

const allErrors = [...daily.errors, ...weekly.errors, ...review.errors, ...archive.errors];

if (allErrors.length > 0) {
  console.error("Content validation failed:");
  for (const error of allErrors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Content validation passed. Daily: ${daily.count} files, Weekly: ${weekly.count} files, Review: ${review.count} files, Archive: ${archive.count} files.`,
);
