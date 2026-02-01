import { assertEqual } from "../../engine/test/helpers.ts";
import { CurrentBranchConcept } from "../CurrentBranch.ts";

Deno.test("current branch operational principle", () => {
    const current = new CurrentBranchConcept();
    const setResult = current.set({ current: "c1", branch: "b1" });
    assertEqual("current" in setResult, true);
    const result = current._get({ current: "c1" });
    assertEqual(result.length, 1);
    assertEqual(result[0].branch, "b1");
});
