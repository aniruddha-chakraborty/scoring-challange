import type {
  GitHubRepository,
  RepositorySearchCriteria,
  ScoredRepository,
  ScoredRepositoryResponse
} from '../models/score';
import {
  createCacheRepository,
  type CacheRepository
} from '../repositories/cache';
import {
  createGitHubRepository,
  type GitHubRepositoryRepository
} from '../repositories/github';
import {
  calculateRecencyScore,
  toScore
} from '../utils/helpers.utils';

type PopularityWeights = {
  stars: number;
  forks: number;
  recency: number;
};

export function createRepositoryScoreService(): RepositoryScoreService {
  return new RepositoryScoreService(
    createGitHubRepository(),
    createCacheRepository()
  );
}

export class RepositoryScoreService {
  private readonly weights: PopularityWeights = {
    stars: 0.5,
    forks: 0.3,
    recency: 0.2
  };

  constructor(
    private readonly githubRepositoryRepository: GitHubRepositoryRepository,
    private readonly cacheRepository: CacheRepository
  ) {}

  public async listScoredRepositories(
    criteria: RepositorySearchCriteria
  ): Promise<ScoredRepositoryResponse> {
    const cacheKey = this.buildCacheKey(criteria);
    const cachedResponse =
      await this.cacheRepository.get<ScoredRepositoryResponse>(cacheKey);

    if (cachedResponse) {
      return cachedResponse;
    }

    const repositories =
      await this.githubRepositoryRepository.searchRepositories(criteria);
    const response = {
      data: this.scoreRepositories(repositories)
    };

    await this.cacheRepository.set(cacheKey, response);

    return response;
  }

  private buildCacheKey(criteria: RepositorySearchCriteria): string {
    const params = new URLSearchParams({
      language: criteria.language.trim(),
      createdAfter: criteria.createdAfter,
      limit: String(criteria.limit),
      offset: String(criteria.offset)
    });

    return `?${params.toString()}`;
  }

  private scoreRepositories(
    repositories: GitHubRepository[],
    scoredAt = new Date()
  ): ScoredRepository[] {
    const maxStars = Math.max(...repositories.map((repo) => repo.stars), 1);
    const maxForks = Math.max(...repositories.map((repo) => repo.forks), 1);

    return repositories
      .map((repository) => {
        const stars = repository.stars / maxStars;
        const forks = repository.forks / maxForks;
        const recency = calculateRecencyScore(repository.updatedAt, scoredAt);
        const popularityScore = toScore(
          stars * this.weights.stars +
            forks * this.weights.forks +
            recency * this.weights.recency
        );

        return {
          ...repository,
          popularityScore,
          scoreBreakdown: {
            stars: toScore(stars),
            forks: toScore(forks),
            recency: toScore(recency)
          }
        };
      })
      .sort((a, b) => b.popularityScore - a.popularityScore);
  }
}
