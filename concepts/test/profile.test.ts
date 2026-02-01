import { assertEqual } from "../../engine/test/helpers.ts";
import { ProfileConcept } from "../Profile.ts";

Deno.test("profile operational principle", () => {
    const profiles = new ProfileConcept();
    const reg = profiles.register({ profile: "p1", user: "u1" });
    assertEqual("profile" in reg, true);
    const bioUpdate = profiles.update({ profile: "p1", bio: "Hello world" });
    assertEqual("profile" in bioUpdate, true);
    const imageUpdate = profiles.update({ profile: "p1", image: "pic.jpg" });
    assertEqual("profile" in imageUpdate, true);
    const result = profiles._get({ profile: "p1" });
    assertEqual(result.length, 1);
    assertEqual(result[0].bio, "Hello world");
    assertEqual(result[0].image, "pic.jpg");
});
