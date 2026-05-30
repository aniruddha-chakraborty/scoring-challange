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

    expect(config.port).toBe(3000);
    expect(config.githubToken).toBeUndefined();
    expect(config.redisUrl).toBeUndefined();
    expect(config.cacheTtlSeconds).toBe(300);
  });

  it('returns values from environment variables', () => {
    process.env.PORT = '4000';
    process.env.GITHUB_TOKEN = 'github-token';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.CACHE_TTL_SECONDS = '120';

    expect(config.port).toBe('4000');
    expect(config.githubToken).toBe('github-token');
    expect(config.redisUrl).toBe('redis://localhost:6379');
    expect(config.cacheTtlSeconds).toBe(120);
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
