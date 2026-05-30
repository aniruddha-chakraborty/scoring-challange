import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import type {
  GitHubRepository,
  ScoredRepositoryResponse
} from '../../src/models/score';
import type { CacheRepository } from '../../src/repositories/cache';
import type { GitHubRepositoryRepository } from '../../src/repositories/github';
import {
  createRepositoryScoreService,
  RepositoryScoreService
} from '../../src/services/score';

const originalRedisUrl = process.env.REDIS_URL;

describe('RepositoryScoreService', () => {
  afterEach(() => {
    process.env.REDIS_URL = originalRedisUrl;
  });

  it('creates a repository score service from the factory', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';

    const service = createRepositoryScoreService();

    assert.ok(service instanceof RepositoryScoreService);
  });

  it('fetches repositories and returns scored results', async () => {
    const repository = new StubGitHubRepositoryRepository([
      createRepository({ fullName: 'example/api', stars: 50, forks: 10 })
    ]);
    const service = new RepositoryScoreService(
      repository,
      new StubCacheRepository()
    );

    const response = await service.listScoredRepositories({
      language: 'TypeScript',
      createdAfter: '2024-01-01',
      limit: 10,
      offset: 0
    });

    assert.equal(response.data.length, 1);
    assert.equal(response.data[0].fullName, 'example/api');
    assert.equal(response.data[0].popularityScore, 100);
  });

  it('sorts repositories by weighted popularity score', async () => {
    const service = new RepositoryScoreService(
      new StubGitHubRepositoryRepository([
        createRepository({
          fullName: 'example/old-popular',
          stars: 100,
          forks: 40,
          updatedAt: '2025-01-01T00:00:00Z'
        }),
        createRepository({
          fullName: 'example/fresh',
          stars: 80,
          forks: 35,
          updatedAt: '2026-05-01T00:00:00Z'
        })
      ]),
      new StubCacheRepository()
    );

    const response = await service.listScoredRepositories({
      language: 'TypeScript',
      createdAfter: '2024-01-01',
      limit: 10,
      offset: 0
    });

    assert.equal(response.data[0].fullName, 'example/fresh');
    assert.ok(response.data[0].popularityScore > response.data[1].popularityScore);
  });

  it('includes score breakdowns from zero to one hundred', async () => {
    const service = new RepositoryScoreService(
      new StubGitHubRepositoryRepository([
        createRepository({ stars: 10, forks: 5 })
      ]),
      new StubCacheRepository()
    );

    const { data } = await service.listScoredRepositories({
      language: 'TypeScript',
      createdAfter: '2024-01-01',
      limit: 10,
      offset: 0
    });
    const [repository] = data;

    assert.equal(repository.popularityScore, 100);
    assert.deepEqual(repository.scoreBreakdown, {
      stars: 100,
      forks: 100,
      recency: 100
    });
  });

  it('scores zero-star and zero-fork repositories using recency only', async () => {
    const service = new RepositoryScoreService(
      new StubGitHubRepositoryRepository([
        createRepository({
          stars: 0,
          forks: 0,
          updatedAt: new Date().toISOString()
        })
      ]),
      new StubCacheRepository()
    );

    const { data } = await service.listScoredRepositories({
      language: 'TypeScript',
      createdAfter: '2024-01-01',
      limit: 10,
      offset: 0
    });

    assert.equal(data[0].popularityScore, 20);
    assert.deepEqual(data[0].scoreBreakdown, {
      stars: 0,
      forks: 0,
      recency: 100
    });
  });

  it('returns cached repository scores when the query key exists', async () => {
    const cacheKey =
      '?language=TypeScript&createdAfter=2024-01-01&limit=10&offset=0';
    const cachedResponse: ScoredRepositoryResponse = {
      data: [
        {
          ...createRepository({ fullName: 'example/cached' }),
          popularityScore: 88,
          scoreBreakdown: {
            stars: 90,
            forks: 80,
            recency: 70
          }
        }
      ]
    };
    const repository = new StubGitHubRepositoryRepository([
      createRepository({ fullName: 'example/api' })
    ]);
    const cache = new StubCacheRepository([[cacheKey, cachedResponse]]);
    const service = new RepositoryScoreService(repository, cache);

    const response = await service.listScoredRepositories({
      language: 'TypeScript',
      createdAfter: '2024-01-01',
      limit: 10,
      offset: 0
    });

    assert.deepEqual(response, cachedResponse);
    assert.equal(repository.searchCalls, 0);
    assert.deepEqual(cache.getCalls, [cacheKey]);
    assert.equal(cache.setCalls.length, 0);
  });

  it('stores scored repository response in cache after a miss', async () => {
    const cacheKey =
      '?language=TypeScript&createdAfter=2024-01-01&limit=10&offset=0';
    const repository = new StubGitHubRepositoryRepository([
      createRepository({ fullName: 'example/api', stars: 50, forks: 10 })
    ]);
    const cache = new StubCacheRepository();
    const service = new RepositoryScoreService(repository, cache);

    const response = await service.listScoredRepositories({
      language: 'TypeScript',
      createdAfter: '2024-01-01',
      limit: 10,
      offset: 0
    });

    assert.equal(repository.searchCalls, 1);
    assert.deepEqual(cache.getCalls, [cacheKey]);
    assert.equal(cache.setCalls[0].key, cacheKey);
    assert.deepEqual(cache.setCalls[0].value, response);
  });

  it('uses trimmed language in cache keys', async () => {
    const repository = new StubGitHubRepositoryRepository([
      createRepository({ fullName: 'example/api', stars: 50, forks: 10 })
    ]);
    const cache = new StubCacheRepository();
    const service = new RepositoryScoreService(repository, cache);

    await service.listScoredRepositories({
      language: ' TypeScript ',
      createdAfter: '2024-01-01',
      limit: 10,
      offset: 0
    });

    assert.deepEqual(cache.getCalls, [
      '?language=TypeScript&createdAfter=2024-01-01&limit=10&offset=0'
    ]);
  });
});

class StubGitHubRepositoryRepository implements GitHubRepositoryRepository {
  public searchCalls = 0;

  constructor(private readonly repositories: GitHubRepository[]) {}

  public async searchRepositories(): Promise<GitHubRepository[]> {
    this.searchCalls += 1;
    return this.repositories;
  }
}

class StubCacheRepository implements CacheRepository {
  public readonly getCalls: string[] = [];
  public readonly setCalls: Array<{ key: string; value: unknown }> = [];
  private readonly values = new Map<string, unknown>();

  constructor(entries: Array<[string, unknown]> = []) {
    entries.forEach(([key, value]) => {
      this.values.set(key, value);
    });
  }

  public async get<T>(key: string): Promise<T | null> {
    this.getCalls.push(key);
    return (this.values.get(key) as T | undefined) ?? null;
  }

  public async set<T>(key: string, value: T): Promise<void> {
    this.setCalls.push({ key, value });
    this.values.set(key, value);
  }
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
