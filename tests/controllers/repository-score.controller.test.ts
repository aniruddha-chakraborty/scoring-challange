import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { NextFunction, Request, Response } from 'express';

import type {
  RepositorySearchCriteria,
  ScoredRepositoryResponse
} from '../../src/models/github-repository.model';
import { RepositoryScoreController } from '../../src/controllers/repository-score.controller';
import { RepositoryScoreService } from '../../src/services/repository-score.service';
import { BadRequestError } from '../../src/utils/http-errors';

describe('RepositoryScoreController', () => {
  it('validates query params before calling the service', async () => {
    const service = new StubRepositoryScoreService();
    const controller = new RepositoryScoreController(
      service as unknown as RepositoryScoreService
    );
    const next = createNext();

    await callListHandler(controller, {
      language: '',
      createdAfter: '2024-01-01',
      limit: '10',
      offset: '0'
    }, createResponse(), next);

    assert.equal(service.calls.length, 0);
    assert.ok(next.error instanceof BadRequestError);
    assert.equal(next.error.message, 'Language is required');
  });

  it('passes parsed search criteria to the service', async () => {
    const service = new StubRepositoryScoreService();
    const controller = new RepositoryScoreController(
      service as unknown as RepositoryScoreService
    );
    const response = createResponse();
    const next = createNext();

    await callListHandler(controller, {
      language: 'Go',
      createdAfter: '2024-06-01',
      limit: '10',
      offset: '5'
    }, response, next);

    assert.equal(next.error, undefined);
    assert.deepEqual(service.calls[0], {
      language: 'Go',
      createdAfter: '2024-06-01',
      limit: 10,
      offset: 5
    });
    assert.deepEqual(response.body, { data: [] });
  });
});

class StubRepositoryScoreService {
  public readonly calls: RepositorySearchCriteria[] = [];

  public async listScoredRepositories(
    criteria: RepositorySearchCriteria
  ): Promise<ScoredRepositoryResponse> {
    this.calls.push(criteria);
    return { data: [] };
  }
}

async function callListHandler(
  controller: RepositoryScoreController,
  query: Record<string, string>,
  response: Response & { body?: unknown },
  next: NextFunction & { error?: unknown }
): Promise<void> {
  const handler = (
    controller.router as unknown as {
      stack: Array<{ route: { stack: Array<{ handle: Function }> } }>;
    }
  ).stack[0].route.stack[0].handle;

  await handler({ query } as Request, response, next);
}

function createResponse(): Response & { body?: unknown } {
  return {
    json(body: unknown) {
      this.body = body;
      return this;
    }
  } as Response & { body?: unknown };
}

function createNext(): NextFunction & { error?: unknown } {
  const next = ((error?: unknown) => {
    next.error = error;
  }) as NextFunction & { error?: unknown };

  return next;
}
