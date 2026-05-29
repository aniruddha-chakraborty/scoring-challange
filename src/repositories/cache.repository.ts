import { createClient } from 'redis';

export interface CacheRepository {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

type RedisCacheRepositoryOptions = {
  url: string;
  ttlSeconds?: number;
};

export class RedisCacheRepository implements CacheRepository {
  private readonly client: ReturnType<typeof createClient>;
  private connectPromise?: Promise<void>;

  constructor(private readonly options: RedisCacheRepositoryOptions) {
    this.client = createClient({ url: options.url });
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

    if (this.options.ttlSeconds) {
      await this.client.set(key, payload, { EX: this.options.ttlSeconds });
      return;
    }

    await this.client.set(key, payload);
  }

  private async connect(): Promise<void> {
    if (this.client.isOpen) {
      return;
    }

    this.connectPromise ??= this.client.connect().then(() => undefined);

    await this.connectPromise;
  }
}
