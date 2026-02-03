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
  articlesCount?: number;
};

export type ArticleResponse = {
  article: Article;
};

export type ArticleHistoryEntry = {
  commit: string;
  message: string;
  createdAt: string;
};

export type ArticleHistoryResponse = {
  history: ArticleHistoryEntry[];
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
  if (!Array.isArray(data.articles)) {
    throw new Error("Invalid articles response");
  }

  return data;
}

type FetchArticleOptions = {
  slug: string;
  viewer?: string;
  baseUrl?: string;
  fetcher?: Fetcher;
  requestInit?: RequestInit;
};

export async function fetchArticle(
  { slug, viewer, baseUrl = DEFAULT_API_BASE_URL, fetcher = fetch, requestInit }: FetchArticleOptions,
): Promise<ArticleResponse> {
  const url = new URL(`/articles/${encodeURIComponent(slug)}`, baseUrl);
  if (viewer) {
    url.searchParams.set("viewer", viewer);
  }
  const response = await fetcher(url.toString(), requestInit);

  if (!response.ok) {
    throw new Error(`Failed to fetch article (status ${response.status})`);
  }

  const data = await response.json() as ArticleResponse;
  if (!data.article) {
    throw new Error("Invalid article response");
  }

  return data;
}

type UpdateArticleOptions = {
  slug: string;
  author: string;
  title: string;
  description: string;
  body: string;
  baseUrl?: string;
  fetcher?: Fetcher;
  requestInit?: RequestInit;
};

export async function updateArticle(
  {
    slug,
    author,
    title,
    description,
    body,
    baseUrl = DEFAULT_API_BASE_URL,
    fetcher = fetch,
    requestInit,
  }: UpdateArticleOptions,
): Promise<ArticleResponse> {
  const url = new URL(`/articles/${encodeURIComponent(slug)}`, baseUrl).toString();
  const response = await fetcher(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, author, title, description, body }),
    ...requestInit,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.errors?.body?.[0] ?? `Failed to update article (status ${response.status})`;
    throw new Error(message);
  }

  const data = await response.json() as ArticleResponse;
  if (!data.article) {
    throw new Error("Invalid article response");
  }

  return data;
}

type FetchArticleHistoryOptions = {
  slug: string;
  limit?: number;
  baseUrl?: string;
  fetcher?: Fetcher;
  requestInit?: RequestInit;
};

export async function fetchArticleHistory(
  { slug, limit, baseUrl = DEFAULT_API_BASE_URL, fetcher = fetch, requestInit }: FetchArticleHistoryOptions,
): Promise<ArticleHistoryResponse> {
  const url = new URL(`/articles/${encodeURIComponent(slug)}/history`, baseUrl);
  if (typeof limit === "number") {
    url.searchParams.set("limit", String(limit));
  }
  const response = await fetcher(url.toString(), requestInit);

  if (!response.ok) {
    throw new Error(`Failed to fetch history (status ${response.status})`);
  }

  const data = await response.json() as ArticleHistoryResponse;
  if (!Array.isArray(data.history)) {
    throw new Error("Invalid history response");
  }

  return data;
}
