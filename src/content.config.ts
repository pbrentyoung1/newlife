import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const imageField = z.object({
  src: z.string().startsWith("/"),
  alt: z.string().min(1),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    reviewedAt: z.coerce.date().optional(),
  }),
});

const articles = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    author: z.string().optional(),
    image: imageField.optional(),
    draft: z.boolean().default(true),
  }),
});

const ministries = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/ministries" }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    audience: z.string().optional(),
    destinationKey: z.string().optional(),
    active: z.boolean().default(false),
    reviewedAt: z.coerce.date().optional(),
  }),
});

const leadership = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/leadership" }),
  schema: z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    image: imageField.optional(),
    email: z.string().email().optional(),
    active: z.boolean().default(false),
    reviewedAt: z.coerce.date().optional(),
  }),
});

const community = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/community" }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    url: z.string().url().optional(),
    active: z.boolean().default(false),
    reviewedAt: z.coerce.date().optional(),
  }),
});

const mediaSeries = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/media-series" }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    playlistUrl: z.string().url(),
    artwork: imageField.optional(),
    publishedAt: z.coerce.date(),
    draft: z.boolean().default(true),
    reviewedAt: z.coerce.date().optional(),
  }),
});

export const collections = {
  pages,
  articles,
  ministries,
  leadership,
  community,
  "media-series": mediaSeries,
};
