import { actions, Frames, Vars } from "../../engine/mod.ts";
import { asRecord, getString } from "./helpers.ts";
import { buildTagsPayload, errorOutput } from "./format.ts";
import type { APIConcept } from "../../concepts/API.ts";
import type { UserConcept } from "../../concepts/User.ts";
import type { ArticleConcept } from "../../concepts/Article.ts";
import type { FavoriteConcept } from "../../concepts/Favorite.ts";
import type { TagConcept } from "../../concepts/Tag.ts";

function resolveUserId(User: UserConcept, username: string | undefined) {
    if (!username) return undefined;
    return User._getByName({ name: username })[0]?.user;
}

function resolveArticleId(Article: ArticleConcept, slug: string | undefined) {
    if (!slug) return undefined;
    return Article._getBySlug({ slug })[0]?.article;
}

export function makeFavoriteTagSyncs(
    API: APIConcept,
    User: UserConcept,
    Article: ArticleConcept,
    Favorite: FavoriteConcept,
    Tag: TagConcept,
) {
    const FavoriteArticle = ({ request, input, user, article }: Vars) => ({
        when: actions(
            [
                API.request,
                { method: "POST", path: "/articles/:slug/favorite", input },
                { request },
            ],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                const userName = getString(payloadValue, "user");
                if (!slugValue || !userName) return [];
                const articleId = resolveArticleId(Article, slugValue);
                if (!articleId) return [];
                const userId = resolveUserId(User, userName);
                if (!userId) return [];
                const already = Favorite._isFavorited({
                    user: userId,
                    target: articleId,
                })[0]?.favorited ?? false;
                if (already) return [];
                return [{
                    ...frame,
                    [user]: userId,
                    [article]: articleId,
                }];
            }),
        then: actions([Favorite.favorite, { user, target: article }]),
    });

    const FavoriteArticleError = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [
                API.request,
                { method: "POST", path: "/articles/:slug/favorite", input },
                { request },
            ],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                const userName = getString(payloadValue, "user");
                if (!slugValue || !userName) {
                    return [{
                        ...frame,
                        [output]: errorOutput("missing fields"),
                        [code]: 422,
                    }];
                }
                const articleId = resolveArticleId(Article, slugValue);
                if (!articleId) {
                    return [{
                        ...frame,
                        [output]: errorOutput("article not found"),
                        [code]: 404,
                    }];
                }
                const userId = resolveUserId(User, userName);
                if (!userId) {
                    return [{
                        ...frame,
                        [output]: errorOutput("user not found"),
                        [code]: 404,
                    }];
                }
                const already = Favorite._isFavorited({
                    user: userId,
                    target: articleId,
                })[0]?.favorited ?? false;
                if (already) {
                    return [{
                        ...frame,
                        [output]: errorOutput("already favorited"),
                        [code]: 422,
                    }];
                }
                return [];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const FavoriteArticleFormat = ({ request, input, user, article, payload }: Vars) => ({
        when: actions(
            [
                API.request,
                { method: "POST", path: "/articles/:slug/favorite", input },
                { request },
            ],
            [Favorite.favorite, {}, { user, target: article }],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => ({
                ...frame,
                [payload]: {
                    request: frame[request],
                    article: frame[article],
                    viewer: frame[user],
                    code: 200,
                },
            })),
        then: actions([API.format, { type: "article", payload }]),
    });

    const UnfavoriteArticle = ({ request, input, user, article }: Vars) => ({
        when: actions(
            [
                API.request,
                { method: "DELETE", path: "/articles/:slug/favorite", input },
                { request },
            ],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                const userName = getString(payloadValue, "user");
                if (!slugValue || !userName) return [];
                const articleId = resolveArticleId(Article, slugValue);
                if (!articleId) return [];
                const userId = resolveUserId(User, userName);
                if (!userId) return [];
                const already = Favorite._isFavorited({
                    user: userId,
                    target: articleId,
                })[0]?.favorited ?? false;
                if (!already) return [];
                return [{
                    ...frame,
                    [user]: userId,
                    [article]: articleId,
                }];
            }),
        then: actions([Favorite.unfavorite, { user, target: article }]),
    });

    const UnfavoriteArticleFormat = ({
        request,
        input,
        user,
        article,
        payload,
    }: Vars) => ({
        when: actions(
            [
                API.request,
                { method: "DELETE", path: "/articles/:slug/favorite", input },
                { request },
            ],
            [Favorite.unfavorite, {}, { user, target: article }],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => ({
                ...frame,
                [payload]: {
                    request: frame[request],
                    article: frame[article],
                    viewer: frame[user],
                    code: 200,
                },
            })),
        then: actions([API.format, { type: "article", payload }]),
    });

    const UnfavoriteArticleError = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [
                API.request,
                { method: "DELETE", path: "/articles/:slug/favorite", input },
                { request },
            ],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                const userName = getString(payloadValue, "user");
                if (!slugValue || !userName) {
                    return [{
                        ...frame,
                        [output]: errorOutput("missing fields"),
                        [code]: 422,
                    }];
                }
                const articleId = resolveArticleId(Article, slugValue);
                if (!articleId) {
                    return [{
                        ...frame,
                        [output]: errorOutput("article not found"),
                        [code]: 404,
                    }];
                }
                const userId = resolveUserId(User, userName);
                if (!userId) {
                    return [{
                        ...frame,
                        [output]: errorOutput("user not found"),
                        [code]: 404,
                    }];
                }
                const already = Favorite._isFavorited({
                    user: userId,
                    target: articleId,
                })[0]?.favorited ?? false;
                if (!already) {
                    return [{
                        ...frame,
                        [output]: errorOutput("not favorited"),
                        [code]: 422,
                    }];
                }
                return [];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const ListTags = ({ request, payload }: Vars) => ({
        when: actions([API.request, { method: "GET", path: "/tags" }, { request }]),
        where: (frames: Frames) =>
            frames.map((frame) => ({
                ...frame,
                [payload]: {
                    request: frame[request],
                    code: 200,
                },
            })),
        then: actions([API.format, { type: "tags", payload }]),
    });

    const FormatTagsResponse = ({ payload, request, output, code }: Vars) => ({
        when: actions([API.format, { type: "tags", payload }, {}]),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[payload]);
                const requestId = payloadValue.request;
                const status = typeof payloadValue.code === "number"
                    ? payloadValue.code
                    : 200;
                if (typeof requestId !== "string") return [];
                const { tags } = buildTagsPayload(Tag);
                return [{
                    ...frame,
                    [request]: requestId,
                    [code]: status,
                    [output]: { tags },
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    return {
        FavoriteArticleError,
        FavoriteArticle,
        FavoriteArticleFormat,
        UnfavoriteArticleError,
        UnfavoriteArticle,
        UnfavoriteArticleFormat,
        ListTags,
        FormatTagsResponse,
    } as const;
}
