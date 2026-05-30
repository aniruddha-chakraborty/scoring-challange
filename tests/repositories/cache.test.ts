import { createConnection } from 'node:net';

import {
  createCacheRepository,
  createRedisCacheRepositoryConfig,
  RedisCacheRepository
} from '../../src/repositories/cache';
import { mockConfig, restoreConfig } from '../helpers/config.mock';

const redisUrl = process.env.REDIS_URL;

describe('createCacheRepository', () => {
  afterEach(() => {
    restoreConfig();
  });

  it('requires REDIS_URL', () => {
    mockConfig({ redisUrl: undefined });

    expect(() => createCacheRepository()).toThrow(/REDIS_URL is required/);
  });

  it('creates a Redis cache repository when REDIS_URL is configured', () => {
    mockConfig({
      redisUrl: 'redis://localhost:6379',
      cacheTtlSeconds: 300
    });

    const repository = createCacheRepository();

    expect(repository).toBeInstanceOf(RedisCacheRepository);
  });

  it('creates Redis cache repository config from shared config', () => {
    mockConfig({
      redisUrl: 'redis://localhost:6379',
      cacheTtlSeconds: 120
    });

    const config = createRedisCacheRepositoryConfig();

    expect(config).toEqual({
      url: 'redis://localhost:6379',
      ttlSeconds: 120
    });
  });

  it('uses default Redis cache TTL from shared config', () => {
    mockConfig({
      redisUrl: 'redis://localhost:6379',
      cacheTtlSeconds: 300
    });

    const config = createRedisCacheRepositoryConfig();

    expect(config).toEqual({
      url: 'redis://localhost:6379',
      ttlSeconds: 300
    });
  });

  if (redisUrl) {
    it('stores and reads values through Redis when REDIS_URL is configured', async () => {
      expect(await canReachRedis(redisUrl)).toBe(true);

      const repository = new RedisCacheRepository({
        url: redisUrl,
        ttlSeconds: 30
      });
      const key = `repository-score:test:${process.pid}:${Date.now()}`;
      const value = {
        data: [
          {
            id: 1,
            fullName: 'example/api',
            popularityScore: 82
          }
        ]
      };

      try {
        await repository.set(key, value);

        await expect(repository.get<typeof value>(key)).resolves.toEqual(value);
      } finally {
        await repository.delete(key).catch(() => undefined);
        await repository.close();
      }
    });
  }
});

async function canReachRedis(redisUrl: string): Promise<boolean> {
  let url: URL;

  try {
    url = new URL(redisUrl);
  } catch {
    return false;
  }

  return new Promise((resolve) => {
    const socket = createConnection({
      host: url.hostname,
      port: Number(url.port || 6379)
    });

    const done = (isReachable: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(isReachable);
    };

    socket.setTimeout(500);
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.once('timeout', () => done(false));
  });
}
