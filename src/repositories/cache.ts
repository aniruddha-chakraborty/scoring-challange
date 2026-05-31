import { createClient } from 'redis';

import { config } from '../config';

export interface CacheRepository {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  close?(): Promise<void>;
}

export type RedisCacheRepositoryConfig = {
  url: string;
  ttlSeconds: number;
};

// Creates the configured cache repository implementation.
export function createCacheRepository(): CacheRepository {
  return new RedisCacheRepository();
}

// Builds Redis cache configuration from environment-backed settings.
export function createRedisCacheRepositoryConfig(): RedisCacheRepositoryConfig {
  const redisUrl = config.redisUrl;

  if (!redisUrl) {
    throw new Error('REDIS_URL is required');
  }

  return {
    url: redisUrl,
    ttlSeconds: config.cacheTtlSeconds
  };
}

// Stores and retrieves cached responses from Redis.
export class RedisCacheRepository implements CacheRepository {
  private readonly client: ReturnType<typeof createClient>;
  private connectPromise?: Promise<void>;

  constructor(
    private readonly config: RedisCacheRepositoryConfig =
      createRedisCacheRepositoryConfig()
  ) {
    this.client = createClient({
      url: config.url,
      socket: {
        connectTimeout: 1000,
        reconnectStrategy: false
      }
    });
    this.client.on('error', (error) => {
      console.error('Redis cache error:', error);
    });
  }

  // Reads a cached JSON value by key.
  public async get<T>(key: string): Promise<T | null> {
    await this.connect();
    const value = await this.client.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  // Stores a JSON value in Redis with the configured TTL.
  public async set<T>(key: string, value: T): Promise<void> {
    await this.connect();
    const payload = JSON.stringify(value);

    await this.client.set(key, payload, { EX: this.config.ttlSeconds });
  }

  // Deletes a cache entry by key.
  public async delete(key: string): Promise<void> {
    await this.connect();
    await this.client.del(key);
  }

  // Closes the Redis client connection.
  public async close(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }

    this.connectPromise = undefined;
  }

  // Opens the Redis connection once and reuses the in-flight connection promise.
  private async connect(): Promise<void> {
    if (this.client.isOpen) {
      return;
    }

    this.connectPromise ??= this.client.connect().then(() => undefined);
    await this.connectPromise;
  }
}
