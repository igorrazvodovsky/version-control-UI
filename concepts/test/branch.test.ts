import { assertEqual } from "../../engine/test/helpers.ts";
import { BranchConcept } from "../Branch.ts";

Deno.test("branch operational principle", () => {
    const branches = new BranchConcept();
    const create = branches.create({ branch: "b1", name: "main" });
    assertEqual("branch" in create, true);
    const setHead = branches.setHead({ branch: "b1", commit: "c1" });
    assertEqual("branch" in setHead, true);
    const head = branches._getHead({ branch: "b1" });
    assertEqual(head.length, 1);
    assertEqual(head[0].commit, "c1");
});
