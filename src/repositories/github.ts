import type {
  GitHubRepository,
  GitHubSearchRepositoryItem,
  GitHubSearchResponse,
  RepositorySearchCriteria
} from '../models/score';
import { config } from '../config';
import { GitHubApiError } from '../utils/http-errors';

export interface GitHubRepositoryRepository {
  searchRepositories(
    criteria: RepositorySearchCriteria
  ): Promise<GitHubRepository[]>;
}

type GitHubRepositoryOptions = {
  baseUrl?: string;
  token?: string;
};

// Creates the configured GitHub repository client.
export function createGitHubRepository(): GitHubRepositoryRepository {
  return new GitHubRestRepository();
}

// Fetches repositories from the GitHub REST search API.
export class GitHubRestRepository implements GitHubRepositoryRepository {
  private readonly baseUrl: string;
  private readonly token?: string;

  constructor(options: GitHubRepositoryOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'https://api.github.com';
    this.token = options.token ?? config.githubToken;
  }

  // Searches GitHub repositories using the requested criteria.
  public async searchRepositories(
    criteria: RepositorySearchCriteria
  ): Promise<GitHubRepository[]> {
    const url = this.buildSearchUrl(criteria);
    const response = await fetch(url, {
      headers: this.buildHeaders()
    });

    if (!response.ok) {
      throw new GitHubApiError(
        `GitHub search failed with status ${response.status}`
      );
    }

    const body = await this.parseSearchResponse(response);

    // GitHub is an upstream API, so validate the runtime JSON before trusting it.
    if (
      !Array.isArray(body.items) ||
      !body.items.every((item) => this.isRepositoryItem(item))
    ) {
      throw new GitHubApiError('Invalid GitHub response');
    }

    return body.items.map((item) => this.toRepository(item));
  }

  // Builds the GitHub repository search URL and query parameters.
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

  // Converts API offset and limit values into GitHub page pagination.
  private toGitHubPage(criteria: RepositorySearchCriteria): number {
    return Math.floor(criteria.offset / criteria.limit) + 1;
  }

  // Builds GitHub request headers, including authentication when configured.
  private buildHeaders(): HeadersInit {
    return {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'repository-popularity-score-service',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
    };
  }

  // Parses the GitHub JSON response into the expected search response shape.
  private async parseSearchResponse(
    response: Response
  ): Promise<Partial<GitHubSearchResponse>> {
    try {
      return (await response.json()) as Partial<GitHubSearchResponse>;
    } catch {
      throw new GitHubApiError('Invalid GitHub response');
    }
  }

  // Verifies that an upstream item contains the fields the service needs.
  private isRepositoryItem(value: unknown): value is GitHubSearchRepositoryItem {
    const item = value as Partial<GitHubSearchRepositoryItem>;

    return (
      typeof item.id === 'number' &&
      typeof item.name === 'string' &&
      typeof item.full_name === 'string' &&
      (typeof item.description === 'string' || item.description === null) &&
      typeof item.html_url === 'string' &&
      (typeof item.language === 'string' || item.language === null) &&
      typeof item.stargazers_count === 'number' &&
      typeof item.forks_count === 'number' &&
      typeof item.created_at === 'string' &&
      typeof item.updated_at === 'string'
    );
  }

  // Maps a GitHub API item into the internal repository model.
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
