import type {
  GitHubRepository,
  GitHubSearchRepositoryItem,
  GitHubSearchResponse,
  RepositorySearchCriteria
} from '../models/github-repository.model';
import { GitHubApiError } from '../utils/http-errors';

export interface GitHubRepositoryRepository {
  searchRepositories(criteria: RepositorySearchCriteria): Promise<GitHubRepository[]>;
}

type GitHubRepositoryOptions = {
  baseUrl?: string;
  token?: string;
};

export class GitHubRestRepository implements GitHubRepositoryRepository {
  private readonly baseUrl: string;
  private readonly token?: string;

  constructor(options: GitHubRepositoryOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'https://api.github.com';
    this.token = options.token;
  }

  public async searchRepositories( criteria: RepositorySearchCriteria ): Promise<GitHubRepository[]> {
    const url = this.buildSearchUrl(criteria);
    const response = await fetch(url, {
      headers: this.buildHeaders()
    });

    if (!response.ok) {
      throw new GitHubApiError(
        `GitHub search failed with status ${response.status}`
      );
    }

    const body = (await response.json()) as GitHubSearchResponse;

    return body.items.map((item) => this.toRepository(item));
  }

  private buildSearchUrl(criteria: RepositorySearchCriteria): string {
    const url = new URL('/search/repositories', this.baseUrl);
    const query = [
      `language:${criteria.language.trim()}`,
      `created:>=${criteria.createdAfter}`
    ].join(' ');

    url.searchParams.set('q', query);
    url.searchParams.set('sort', 'updated');
    url.searchParams.set('order', 'desc');
    url.searchParams.set('per_page', String(criteria.limit));
    url.searchParams.set('page', String(this.toGitHubPage(criteria)));

    return url.toString();
  }

  private toGitHubPage(criteria: RepositorySearchCriteria): number {
    return Math.floor(criteria.offset / criteria.limit) + 1;
  }

  private buildHeaders(): HeadersInit {
    return {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'repository-popularity-score-service',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
    };
  }

  private toRepository(item: GitHubSearchRepositoryItem): GitHubRepository {
    return {
      id: item.id,
      name: item.name,
      fullName: item.full_name,
      description: item.description,
      url: item.html_url,
      language: item.language,
      stars: item.stargazers_count,
      forks: item.forks_count,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    };
  }
}
