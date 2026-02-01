import { assertEqual } from "../../engine/test/helpers.ts";
import { UserConcept } from "../User.ts";

Deno.test("user operational principle", () => {
    const users = new UserConcept();
    const register = users.register({
        user: "u1",
        name: "xavier",
        email: "x@a.com",
    });
    assertEqual("user" in register, true);
    const update = users.update({ user: "u1", name: "xavier2" });
    assertEqual("user" in update, true);
    const result = users._getByName({ name: "xavier2" });
    assertEqual(result.length, 1);
    assertEqual(result[0].user, "u1");
});
