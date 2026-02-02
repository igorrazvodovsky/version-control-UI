export type ArticleAuthor = {
  username: string;
  bio: string | null;
  image: string | null;
  following: boolean;
};

export type Article = {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  createdAt: string;
  updatedAt: string;
  favorited: boolean;
  favoritesCount: number;
  author: ArticleAuthor;
};

export type ArticlesResponse = {
  articles: Article[];
  articlesCount: number;
};

export const DEFAULT_API_BASE_URL = "http://localhost:8080";

type Fetcher = typeof fetch;

type FetchArticlesOptions = {
  baseUrl?: string;
  fetcher?: Fetcher;
  requestInit?: RequestInit;
};

export async function fetchArticles(
  { baseUrl = DEFAULT_API_BASE_URL, fetcher = fetch, requestInit }: FetchArticlesOptions = {},
): Promise<ArticlesResponse> {
  const url = new URL("/articles", baseUrl).toString();
  const response = await fetcher(url, requestInit);

  if (!response.ok) {
    throw new Error(`Failed to fetch articles (status ${response.status})`);
  }

  const data = await response.json() as ArticlesResponse;
  if (!Array.isArray(data.articles) || typeof data.articlesCount !== "number") {
    throw new Error("Invalid articles response");
  }

  return data;
}
