import { assertEquals, assertRejects } from "jsr:@std/assert";
import { fetchArticles } from "./articles.ts";

Deno.test("fetchArticles builds the articles URL and returns payload", async () => {
  let calledUrl = "";
  const fetcher: typeof fetch = async (input) => {
    calledUrl = input.toString();
    const body = JSON.stringify({ articles: [], articlesCount: 0 });
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const result = await fetchArticles({
    baseUrl: "http://localhost:8080",
    fetcher,
  });

  assertEquals(calledUrl, "http://localhost:8080/articles");
  assertEquals(result.articlesCount, 0);
});

Deno.test("fetchArticles throws on non-OK responses", async () => {
  const fetcher: typeof fetch = async () => {
    return new Response("server error", { status: 500 });
  };

  await assertRejects(
    () => fetchArticles({ baseUrl: "http://localhost:8080", fetcher }),
    Error,
    "Failed to fetch articles",
  );
});
