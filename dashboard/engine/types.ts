import { z } from "zod";

export const platformSchema = z.enum([
  "x",
  "instagram",
  "facebook",
  "threads",
  "linkedin",
  "bluesky",
]);
export const providerSchema = z.enum([
  "anthropic",
  "openai",
  "typefully",
  "zernio",
  "rapidapi",
  "apify",
]);
const text = z.string().trim().max(20000);
const list = z.array(z.string().trim().min(1).max(500)).max(50);
export const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,31}$/),
    industry: z.enum(["technology", "restaurant", "other"]),
    description: text.default(""),
    website: z.union([z.string().url(), z.literal("")]).default(""),
    language: z.enum(["en", "nb", "nb+en"]).default("en"),
    timezone: z
      .string()
      .refine((v) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, "Choose a valid timezone")
      .default("Europe/Oslo"),
    audience: text.default(""),
    voice: text.default(""),
    facts: text.default(""),
    keywords: list.default([]),
    avoid: list.default([]),
    peers: list.default([]),
    hashtags: list.default([]),
    color: z
      .string()
      .regex(/^#[a-fA-F0-9]{6}$/)
      .default("#ff6b35"),
    channels: z.array(platformSchema).min(1).max(6),
    sources: z
      .array(
        z.enum([
          "brief",
          "google-trends",
          "norway-calendar",
          "oslo-weather",
          "oslo-news",
          "rapidapi",
          "apify-x",
        ]),
      )
      .min(1)
      .default(["brief"]),
    approver: z
      .object({
        name: text.default(""),
        email: z.union([z.string().email(), z.literal("")]).default(""),
      })
      .default({}),
    restaurant: z
      .object({
        address: text.default(""),
        district: text.default(""),
        hours: text.default(""),
        booking: text.default(""),
        menu: text.default(""),
        events: text.default(""),
        alcohol: z.boolean().default(false),
        licenceHolder: text.default(""),
        photoRights: z.boolean().default(false),
      })
      .optional(),
    llm: z
      .object({
        provider: z.enum(["anthropic", "openai"]).default("anthropic"),
        model: z.string().min(1).max(120).default("claude-sonnet-4-6"),
        inputRate: z.number().min(0).default(3),
        outputRate: z.number().min(0).default(15),
        monthlyBudget: z.number().min(1).max(10000).default(25),
      })
      .default({}),
    mediaCredits: z.number().int().min(0).max(10000).default(300),
    automation: z
      .object({
        enabled: z.boolean().default(false),
        intervalHours: z.number().int().min(24).max(168).default(168),
        brief: text.default(""),
      })
      .default({}),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.industry === "restaurant" && !v.restaurant)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["restaurant"],
        message: "Restaurant details are required",
      });
    if (v.industry !== "restaurant" && v.restaurant)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["restaurant"],
        message: "Restaurant settings belong only to restaurants",
      });
  });
export type Profile = z.infer<typeof profileSchema>;
export type Client = Profile & { id: string; createdAt: string };
export type Platform = z.infer<typeof platformSchema>;
export type Provider = z.infer<typeof providerSchema>;
export const variantSchema = z.object({
  platform: platformSchema,
  text: z.string().trim().min(1).max(5000),
});
export const draftSchema = z.object({
  title: z.string().trim().min(1).max(180),
  variants: z.array(variantSchema).min(1).max(6),
  assetIds: z.array(z.string()).max(10).default([]),
  notes: z.string().max(5000).default(""),
});
export type DraftInput = z.infer<typeof draftSchema>;
export type Draft = DraftInput & {
  id: string;
  clientId: string;
  status: string;
  hash: string;
  createdAt: string;
  scheduledFor: string | null;
  externalId: string | null;
  externalProvider: string | null;
  approvals: string[];
};
export type Asset = {
  id: string;
  clientId: string;
  name: string;
  path: string;
  mime: string;
  sha: string;
  kind: "photo" | "graphic" | "video";
  ai: boolean;
  alcohol: boolean;
  consent: boolean;
  sourceId: string | null;
  createdAt: string;
};
export type Signal = {
  id: string;
  clientId: string;
  source: string;
  title: string;
  text: string;
  url: string;
  fetchedAt: string;
};
export type Job = {
  id: string;
  clientId: string;
  type: "generate" | "media";
  payload: string;
  status: string;
  progress: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  result: string | null;
};
