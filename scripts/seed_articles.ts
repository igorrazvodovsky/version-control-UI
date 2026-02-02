import { slugifyTitle } from "../syncs/realworld/helpers.ts";

type SeedUser = {
  username: string;
  email: string;
};

type SeedArticle = {
  title: string;
  description: string;
  body: string;
  author: string;
  tagList?: string[];
};

type ArticlesResponse = {
  articles: { slug: string }[];
  articlesCount: number;
};

type ApiError = {
  errors?: { body?: string[] };
  error?: string;
};

const API_BASE_URL = Deno.env.get("API_BASE_URL") ?? "http://localhost:8080";

const users: SeedUser[] = [
  { username: "alice", email: "alice@example.com" },
  { username: "bob", email: "bob@example.com" },
  { username: "carol", email: "carol@example.com" },
];

const articles: SeedArticle[] = [
  {
    title: "Welcome to RealWorld",
    description: "A quick tour of the RealWorld API and concepts.",
    body:
      "This is a seeded article to help verify the articles list UI. It is safe to delete.",
    author: "alice",
    tagList: ["intro", "realworld"],
  },
  {
    title: "Concept Design in Practice",
    description: "Notes on modular concepts and synchronizations.",
    body:
      "Concepts are independent. Synchronizations compose them. This seed shows how articles render.",
    author: "bob",
    tagList: ["concepts", "syncs"],
  },
  {
    title: "Branches, Commits, and Articles",
    description: "How Gitless-style branches interact with articles.",
    body:
      "This demo article exists to show branch-aware article lists in the UI.",
    author: "carol",
    tagList: ["gitless", "branches"],
  },
  {
    title: "Building the UI",
    description: "Notes from wiring the Next.js frontend.",
    body:
      "The UI pulls from GET /articles. This seed makes the list visible immediately.",
    author: "alice",
    tagList: ["frontend", "nextjs"],
  },
  {
    title: "Test Data Ready",
    description: "Additional data for demos and screenshots.",
    body:
      "Use this article to test empty vs populated list states and tags rendering.",
    author: "bob",
    tagList: ["demo", "seed"],
  },
];

async function requestJson(path: string, init: RequestInit = {}) {
  const url = new URL(path, API_BASE_URL).toString();
  const headers = new Headers(init.headers);
  const hasBody = init.body !== undefined && init.body !== null;
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, {
    ...init,
    headers,
  });
  const text = await response.text();
  const trimmed = text.trim();
  let data: unknown = null;
  if (trimmed) {
    try {
      data = JSON.parse(trimmed);
    } catch {
      data = trimmed;
    }
  }
  return { response, data };
}

function getErrorMessages(payload: ApiError | null): string[] {
  if (!payload) return [];
  if (payload.error) return [payload.error];
  if (payload.errors?.body) return payload.errors.body;
  return [];
}

async function ensureGitlessInit() {
  const { response, data } = await requestJson("/gitless/init", {
    method: "POST",
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const messages = getErrorMessages(data as ApiError);
    throw new Error(
      `Failed to initialize branch: ${messages.join(", ") || response.statusText}`,
    );
  }
}

async function ensureUsers() {
  for (const user of users) {
    const { response, data } = await requestJson("/users", {
      method: "POST",
      body: JSON.stringify({ username: user.username, email: user.email }),
    });

    if (response.ok) {
      console.log(`Created user ${user.username}`);
      continue;
    }

    const messages = getErrorMessages(data as ApiError);
    if (
      response.status === 422 &&
      messages.some((message) =>
        message.includes("name not unique") || message.includes("email not unique")
      )
    ) {
      console.log(`User ${user.username} already exists`);
      continue;
    }

    throw new Error(
      `Failed to create user ${user.username}: ${messages.join(", ") || response.statusText}`,
    );
  }
}

async function fetchExistingSlugs() {
  const { response, data } = await requestJson("/articles", { method: "GET" });
  if (!response.ok) {
    const messages = getErrorMessages(data as ApiError);
    throw new Error(
      `Failed to list articles: ${messages.join(", ") || response.statusText}`,
    );
  }

  const payload = data as ArticlesResponse;
  return new Set(payload.articles.map((article) => article.slug));
}

async function seedArticles() {
  const existingSlugs = await fetchExistingSlugs();
  let created = 0;
  let skipped = 0;

  for (const article of articles) {
    const slug = slugifyTitle(article.title);
    if (slug && existingSlugs.has(slug)) {
      console.log(`Skipping ${article.title} (slug ${slug} exists)`);
      skipped += 1;
      continue;
    }

    const { response, data } = await requestJson("/articles", {
      method: "POST",
      body: JSON.stringify(article),
    });

    if (!response.ok) {
      const messages = getErrorMessages(data as ApiError);
      throw new Error(
        `Failed to create article ${article.title}: ${messages.join(", ") || response.statusText}`,
      );
    }

    const createdSlug = (data as { article?: { slug?: string } })?.article?.slug;
    if (typeof createdSlug === "string") {
      existingSlugs.add(createdSlug);
    }

    console.log(`Created article ${article.title}`);
    created += 1;
  }

  console.log(`Seed complete: ${created} created, ${skipped} skipped.`);
}

async function main() {
  console.log(`Seeding RealWorld articles via ${API_BASE_URL}`);
  await ensureGitlessInit();
  await ensureUsers();
  await seedArticles();
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    Deno.exit(1);
  }
}
