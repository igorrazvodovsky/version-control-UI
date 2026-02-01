import { assertEqual } from "../../engine/test/helpers.ts";
import { FavoriteConcept } from "../Favorite.ts";

Deno.test("favorite operational principle", () => {
    const favorites = new FavoriteConcept();
    const fav = favorites.favorite({ user: "u1", target: "a1" });
    assertEqual("user" in fav, true);
    const count = favorites._countByTarget({ target: "a1" });
    assertEqual(count.length, 1);
    assertEqual(count[0].count, 1);
});
