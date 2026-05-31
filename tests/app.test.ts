import { once } from 'node:events';
import type { Express } from 'express';

import { App } from '../src/app';
import { RepositoryScoreController } from '../src/controllers/score';
import type {
  RepositorySearchCriteria,
  ScoredRepositoryResponse
} from '../src/models/score';
import { RepositoryScoreService } from '../src/services/score';

describe('App', () => {
  it('mounts repository score routes under /repositories', () => {
    const expressApp = new App(0, {
      repositoryScoreController: new RepositoryScoreController(
        new StubRepositoryScoreService() as unknown as RepositoryScoreService
      )
    }).createExpressApp();

    expect(hasMountedRoute(expressApp, '/repositories')).toBe(true);
  });

  it('stops the HTTP server and closes dependencies during shutdown', async () => {
    const service = new StubRepositoryScoreService();
    const app = new App(0, {
      repositoryScoreController: new RepositoryScoreController(
        service as unknown as RepositoryScoreService
      )
    });
    const server = app.start();

    await once(server, 'listening');
    await app.stop('test');
    await app.stop('test');

    expect(service.closeCalls).toBe(1);
    expect(server.listening).toBe(false);
  });
});

class StubRepositoryScoreService {
  public closeCalls = 0;

  public async listScoredRepositories(
    criteria: RepositorySearchCriteria
  ): Promise<ScoredRepositoryResponse> {
    return { data: [] };
  }

  public async close(): Promise<void> {
    this.closeCalls += 1;
  }
}

function hasMountedRoute(app: Express, path: string): boolean {
  const stack = (
    app as unknown as {
      _router: { stack: Array<{ name: string; regexp: RegExp }> };
    }
  )._router.stack;

  return stack.some((layer) => layer.name === 'router' && layer.regexp.test(path));
}
