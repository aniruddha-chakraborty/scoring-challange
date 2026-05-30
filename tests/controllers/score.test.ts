import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { NextFunction, Request, Response } from 'express';

import type {
  RepositorySearchCriteria,
  ScoredRepositoryResponse
} from '../../src/models/score';
import {
  createRepositoryScoreController,
  RepositoryScoreController
} from '../../src/controllers/score';
import { RepositoryScoreService } from '../../src/services/score';
import { BadRequestError } from '../../src/utils/http-errors';
import { mockConfig, restoreConfig } from '../helpers/config.mock';

describe('RepositoryScoreController', () => {
  afterEach(() => {
    restoreConfig();
  });

  it('creates a repository score controller from the factory', () => {
    mockConfig({
      redisUrl: 'redis://localhost:6379',
      cacheTtlSeconds: 300
    });

    const controller = createRepositoryScoreController();

    assert.ok(controller instanceof RepositoryScoreController);
  });

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

  it('uses default pagination values when limit and offset are omitted', async () => {
    const service = new StubRepositoryScoreService();
    const controller = new RepositoryScoreController(
      service as unknown as RepositoryScoreService
    );
    const response = createResponse();
    const next = createNext();

    await callListHandler(controller, {
      language: 'Rust',
      createdAfter: '2024-06-01'
    }, response, next);

    assert.equal(next.error, undefined);
    assert.deepEqual(service.calls[0], {
      language: 'Rust',
      createdAfter: '2024-06-01',
      limit: 30,
      offset: 0
    });
  });

  it('rejects invalid dates and out-of-range limits before calling the service', async () => {
    const service = new StubRepositoryScoreService();
    const controller = new RepositoryScoreController(
      service as unknown as RepositoryScoreService
    );
    const invalidDateNext = createNext();
    const invalidLimitNext = createNext();

    await callListHandler(controller, {
      language: 'Go',
      createdAfter: '2024/06/01',
      limit: '10',
      offset: '0'
    }, createResponse(), invalidDateNext);
    await callListHandler(controller, {
      language: 'Go',
      createdAfter: '2024-06-01',
      limit: '101',
      offset: '0'
    }, createResponse(), invalidLimitNext);

    assert.equal(service.calls.length, 0);
    assert.ok(invalidDateNext.error instanceof BadRequestError);
    assert.equal(
      invalidDateNext.error.message,
      'createdAfter must be an ISO date'
    );
    assert.ok(invalidLimitNext.error instanceof BadRequestError);
    assert.equal(
      invalidLimitNext.error.message,
      'Limit must be an integer between 1 and 100'
    );
  });

  it('rejects non-integer limit and offset values before calling the service', async () => {
    const service = new StubRepositoryScoreService();
    const controller = new RepositoryScoreController(
      service as unknown as RepositoryScoreService
    );
    const invalidLimitNext = createNext();
    const invalidOffsetNext = createNext();

    await callListHandler(controller, {
      language: 'Go',
      createdAfter: '2024-06-01',
      limit: 'abc',
      offset: '0'
    }, createResponse(), invalidLimitNext);
    await callListHandler(controller, {
      language: 'Go',
      createdAfter: '2024-06-01',
      limit: '10',
      offset: 'abc'
    }, createResponse(), invalidOffsetNext);

    assert.equal(service.calls.length, 0);
    assert.ok(invalidLimitNext.error instanceof BadRequestError);
    assert.equal(
      invalidLimitNext.error.message,
      'Limit must be an integer between 1 and 100'
    );
    assert.ok(invalidOffsetNext.error instanceof BadRequestError);
    assert.equal(
      invalidOffsetNext.error.message,
      'Offset must be a non-negative integer'
    );
  });

  it('rejects limit=0 before calling the service', async () => {
    const service = new StubRepositoryScoreService();
    const controller = new RepositoryScoreController(
      service as unknown as RepositoryScoreService
    );
    const next = createNext();

    await callListHandler(controller, {
      language: 'Go',
      createdAfter: '2024-06-01',
      limit: '0',
      offset: '0'
    }, createResponse(), next);

    assert.equal(service.calls.length, 0);
    assert.ok(next.error instanceof BadRequestError);
    assert.equal(
      next.error.message,
      'Limit must be an integer between 1 and 100'
    );
  });

  it('rejects offset=-1 before calling the service', async () => {
    const service = new StubRepositoryScoreService();
    const controller = new RepositoryScoreController(
      service as unknown as RepositoryScoreService
    );
    const next = createNext();

    await callListHandler(controller, {
      language: 'Go',
      createdAfter: '2024-06-01',
      limit: '10',
      offset: '-1'
    }, createResponse(), next);

    assert.equal(service.calls.length, 0);
    assert.ok(next.error instanceof BadRequestError);
    assert.equal(next.error.message, 'Offset must be a non-negative integer');
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
