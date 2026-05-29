import { Router, type NextFunction, type Request, type Response } from 'express';

import { RepositoryScoreService } from '../services/repository-score.service';

export class RepositoryScoreController {
  public readonly router = Router();

  constructor(private readonly repositoryScoreService: RepositoryScoreService) {
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.get('/', this.listScoredRepositories);
  }

  private listScoredRepositories = async ( req: Request, res: Response, next: NextFunction ): Promise<void> => {
    try {
      const response =
        await this.repositoryScoreService.listScoredRepositories({
          language: String(req.query.language ?? ''),
          createdAfter: String(req.query.createdAfter ?? ''),
          limit: Number(req.query.limit ?? 30),
          offset: Number(req.query.offset ?? 0)
        });

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}
