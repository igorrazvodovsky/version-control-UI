import { assertEqual } from "../../engine/test/helpers.ts";
import { TagSnapshotConcept } from "../TagSnapshot.ts";

Deno.test("tag snapshot operational principle", () => {
    const snapshots = new TagSnapshotConcept();
    const capture = snapshots.capture({
        snapshot: "s1",
        commit: "c1",
        article: "a1",
        tag: "news",
    });
    assertEqual("snapshot" in capture, true);
    const result = snapshots._get({ snapshot: "s1" });
    assertEqual(result.length, 1);
    assertEqual(result[0].tag, "news");
});
