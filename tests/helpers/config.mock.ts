import { config } from '../../src/config';

type ConfigOverrides = Partial<{
  port: string | number;
  githubToken: string | undefined;
  redisUrl: string | undefined;
  cacheTtlSeconds: number;
}>;

const originalDescriptors = Object.getOwnPropertyDescriptors(config);

export function mockConfig(overrides: ConfigOverrides): void {
  Object.entries(overrides).forEach(([key, value]) => {
    Object.defineProperty(config, key, {
      configurable: true,
      get: () => value
    });
  });
}

export function restoreConfig(): void {
  Object.defineProperties(config, originalDescriptors);
}
