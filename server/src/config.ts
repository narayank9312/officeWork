import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  FAKE_STORE_API_URL: z.string().url().default('https://fakestoreapi.com'),
  PRODUCT_CACHE_TTL_MS: z.coerce.number().int().nonnegative().default(300_000),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(8_000),
  SMTP_URL: z.string().url().default('smtp://localhost:1025'),
  SALES_INBOX: z.string().email().default('sales@fieldwork.test'),
  MAIL_FROM: z.string().email().default('enquiries@fieldwork.test'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(1),
  ENQUIRY_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  ENQUIRY_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const fields = Object.keys(result.error.flatten().fieldErrors).join(', ');
    throw new Error(`Invalid environment configuration: ${fields}`);
  }

  return result.data;
}
