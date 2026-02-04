import { assertEqual } from "../../engine/test/helpers.ts";
import { CommitConcept } from "../Commit.ts";

Deno.test("commit operational principle", () => {
    const commits = new CommitConcept();
    const create = commits.create({
        commit: "c1",
        branch: "b1",
        message: "init",
        parents: [],
        version: 1,
    });
    assertEqual("commit" in create, true);
    const result = commits._get({ commit: "c1" });
    assertEqual(result.length, 1);
    assertEqual(result[0].message, "init");
    assertEqual(result[0].parents.length, 0);
    assertEqual(result[0].version, 1);
});
