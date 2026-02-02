import { assert, assertEqual } from "./engine/test/helpers.ts";
import { handleRequest } from "./server.ts";

Deno.test("http adapter: realworld + gitless", async () => {
    const username = `user-${crypto.randomUUID().slice(0, 8)}`;
    const regRes = await handleRequest(
        new Request("http://localhost/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username,
                email: `${username}@example.com`,
            }),
        }),
    );
    assertEqual(regRes.status, 201);
    const regBody = await regRes.json() as {
        user?: { username?: string };
    };
    if (!regBody.user) {
        throw new Error("Expected user payload");
    }
    assertEqual(regBody.user.username, username);

    const initRes = await handleRequest(
        new Request("http://localhost/gitless/init", { method: "POST" }),
    );
    assertEqual(initRes.status, 200);
    const initBody = await initRes.json() as {
        ok?: boolean;
        branch?: string;
    };
    assertEqual(initBody.ok, true);
    assertEqual(typeof initBody.branch, "string");

    const missingRes = await handleRequest(
        new Request("http://localhost/unknown", { method: "GET" }),
    );
    assertEqual(missingRes.status, 404);
    const missingBody = await missingRes.json() as { error?: string };
    assert(missingBody.error);

    const invalidRes = await handleRequest(
        new Request("http://localhost/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "not-json",
        }),
    );
    assertEqual(invalidRes.status, 400);
    const invalidBody = await invalidRes.json() as { error?: string };
    assert(invalidBody.error);
});
