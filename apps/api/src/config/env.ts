import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"] as const)
    .default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  AI_PROVIDER: z
    .enum(["openai", "groq"])
    .default("openai"),
  OPENAI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

if (env.AI_PROVIDER === "openai" && !env.OPENAI_API_KEY) {
  console.error(
    "OPENAI_API_KEY is required when AI_PROVIDER=openai"
  );

  process.exit(1);
}

if (env.AI_PROVIDER === "groq" && !env.GROQ_API_KEY) {
  console.error(
    "GROQ_API_KEY is required when AI_PROVIDER=groq"
  );

  process.exit(1);
}

export { env }