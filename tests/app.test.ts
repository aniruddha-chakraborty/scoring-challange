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
});

class StubRepositoryScoreService {
  public async listScoredRepositories(
    criteria: RepositorySearchCriteria
  ): Promise<ScoredRepositoryResponse> {
    return { data: [] };
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
