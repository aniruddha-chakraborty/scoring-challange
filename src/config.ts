import { config as loadEnv } from 'dotenv';

loadEnv({ quiet: true });

// Exposes environment-backed runtime configuration.
export const config = {
  get port(): string | number {
    return process.env.PORT || 3000;
  },

  get githubToken(): string | undefined {
    return process.env.GITHUB_TOKEN || undefined;
  },

  get redisUrl(): string | undefined {
    return process.env.REDIS_URL || undefined;
  },

  get cacheTtlSeconds(): number {
    return Number(process.env.CACHE_TTL_SECONDS ?? 300);
  }
};
