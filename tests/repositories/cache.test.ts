import assert from 'node:assert/strict';
import { createConnection } from 'node:net';
import { afterEach, describe, it } from 'node:test';

import {
  createCacheRepository,
  createRedisCacheRepositoryConfig,
  RedisCacheRepository
} from '../../src/repositories/cache';

const originalRedisUrl = process.env.REDIS_URL;
const originalCacheTtlSeconds = process.env.CACHE_TTL_SECONDS;

describe('createCacheRepository', () => {
  afterEach(() => {
    restoreEnv('REDIS_URL', originalRedisUrl);
    restoreEnv('CACHE_TTL_SECONDS', originalCacheTtlSeconds);
  });

  it('requires REDIS_URL', () => {
    delete process.env.REDIS_URL;

    assert.throws(() => createCacheRepository(), /REDIS_URL is required/);
  });

  it('creates a Redis cache repository when REDIS_URL is configured', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.CACHE_TTL_SECONDS = '300';

    const repository = createCacheRepository();

    assert.ok(repository instanceof RedisCacheRepository);
  });

  it('creates Redis cache repository config from environment', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.CACHE_TTL_SECONDS = '120';

    const config = createRedisCacheRepositoryConfig();

    assert.deepEqual(config, {
      url: 'redis://localhost:6379',
      ttlSeconds: 120
    });
  });

  it('defaults Redis cache TTL to five minutes', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    delete process.env.CACHE_TTL_SECONDS;

    const config = createRedisCacheRepositoryConfig();

    assert.deepEqual(config, {
      url: 'redis://localhost:6379',
      ttlSeconds: 300
    });
  });

  it('stores and reads values through Redis when REDIS_URL is configured', async (t) => {
    if (!process.env.REDIS_URL) {
      t.skip('REDIS_URL is not configured');
      return;
    }
    if (!(await canReachRedis(process.env.REDIS_URL))) {
      t.skip('Redis is not reachable at REDIS_URL');
      return;
    }

    const repository = new RedisCacheRepository({
      url: process.env.REDIS_URL,
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

      assert.deepEqual(await repository.get<typeof value>(key), value);
    } finally {
      await repository.delete(key).catch(() => undefined);
      await repository.close();
    }
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

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
