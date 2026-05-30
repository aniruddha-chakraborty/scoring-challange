import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { config } from '../src/config';

const envKeys = [
  'PORT',
  'GITHUB_TOKEN',
  'REDIS_URL',
  'CACHE_TTL_SECONDS'
] as const;
const originalEnv = new Map(
  envKeys.map((key) => [key, process.env[key]])
);

describe('config', () => {
  afterEach(() => {
    envKeys.forEach((key) => restoreEnv(key, originalEnv.get(key)));
  });

  it('returns default values when optional environment variables are absent', () => {
    envKeys.forEach((key) => {
      delete process.env[key];
    });

    assert.equal(config.port, 3000);
    assert.equal(config.githubToken, undefined);
    assert.equal(config.redisUrl, undefined);
    assert.equal(config.cacheTtlSeconds, 300);
  });

  it('returns values from environment variables', () => {
    process.env.PORT = '4000';
    process.env.GITHUB_TOKEN = 'github-token';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.CACHE_TTL_SECONDS = '120';

    assert.equal(config.port, '4000');
    assert.equal(config.githubToken, 'github-token');
    assert.equal(config.redisUrl, 'redis://localhost:6379');
    assert.equal(config.cacheTtlSeconds, 120);
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
