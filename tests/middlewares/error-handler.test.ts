import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { NextFunction, Request, Response } from 'express';

import { ErrorHandlerMiddleware } from '../../src/middlewares/error-handler';
import { BadRequestError } from '../../src/utils/http-errors';

const originalConsoleError = console.error;

describe('ErrorHandlerMiddleware', () => {
  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('logs internal server errors', () => {
    const logs: unknown[][] = [];
    console.error = (...args: unknown[]) => {
      logs.push(args);
    };
    const response = createResponse();
    const error = new Error('Unexpected failure');

    new ErrorHandlerMiddleware().handle(
      error,
      createRequest(),
      response,
      createNext()
    );

    assert.equal(logs.length, 1);
    assert.equal(logs[0][0], 'Unhandled error');
    assert.deepEqual(response.payload, { message: 'Internal server error' });
    assert.equal(response.statusCode, 500);
  });

  it('does not log expected HttpError responses', () => {
    const logs: unknown[][] = [];
    console.error = (...args: unknown[]) => {
      logs.push(args);
    };
    const response = createResponse();

    new ErrorHandlerMiddleware().handle(
      new BadRequestError('Bad input'),
      createRequest(),
      response,
      createNext()
    );

    assert.equal(logs.length, 0);
    assert.deepEqual(response.payload, { message: 'Bad input' });
    assert.equal(response.statusCode, 400);
  });

  it('passes errors to Express when headers were already sent', () => {
    const error = new Error('Late failure');
    const response = createResponse();
    const next = createCapturingNext();
    response.headersSent = true;

    new ErrorHandlerMiddleware().handle(error, createRequest(), response, next);

    assert.equal(next.error, error);
    assert.equal(response.statusCode, undefined);
    assert.equal(response.payload, undefined);
  });
});

function createRequest(): Request {
  return {
    method: 'GET',
    originalUrl: '/repositories'
  } as Request;
}

function createResponse(): Response & {
  payload?: unknown;
  statusCode?: number;
} {
  return {
    headersSent: false,
    status(statusCode: number) {
      this.statusCode = statusCode;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    }
  } as Response & { payload?: unknown; statusCode?: number };
}

function createNext(): NextFunction {
  return (() => undefined) as NextFunction;
}

function createCapturingNext(): NextFunction & { error?: unknown } {
  const next = ((error?: unknown) => {
    next.error = error;
  }) as NextFunction & { error?: unknown };

  return next;
}
