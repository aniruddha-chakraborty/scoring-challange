import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  createGitHubRepository,
  GitHubRestRepository
} from '../../src/repositories/github';
import { GitHubApiError } from '../../src/utils/http-errors';

const originalFetch = globalThis.fetch;

describe('GitHubRestRepository', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('creates a GitHub repository from the factory', () => {
    const repository = createGitHubRepository();

    assert.ok(repository instanceof GitHubRestRepository);
  });

  it('converts offset and limit into GitHub page pagination', async () => {
    let requestedUrl = '';
    globalThis.fetch = async (url) => {
      requestedUrl = String(url);

      return new Response(
        JSON.stringify({
          total_count: 0,
          incomplete_results: false,
          items: []
        }),
        { status: 200 }
      );
    };

    const repository = new GitHubRestRepository();

    await repository.searchRepositories({
      language: 'TypeScript',
      createdAfter: '2024-01-01',
      limit: 30,
      offset: 60
    });

    const url = new URL(requestedUrl);

    assert.equal(url.searchParams.get('per_page'), '30');
    assert.equal(url.searchParams.get('page'), '3');
  });

  it('maps valid GitHub repository data', async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          items: [
            {
              id: 1,
              name: 'api',
              full_name: 'example/api',
              description: 'Example API',
              html_url: 'https://github.com/example/api',
              language: 'TypeScript',
              stargazers_count: 50,
              forks_count: 10,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-02-01T00:00:00Z'
            }
          ]
        }),
        { status: 200 }
      );

    const repository = new GitHubRestRepository();

    const results = await repository.searchRepositories({
      language: 'TypeScript',
      createdAfter: '2024-01-01',
      limit: 10,
      offset: 0
    });

    assert.equal(results[0].fullName, 'example/api');
    assert.equal(results[0].stars, 50);
    assert.equal(results[0].forks, 10);
  });

  it('rejects GitHub repository data with invalid field types', async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          items: [
            {
              id: '1',
              name: 'api',
              full_name: 'example/api',
              description: 'Example API',
              html_url: 'https://github.com/example/api',
              language: 'TypeScript',
              stargazers_count: '50',
              forks_count: 10,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-02-01T00:00:00Z'
            }
          ]
        }),
        { status: 200 }
      );

    const repository = new GitHubRestRepository();

    await assert.rejects(
      repository.searchRepositories({
        language: 'TypeScript',
        createdAfter: '2024-01-01',
        limit: 10,
        offset: 0
      }),
      GitHubApiError
    );
  });

  it('rejects invalid nullable GitHub repository fields', async () => {
    const repository = new GitHubRestRepository();

    for (const invalidField of [{ description: 123 }, { language: 123 }]) {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            items: [createGitHubRepositoryItem(invalidField)]
          }),
          { status: 200 }
        );

      await assert.rejects(
        repository.searchRepositories({
          language: 'TypeScript',
          createdAfter: '2024-01-01',
          limit: 10,
          offset: 0
        }),
        GitHubApiError
      );
    }
  });

  it('wraps malformed GitHub JSON in a GitHubApiError', async () => {
    globalThis.fetch = async () =>
      new Response('{"items":', { status: 200 });

    const repository = new GitHubRestRepository();

    await assert.rejects(
      repository.searchRepositories({
        language: 'TypeScript',
        createdAfter: '2024-01-01',
        limit: 10,
        offset: 0
      }),
      GitHubApiError
    );
  });

  it('rejects GitHub responses without an items array', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ total_count: 1 }), { status: 200 });

    const repository = new GitHubRestRepository();

    await assert.rejects(
      repository.searchRepositories({
        language: 'TypeScript',
        createdAfter: '2024-01-01',
        limit: 10,
        offset: 0
      }),
      GitHubApiError
    );
  });

  it('rejects failed GitHub responses before parsing the response body', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: 'rate limited' }), {
        status: 403
      });

    const repository = new GitHubRestRepository();

    await assert.rejects(
      repository.searchRepositories({
        language: 'TypeScript',
        createdAfter: '2024-01-01',
        limit: 10,
        offset: 0
      }),
      /GitHub search failed with status 403/
    );
  });
});

function createGitHubRepositoryItem(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: 1,
    name: 'api',
    full_name: 'example/api',
    description: 'Example API',
    html_url: 'https://github.com/example/api',
    language: 'TypeScript',
    stargazers_count: 50,
    forks_count: 10,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
    ...overrides
  };
}
