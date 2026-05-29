import type {
  GitHubRepository,
  RepositorySearchCriteria,
  ScoredRepository,
  ScoredRepositoryResponse
} from '../models/github-repository.model';
import type { CacheRepository } from '../repositories/cache.repository';
import type { GitHubRepositoryRepository } from '../repositories/github-repository.repository';
import {
  calculateRecencyScore,
  isIsoDate,
  toScore
} from '../utils/helpers.utils';
import { BadRequestError } from '../utils/http-errors';

type PopularityWeights = {
  stars: number;
  forks: number;
  recency: number;
};

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
    this.validateCriteria(criteria);

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
