import { assertEqual } from "../../engine/test/helpers.ts";
import { BranchConcept } from "../Branch.ts";

Deno.test("branch operational principle", () => {
    const branches = new BranchConcept();
    const create = branches.create({ branch: "b1", name: "main" });
    assertEqual("branch" in create, true);
    const branch = branches._get({ branch: "b1" })[0];
    assertEqual(branch?.status, "MAIN");
    const setHead = branches.setHead({ branch: "b1", commit: "c1" });
    assertEqual("branch" in setHead, true);
    const head = branches._getHead({ branch: "b1" });
    assertEqual(head.length, 1);
    assertEqual(head[0].commit, "c1");

    const createFeat = branches.create({ branch: "b2", name: "feat" });
    assertEqual("branch" in createFeat, true);
    const feat = branches._get({ branch: "b2" })[0];
    assertEqual(feat?.status, "IN_PROGRESS");
    const markCommitted = branches.setStatus({ branch: "b2", status: "COMMITTED" });
    assertEqual("branch" in markCommitted, true);
    const committed = branches._get({ branch: "b2" })[0];
    assertEqual(committed?.status, "COMMITTED");
});
