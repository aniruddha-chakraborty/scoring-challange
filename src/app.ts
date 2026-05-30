import express, { type Express, type Request, type Response } from 'express';

import {
  createRepositoryScoreController,
  RepositoryScoreController
} from './controllers/score';
import { config } from './config';
import { ErrorHandlerMiddleware } from './middlewares/error-handler';

type AppDependencies = {
  repositoryScoreController?: RepositoryScoreController;
  errorHandler?: ErrorHandlerMiddleware;
};

export class App {
  private readonly dependencies: Required<AppDependencies>;

  constructor(
    private readonly port: string | number = config.port,
    dependencies: AppDependencies = {}
  ) {
    this.dependencies = {
      repositoryScoreController:
        dependencies.repositoryScoreController ??
        createRepositoryScoreController(),
      errorHandler: dependencies.errorHandler ?? new ErrorHandlerMiddleware()
    };
  }

  public start(): void {
    const app = this.createExpressApp();

    app.listen(this.port, () => {
      console.log(`Server running on http://localhost:${this.port}`);
    });
  }

  public createExpressApp(): Express {
    const app = express();

    app.use(express.json());

    const { repositoryScoreController, errorHandler } = this.dependencies;

    app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });
    app.use('/repositories', repositoryScoreController.router);
    app.use(errorHandler.handle);

    return app;
  }
}

if (require.main === module) {
  new App().start();
}
