import { assertEqual } from "../../engine/test/helpers.ts";
import { TagConcept } from "../Tag.ts";

Deno.test("tag operational principle", () => {
    const tags = new TagConcept();
    const add = tags.add({ target: "a1", tag: "news" });
    assertEqual("target" in add, true);
    const result = tags._getByTarget({ target: "a1" });
    assertEqual(result.length, 1);
    assertEqual(result[0].tag, "news");
    const byTag = tags._getByTag({ tag: "news" });
    assertEqual(byTag.length, 1);
    assertEqual(byTag[0].target, "a1");
});
