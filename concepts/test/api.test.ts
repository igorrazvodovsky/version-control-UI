import { assertEqual } from "../../engine/test/helpers.ts";
import { APIConcept } from "../API.ts";

Deno.test("api operational principle", () => {
    const api = new APIConcept();
    const req = api.request({
        request: "r1",
        method: "GET",
        path: "/health",
        input: {},
    });
    assertEqual("request" in req, true);
    const res = api.response({
        request: "r1",
        output: { ok: true },
        code: 200,
    });
    assertEqual("request" in res, true);
    const result = api._get({ request: "r1" });
    assertEqual(result.length, 1);
    assertEqual((result[0].output as { ok: boolean }).ok, true);
    assertEqual(result[0].code, 200);
});
