import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { GitHubRestRepository } from '../../src/repositories/github-repository.repository';

const originalFetch = globalThis.fetch;

describe('GitHubRestRepository', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
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
});
