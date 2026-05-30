import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../utils/http-errors';

export class ErrorHandlerMiddleware {
  public handle = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const status = error instanceof HttpError ? error.status : 500;

    if (status === 500) {
      this.logInternalError(error, req);
    }

    res.status(status).json({
      message: status === 500 ? 'Internal server error' : error.message
    });
  };

  private logInternalError(error: Error, req: Request): void {
    console.error('Unhandled error', {
      method: req.method,
      url: req.originalUrl,
      message: error.message,
      stack: error.stack
    });
  }
}
