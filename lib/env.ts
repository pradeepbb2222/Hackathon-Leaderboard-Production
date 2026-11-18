import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is missing. Use a PostgreSQL connection string.")
    .refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), {
      message: "DATABASE_URL must start with postgresql://",
    }),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters."),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  S3_ENDPOINT: z.string().optional(),
  S3_PUBLIC_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).optional(),
  UPLOAD_DIR: z.string().default("./data/uploads"),
  FILE_SIZE_LIMIT_MB: z.coerce.number().positive().max(500).default(25),
  TEAM_QUOTA_MB: z.coerce.number().positive().max(20000).default(500),
  PORT: z.coerce.number().default(4317),
  HOST: z.string().default("0.0.0.0"),
  EVENT_NAME: z.string().default("CodeBharat 2026"),
  EVENT_EDITION: z.string().default("2nd Edition"),
  EVENT_VENUE: z.string().default("IIIT Dharwad"),
  EVENT_DATES: z.string().default("3–4 December 2026"),
  EVENT_THEME: z.string().default("From Code to Concrete Innovation"),
  EVENT_LOGO_URL: z.string().default(""),
  DEMO_HINTS: z.enum(["true", "false"]).default("false"),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD: z.string().optional(),
});

export type AppEnv = z.infer<typeof schema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((issue) => `- ${issue.path.join(".") || "env"}: ${issue.message}`);
    throw new Error(`Environment is not valid:\n${lines.join("\n")}`);
  }
  const env = parsed.data;
  if (process.env.NODE_ENV === "production") {
    const secret = env.SESSION_SECRET.toLowerCase();
    if (secret.includes("change-me") || secret.includes("replace-this") || secret.includes("replace-with") || secret.includes("codebharat-2026-demo")) {
      throw new Error("SESSION_SECRET is still a sample value. Set a long random string before production.");
    }
  }
  if (env.STORAGE_DRIVER === "s3") {
    const missing = ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"].filter((key) => !process.env[key]);
    if (missing.length) {
      throw new Error(`STORAGE_DRIVER=s3 needs these variables: ${missing.join(", ")}`);
    }
  }
  cached = env;
  return env;
}

export function fileLimitBytes() {
  return getEnv().FILE_SIZE_LIMIT_MB * 1024 * 1024;
}

export function defaultQuotaBytes() {
  return getEnv().TEAM_QUOTA_MB * 1024 * 1024;
}
