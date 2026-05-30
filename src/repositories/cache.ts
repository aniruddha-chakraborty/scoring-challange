import { createClient } from 'redis';

export interface CacheRepository {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

export type RedisCacheRepositoryConfig = {
  url: string;
  ttlSeconds: number;
};

export function createCacheRepository(): CacheRepository {
  return new RedisCacheRepository();
}

export function createRedisCacheRepositoryConfig(): RedisCacheRepositoryConfig {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is required');
  }

  return {
    url: process.env.REDIS_URL,
    ttlSeconds: Number(process.env.CACHE_TTL_SECONDS ?? 300)
  };
}

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

  public async get<T>(key: string): Promise<T | null> {
    await this.connect();
    const value = await this.client.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  public async set<T>(key: string, value: T): Promise<void> {
    await this.connect();
    const payload = JSON.stringify(value);

    await this.client.set(key, payload, { EX: this.config.ttlSeconds });
  }

  public async delete(key: string): Promise<void> {
    await this.connect();
    await this.client.del(key);
  }

  public async close(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }

    this.connectPromise = undefined;
  }

  private async connect(): Promise<void> {
    if (this.client.isOpen) {
      return;
    }

    this.connectPromise ??= this.client.connect().then(() => undefined);
    await this.connectPromise;
  }
}
