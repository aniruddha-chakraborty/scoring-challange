import express, { type Express, type Request, type Response } from 'express';

import { RepositoryScoreController } from './controllers/repository-score.controller';
import { ErrorHandlerMiddleware } from './middlewares/error-handler.middleware';
import {
  RedisCacheRepository,
  type CacheRepository
} from './repositories/cache.repository';
import {
  GitHubRestRepository,
  type GitHubRepositoryRepository
} from './repositories/github-repository.repository';
import { RepositoryScoreService } from './services/repository-score.service';

type AppDependencies = {
  cacheRepository?: CacheRepository;
  githubRepositoryRepository?: GitHubRepositoryRepository;
  repositoryScoreService?: RepositoryScoreService;
};

export class App {
  constructor(
    private readonly port: string | number = process.env.PORT || 3000,
    private readonly dependencies: AppDependencies = {}
  ) {}

  public start(): void {
    const app = this.createExpressApp();

    app.listen(this.port, () => {
      console.log(`Server running on http://localhost:${this.port}`);
    });
  }

  public createExpressApp(): Express {
    const app = express();

    app.use(express.json());

    const githubRepositoryRepository =
      this.dependencies.githubRepositoryRepository ??
      new GitHubRestRepository({ token: process.env.GITHUB_TOKEN });
    const cacheRepository =
      this.dependencies.cacheRepository ?? this.createCacheRepository();
    const repositoryScoreService =
      this.dependencies.repositoryScoreService ??
      new RepositoryScoreService(githubRepositoryRepository, cacheRepository);
    const repositoryScoreController = new RepositoryScoreController(
      repositoryScoreService
    );
    const errorHandler = new ErrorHandlerMiddleware();

    app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });
    app.use('/repositories', repositoryScoreController.router);
    app.use(errorHandler.handle);

    return app;
  }

  private createCacheRepository(): CacheRepository {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL is required');
    }

    return new RedisCacheRepository({
      url: process.env.REDIS_URL,
      ttlSeconds: Number(process.env.CACHE_TTL_SECONDS ?? 300)
    });
  }
}

if (require.main === module) {
  new App().start();
}
