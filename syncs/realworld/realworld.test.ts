import { Logging, SyncConcept } from "../../engine/mod.ts";
import { assert, assertEqual } from "../../engine/test/helpers.ts";
import { APIConcept } from "../../concepts/API.ts";
import { ArticleConcept } from "../../concepts/Article.ts";
import { CommentConcept } from "../../concepts/Comment.ts";
import { FavoriteConcept } from "../../concepts/Favorite.ts";
import { ProfileConcept } from "../../concepts/Profile.ts";
import { TagConcept } from "../../concepts/Tag.ts";
import { UserConcept } from "../../concepts/User.ts";
import { makeRealWorldSyncs } from "./index.ts";

function setup() {
    const sync = new SyncConcept();
    sync.logging = Logging.OFF;
    const concepts = {
        API: new APIConcept(),
        User: new UserConcept(),
        Profile: new ProfileConcept(),
        Article: new ArticleConcept(),
        Comment: new CommentConcept(),
        Tag: new TagConcept(),
        Favorite: new FavoriteConcept(),
    };
    const { API, User, Profile, Article, Comment, Tag, Favorite } =
        sync.instrument(concepts);
    sync.register(
        makeRealWorldSyncs(API, User, Profile, Article, Comment, Tag, Favorite),
    );
    return { sync, API, User, Profile, Article, Comment, Tag, Favorite };
}

Deno.test("realworld syncs: register and profile", async () => {
    const { API } = setup();

    await API.request({
        request: "r1",
        method: "POST",
        path: "/users",
        input: { username: "alice", email: "a@b.com" },
    });

    const reg = API._get({ request: "r1" })[0];
    assert(reg);
    assertEqual(reg.code, 201);
    const regOut = reg.output as { user: { username: string; email: string } };
    assertEqual(regOut.user.username, "alice");
    assertEqual(regOut.user.email, "a@b.com");

    await API.request({
        request: "r2",
        method: "GET",
        path: "/profiles",
        input: { username: "alice" },
    });

    const profile = API._get({ request: "r2" })[0];
    assert(profile);
    assertEqual(profile.code, 200);
    const profileOut = profile.output as { profile: { username: string } };
    assertEqual(profileOut.profile.username, "alice");

    await API.request({
        request: "r3",
        method: "GET",
        path: "/user",
        input: { username: "alice" },
    });

    const me = API._get({ request: "r3" })[0];
    assert(me);
    assertEqual(me.code, 200);
    const meOut = me.output as { user: { username: string } };
    assertEqual(meOut.user.username, "alice");

    await API.request({
        request: "r4",
        method: "PUT",
        path: "/user",
        input: { username: "alice", newUsername: "alice2" },
    });

    const updated = API._get({ request: "r4" })[0];
    assert(updated);
    const updatedOut = updated.output as { user: { username: string } };
    assertEqual(updatedOut.user.username, "alice2");

    await API.request({
        request: "r5",
        method: "GET",
        path: "/user",
        input: {},
    });

    const missingUser = API._get({ request: "r5" })[0];
    assert(missingUser);
    assertEqual(missingUser.code, 422);
    const missingOut = missingUser.output as { errors: { body: string[] } };
    assertEqual(Array.isArray(missingOut.errors.body), true);
});

Deno.test("realworld syncs: article lifecycle", async () => {
    const { API, Article, Comment, Tag, Favorite } = setup();

    await API.request({
        request: "r1",
        method: "POST",
        path: "/users",
        input: { username: "alice", email: "a@b.com" },
    });

    await API.request({
        request: "r2",
        method: "POST",
        path: "/articles",
        input: {
            author: "alice",
            title: "Hello World",
            description: "Desc",
            body: "Body",
            tagList: ["news", "tech"],
        },
    });

    const created = API._get({ request: "r2" })[0];
    assert(created);
    assertEqual(created.code, 201);
    const createdOut = created.output as { article: { slug: string; tagList: string[] } };
    assertEqual(createdOut.article.slug, "hello-world");
    assertEqual(createdOut.article.tagList.length, 2);

    await API.request({
        request: "r2b",
        method: "GET",
        path: "/articles",
        input: { tag: "news" },
    });

    const tagged = API._get({ request: "r2b" })[0];
    assert(tagged);
    const taggedOut = tagged.output as { articles: { slug: string }[]; articlesCount: number };
    assertEqual(taggedOut.articlesCount, 1);
    assertEqual(taggedOut.articles[0].slug, "hello-world");

    const articleId = Article._getBySlug({ slug: "hello-world" })[0]?.article;
    assert(articleId);

    await API.request({
        request: "r3",
        method: "POST",
        path: "/articles/:slug/favorite",
        input: { slug: "hello-world", user: "alice" },
    });
    const fav = API._get({ request: "r3" })[0];
    assert(fav);
    const favOut = fav.output as { article: { favorited: boolean; favoritesCount: number } };
    assertEqual(favOut.article.favorited, true);
    assertEqual(favOut.article.favoritesCount, 1);

    await API.request({
        request: "r4",
        method: "DELETE",
        path: "/articles/:slug/favorite",
        input: { slug: "hello-world", user: "alice" },
    });
    const unfav = API._get({ request: "r4" })[0];
    assert(unfav);
    const unfavOut = unfav.output as { article: { favorited: boolean; favoritesCount: number } };
    assertEqual(unfavOut.article.favorited, false);
    assertEqual(unfavOut.article.favoritesCount, 0);

    await API.request({
        request: "r5",
        method: "POST",
        path: "/articles/:slug/comments",
        input: { slug: "hello-world", author: "alice", body: "Hi" },
    });
    const commentResp = API._get({ request: "r5" })[0];
    assert(commentResp);
    assertEqual(commentResp.code, 201);
    const commentOut = commentResp.output as { comment: { id: string; body: string } };
    assert(commentOut.comment.id);
    assertEqual(commentOut.comment.body, "Hi");

    await API.request({
        request: "r6",
        method: "GET",
        path: "/articles/:slug/comments",
        input: { slug: "hello-world" },
    });
    const listComments = API._get({ request: "r6" })[0];
    assert(listComments);
    const listOut = listComments.output as { comments: { id: string }[] };
    assertEqual(listOut.comments.length, 1);

    await API.request({
        request: "r7",
        method: "GET",
        path: "/tags",
        input: {},
    });
    const tagsResp = API._get({ request: "r7" })[0];
    assert(tagsResp);
    const tagsOut = tagsResp.output as { tags: string[] };
    assertEqual(tagsOut.tags.includes("news"), true);

    await API.request({
        request: "r8",
        method: "DELETE",
        path: "/articles/:slug",
        input: { slug: "hello-world", author: "alice" },
    });
    const deleted = API._get({ request: "r8" })[0];
    assert(deleted);
    const deletedOut = deleted.output as { ok: boolean };
    assertEqual(deletedOut.ok, true);

    const remainingTags = Tag._getByTarget({ target: articleId! });
    assertEqual(remainingTags.length, 0);
    const remainingFavorites = Favorite._getByTarget({ target: articleId! });
    assertEqual(remainingFavorites.length, 0);
    const remainingComments = Comment._getByTarget({ target: articleId! });
    assertEqual(remainingComments.length, 0);
});
