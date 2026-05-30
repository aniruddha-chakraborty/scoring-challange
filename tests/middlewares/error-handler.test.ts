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

    expect(logs).toHaveLength(1);
    expect(logs[0][0]).toBe('Unhandled error');
    expect(response.payload).toEqual({ message: 'Internal server error' });
    expect(response.statusCode).toBe(500);
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

    expect(logs).toHaveLength(0);
    expect(response.payload).toEqual({ message: 'Bad input' });
    expect(response.statusCode).toBe(400);
  });

  it('passes errors to Express when headers were already sent', () => {
    const error = new Error('Late failure');
    const response = createResponse();
    const next = createCapturingNext();
    response.headersSent = true;

    new ErrorHandlerMiddleware().handle(error, createRequest(), response, next);

    expect(next.error).toBe(error);
    expect(response.statusCode).toBeUndefined();
    expect(response.payload).toBeUndefined();
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
