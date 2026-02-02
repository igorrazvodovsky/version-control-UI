import { assertEqual } from "../../engine/test/helpers.ts";
import { ArticleConcept } from "../Article.ts";

Deno.test("article operational principle", () => {
    const articles = new ArticleConcept();
    const create = articles.create({
        article: "a1",
        branch: "b1",
        slug: "hello",
        title: "Hello",
        description: "Desc",
        body: "Body",
        author: "u1",
    });
    assertEqual("article" in create, true);
    const update = articles.update({
        article: "a1",
        title: "Hello 2",
        description: "Desc 2",
        body: "Body 2",
    });
    assertEqual("article" in update, true);
    const result = articles._get({ article: "a1" });
    assertEqual(result.length, 1);
    assertEqual(result[0].title, "Hello 2");
    assertEqual(result[0].branch, "b1");
});

Deno.test("article allows slug reuse after delete", () => {
    const articles = new ArticleConcept();
    const created = articles.create({
        article: "a1",
        branch: "b1",
        slug: "hello",
        title: "Hello",
        description: "Desc",
        body: "Body",
        author: "u1",
    });
    assertEqual("article" in created, true);
    const removed = articles.remove({ article: "a1" });
    assertEqual("article" in removed, true);
    const recreated = articles.create({
        article: "a2",
        branch: "b1",
        slug: "hello",
        title: "Hello again",
        description: "Desc",
        body: "Body",
        author: "u1",
    });
    assertEqual("article" in recreated, true);
    const bySlug = articles._getBySlug({ branch: "b1", slug: "hello" });
    assertEqual(bySlug[0]?.article, "a2");
});
