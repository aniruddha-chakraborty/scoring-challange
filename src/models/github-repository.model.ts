export type RepositorySearchCriteria = {
  language: string;
  createdAfter: string;
  limit: number;
  offset: number;
};

export type GitHubRepository = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  createdAt: string;
  updatedAt: string;
};

export type ScoredRepository = GitHubRepository & {
  popularityScore: number;
  scoreBreakdown: {
    stars: number;
    forks: number;
    recency: number;
  };
};

export type ScoredRepositoryResponse = {
  data: ScoredRepository[];
};

export type GitHubSearchRepositoryItem = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  updated_at: string;
};

export type GitHubSearchResponse = {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubSearchRepositoryItem[];
};
