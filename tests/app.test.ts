import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Express } from 'express';

import { App } from '../src/app';
import type { GitHubRepository } from '../src/models/github-repository.model';
import type { CacheRepository } from '../src/repositories/cache.repository';
import type { GitHubRepositoryRepository } from '../src/repositories/github-repository.repository';

describe('App', () => {
  it('mounts repository score routes under /repositories', () => {
    const repository = new StubGitHubRepositoryRepository([
      createRepository({ fullName: 'example/api', stars: 25, forks: 5 })
    ]);
    const expressApp = new App(0, {
      cacheRepository: new StubCacheRepository(),
      githubRepositoryRepository: repository
    }).createExpressApp();

    assert.ok(hasMountedRoute(expressApp, '/repositories'));
  });
});

class StubGitHubRepositoryRepository implements GitHubRepositoryRepository {
  constructor(private readonly repositories: GitHubRepository[]) {}

  public async searchRepositories(): Promise<GitHubRepository[]> {
    return this.repositories;
  }
}

class StubCacheRepository implements CacheRepository {
  public async get<T>(): Promise<T | null> {
    return null;
  }

  public async set<T>(): Promise<void> {}
}

function hasMountedRoute(app: Express, path: string): boolean {
  const stack = (
    app as unknown as {
      _router: { stack: Array<{ name: string; regexp: RegExp }> };
    }
  )._router.stack;

  return stack.some((layer) => layer.name === 'router' && layer.regexp.test(path));
}

function createRepository(
  overrides: Partial<GitHubRepository> = {}
): GitHubRepository {
  return {
    id: 1,
    name: 'repo',
    fullName: 'example/repo',
    description: null,
    url: 'https://github.com/example/repo',
    language: 'TypeScript',
    stars: 0,
    forks: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}
