import type { Server } from 'node:http';
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
  private server?: Server;
  private isStopping = false;

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

  public start(): Server {
    const app = this.createExpressApp();

    this.server = app.listen(this.port, () => {
      console.log(`Server running on http://localhost:${this.port}`);
    });
    this.registerShutdownHandlers();

    return this.server;
  }

  public async stop(signal = 'manual'): Promise<void> {
    if (this.isStopping) {
      return;
    }

    this.isStopping = true;
    console.log(`Shutting down after ${signal}`);

    await this.closeServer();
    await this.dependencies.repositoryScoreController.close();
  }

  private async closeServer(): Promise<void> {
    if (!this.server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    this.server = undefined;
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

  private registerShutdownHandlers(): void {
    for (const signal of ['SIGTERM', 'SIGINT'] as const) {
      process.once(signal, () => {
        this.stop(signal)
          .then(() => process.exit(0))
          .catch((error) => {
            console.error('Graceful shutdown failed', error);
            process.exit(1);
          });
      });
    }
  }
}

if (require.main === module) {
  new App().start();
}
