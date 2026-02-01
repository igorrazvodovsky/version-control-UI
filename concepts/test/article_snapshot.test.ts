import { assertEqual } from "../../engine/test/helpers.ts";
import { ArticleSnapshotConcept } from "../ArticleSnapshot.ts";

Deno.test("article snapshot operational principle", () => {
    const snapshots = new ArticleSnapshotConcept();
    const capture = snapshots.capture({
        snapshot: "s1",
        commit: "c1",
        article: "a1",
        slug: "hello",
        title: "Hello",
        description: "Desc",
        body: "Body",
        author: "u1",
        deleted: false,
    });
    assertEqual("snapshot" in capture, true);
    const result = snapshots._get({ snapshot: "s1" });
    assertEqual(result.length, 1);
    assertEqual(result[0].slug, "hello");
});
