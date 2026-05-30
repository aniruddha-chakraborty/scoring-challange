import express, { type Express, type Request, type Response } from 'express';

import {
  createRepositoryScoreController,
  RepositoryScoreController
} from './controllers/score';
import { ErrorHandlerMiddleware } from './middlewares/error-handler';

type AppDependencies = {
  repositoryScoreController?: RepositoryScoreController;
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

    const repositoryScoreController =
      this.dependencies.repositoryScoreController ??
      createRepositoryScoreController();
    const errorHandler = new ErrorHandlerMiddleware();

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
