import { z } from "zod";

try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the environment.
}

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().default(3000),
  AUTH_USERNAME: z.string().min(1),
  AUTH_PASSWORD_HASH: z.string().startsWith("$2", "Must be a bcrypt hash, see npm run hash-password"),
  SESSION_SECRET: z.string().min(32, "Use at least 32 characters"),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:\n" + z.prettifyError(parsed.error));
  process.exit(1);
}

export const config = parsed.data;
