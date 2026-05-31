import { Router, type NextFunction, type Request, type Response } from 'express';

import type { RepositorySearchCriteria } from '../models/score';
import {
  createRepositoryScoreService,
  RepositoryScoreService
} from '../services/score';
import { isIsoDate } from '../utils/helpers.utils';
import { BadRequestError } from '../utils/http-errors';

// Creates the controller with its default service dependency.
export function createRepositoryScoreController(): RepositoryScoreController {
  return new RepositoryScoreController();
}

// Handles repository score HTTP routes and request validation.
export class RepositoryScoreController {
  public readonly router = Router();

  constructor(
    private readonly repositoryScoreService: RepositoryScoreService = createRepositoryScoreService()
  ) {
    this.registerRoutes();
  }

  // Registers the repository score routes on the controller router.
  private registerRoutes(): void {
    this.router.get('/', this.listScoredRepositories);
  }

  // Closes dependencies owned by the controller.
  public async close(): Promise<void> {
    await this.repositoryScoreService.close();
  }

  // Parses, validates, and serves repository score search requests.
  private listScoredRepositories = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const criteria = this.createSearchCriteria(req);
      this.validateCriteria(criteria);

      const response = await this.repositoryScoreService.listScoredRepositories(criteria);

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // Converts raw query parameters into search criteria.
  private createSearchCriteria(req: Request): RepositorySearchCriteria {
    return {
      language: String(req.query.language ?? ''),
      createdAfter: String(req.query.createdAfter ?? ''),
      limit: Number(req.query.limit ?? 30),
      offset: Number(req.query.offset ?? 0)
    };
  }

  // Validates user supplied repository search criteria.
  private validateCriteria(criteria: RepositorySearchCriteria): void {
    if (!criteria.language.trim()) {
      throw new BadRequestError('Language is required');
    }

    if (!isIsoDate(criteria.createdAfter)) {
      throw new BadRequestError('createdAfter must be an ISO date');
    }

    if (
      !Number.isInteger(criteria.limit) ||
      criteria.limit < 1 ||
      criteria.limit > 100
    ) {
      throw new BadRequestError('Limit must be an integer between 1 and 100');
    }

    if (!Number.isInteger(criteria.offset) || criteria.offset < 0) {
      throw new BadRequestError('Offset must be a non-negative integer');
    }
  }
}
