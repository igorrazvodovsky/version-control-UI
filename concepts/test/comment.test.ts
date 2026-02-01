import { assertEqual } from "../../engine/test/helpers.ts";
import { CommentConcept } from "../Comment.ts";

Deno.test("comment operational principle", () => {
    const comments = new CommentConcept();
    const create = comments.create({
        comment: "c1",
        target: "a1",
        author: "u1",
        body: "hi",
    });
    assertEqual("comment" in create, true);
    const update = comments.update({ comment: "c1", body: "hello" });
    assertEqual("comment" in update, true);
    const result = comments._get({ comment: "c1" });
    assertEqual(result.length, 1);
    assertEqual(result[0].body, "hello");
});
