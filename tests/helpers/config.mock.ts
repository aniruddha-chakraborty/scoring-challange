import { config } from '../../src/config';

type ConfigOverrides = Partial<{
  port: string | number;
  githubToken: string | undefined;
  redisUrl: string | undefined;
  cacheTtlSeconds: number;
}>;

const spies: jest.SpyInstance[] = [];

export function mockConfig(overrides: ConfigOverrides): void {
  if ('port' in overrides) {
    spies.push(
      jest
        .spyOn(config, 'port', 'get')
        .mockReturnValue(overrides.port as string | number)
    );
  }

  if ('githubToken' in overrides) {
    spies.push(
      jest
        .spyOn(config, 'githubToken', 'get')
        .mockReturnValue(overrides.githubToken)
    );
  }

  if ('redisUrl' in overrides) {
    spies.push(
      jest.spyOn(config, 'redisUrl', 'get').mockReturnValue(overrides.redisUrl)
    );
  }

  if ('cacheTtlSeconds' in overrides) {
    spies.push(
      jest
        .spyOn(config, 'cacheTtlSeconds', 'get')
        .mockReturnValue(overrides.cacheTtlSeconds as number)
    );
  }
}

export function restoreConfig(): void {
  spies.splice(0).forEach((spy) => {
    spy.mockRestore();
  });
}
