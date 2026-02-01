import { actions, Frames, Vars } from "../../engine/mod.ts";
import {
    asRecord,
    getString,
    getStringArray,
    makeSlug,
    uniqueStrings,
} from "./helpers.ts";
import {
    buildArticleView,
    buildArticlesPayload,
    errorOutput,
} from "./format.ts";
import type { APIConcept } from "../../concepts/API.ts";
import type { CurrentBranchConcept } from "../../concepts/CurrentBranch.ts";
import type { UserConcept } from "../../concepts/User.ts";
import type { ProfileConcept } from "../../concepts/Profile.ts";
import type { ArticleConcept } from "../../concepts/Article.ts";
import type { TagConcept } from "../../concepts/Tag.ts";
import type { FavoriteConcept } from "../../concepts/Favorite.ts";

const CURRENT_BRANCH_ID = "current:default";

function resolveUserId(User: UserConcept, username: string | undefined) {
    if (!username) return undefined;
    return User._getByName({ name: username })[0]?.user;
}

function bindCurrentBranch(
    frames: Frames,
    CurrentBranch: CurrentBranchConcept,
    branch: symbol,
) {
    return frames.query(
        CurrentBranch._get,
        { current: CURRENT_BRANCH_ID },
        { branch },
    );
}

function resolveArticleId(
    Article: ArticleConcept,
    branch: string | undefined,
    slug: string | undefined,
) {
    if (!branch || !slug) return undefined;
    return Article._getBySlug({ branch, slug })[0]?.article;
}

export function makeArticleSyncs(
    API: APIConcept,
    CurrentBranch: CurrentBranchConcept,
    User: UserConcept,
    Profile: ProfileConcept,
    Article: ArticleConcept,
    Tag: TagConcept,
    Favorite: FavoriteConcept,
) {
    const CreateArticle = ({
        request,
        input,
        title,
        description,
        body,
        author,
        branch,
        slug,
        article,
    }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/articles", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            bindCurrentBranch(frames, CurrentBranch, branch).flatMap((frame) => {
                const branchId = frame[branch];
                if (typeof branchId !== "string") return [];
                const payloadValue = asRecord(frame[input]);
                const authorName = getString(payloadValue, "author");
                const titleValue = getString(payloadValue, "title");
                const descriptionValue = getString(payloadValue, "description");
                const bodyValue = getString(payloadValue, "body");
                if (!authorName || !titleValue || !descriptionValue || !bodyValue) {
                    return [];
                }
                const authorId = resolveUserId(User, authorName);
                if (!authorId) return [];
                const slugValue = makeSlug(
                    titleValue,
                    (candidate) =>
                        Article._getBySlug({
                            branch: branchId,
                            slug: candidate,
                        }).length > 0,
                );
                return [{
                    ...frame,
                    [author]: authorId,
                    [branch]: branchId,
                    [title]: titleValue,
                    [description]: descriptionValue,
                    [body]: bodyValue,
                    [slug]: slugValue,
                    [article]: crypto.randomUUID(),
                }];
            }),
        then: actions([
            Article.create,
            { article, branch, slug, title, description, body, author },
        ]),
    });

    const CreateArticleError = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/articles", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const authorName = getString(payloadValue, "author");
                const titleValue = getString(payloadValue, "title");
                const descriptionValue = getString(payloadValue, "description");
                const bodyValue = getString(payloadValue, "body");
                if (!authorName) {
                    return [{
                        ...frame,
                        [output]: errorOutput("author required"),
                        [code]: 422,
                    }];
                }
                if (!titleValue || !descriptionValue || !bodyValue) {
                    return [{
                        ...frame,
                        [output]: errorOutput("missing fields"),
                        [code]: 422,
                    }];
                }
                const authorId = resolveUserId(User, authorName);
                if (!authorId) {
                    return [{
                        ...frame,
                        [output]: errorOutput("author not found"),
                        [code]: 404,
                    }];
                }
                return [];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const CreateArticleFormat = ({
        request,
        input,
        article,
        payload,
    }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/articles", input }, {
                request,
            }],
            [Article.create, {}, { article }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const authorName = getString(payloadValue, "author");
                const authorId = resolveUserId(User, authorName);
                return [{
                    ...frame,
                    [payload]: {
                        request: frame[request],
                        article: frame[article],
                        viewer: authorId,
                        code: 201,
                    },
                }];
            }),
        then: actions([API.format, { type: "article", payload }]),
    });

    const AddTagsToArticle = ({ input, article, tag }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/articles", input }, {}],
            [Article.create, {}, { article }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const tagList = getStringArray(payloadValue, "tagList");
                if (!tagList || tagList.length === 0) return [];
                return uniqueStrings(tagList).map((tagValue) => ({
                    ...frame,
                    [tag]: tagValue,
                }));
            }),
        then: actions([Tag.add, { target: article, tag }]),
    });

    const TrackArticleAfterCreate = ({ article }: Vars) => ({
        when: actions([Article.create, {}, { article }]),
        then: actions([Article.track, { article }]),
    });

    const GetArticle = ({ request, input, payload, branch }: Vars) => ({
        when: actions(
            [API.request, { method: "GET", path: "/articles/:slug", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            bindCurrentBranch(frames, CurrentBranch, branch).flatMap((frame) => {
                const branchId = frame[branch];
                if (typeof branchId !== "string") return [];
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                const articleId = resolveArticleId(Article, branchId, slugValue);
                if (!articleId) return [];
                const viewerName = getString(payloadValue, "viewer");
                const viewerId = resolveUserId(User, viewerName);
                return [{
                    ...frame,
                    [payload]: {
                        request: frame[request],
                        article: articleId,
                        viewer: viewerId,
                        code: 200,
                    },
                }];
            }),
        then: actions([API.format, { type: "article", payload }]),
    });

    const GetArticleNotFound = ({
        request,
        input,
        output,
        code,
        branch,
    }: Vars) => ({
        when: actions(
            [API.request, { method: "GET", path: "/articles/:slug", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            bindCurrentBranch(frames, CurrentBranch, branch).flatMap((frame) => {
                const branchId = frame[branch];
                if (typeof branchId !== "string") return [];
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                if (!slugValue) {
                    return [{
                        ...frame,
                        [output]: errorOutput("slug required"),
                        [code]: 422,
                    }];
                }
                const articleId = resolveArticleId(Article, branchId, slugValue);
                if (!articleId) {
                    return [{
                        ...frame,
                        [output]: errorOutput("article not found"),
                        [code]: 404,
                    }];
                }
                return [];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const UpdateArticle = ({
        request,
        input,
        title,
        description,
        body,
        article,
        author,
        branch,
    }: Vars) => ({
        when: actions(
            [API.request, {
                method: "PUT",
                path: "/articles/:slug",
                input,
            }, { request }],
        ),
        where: (frames: Frames) =>
            bindCurrentBranch(frames, CurrentBranch, branch).flatMap((frame) => {
                const branchId = frame[branch];
                if (typeof branchId !== "string") return [];
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                const authorName = getString(payloadValue, "author");
                const titleValue = getString(payloadValue, "title");
                const descriptionValue = getString(payloadValue, "description");
                const bodyValue = getString(payloadValue, "body");
                if (!slugValue || !authorName || !titleValue || !descriptionValue || !bodyValue) {
                    return [];
                }
                const articleId = resolveArticleId(Article, branchId, slugValue);
                if (!articleId) return [];
                const authorId = resolveUserId(User, authorName);
                if (!authorId) return [];
                const articleRow = Article._get({ article: articleId })[0];
                if (!articleRow || articleRow.author !== authorId) return [];
                return [{
                    ...frame,
                    [article]: articleId,
                    [author]: authorId,
                    [branch]: branchId,
                    [title]: titleValue,
                    [description]: descriptionValue,
                    [body]: bodyValue,
                }];
            }),
        then: actions([
            Article.update,
            { article, title, description, body },
        ]),
    });

    const UpdateArticleUnauthorized = ({
        request,
        input,
        output,
        branch,
    }: Vars) => ({
        when: actions(
            [API.request, {
                method: "PUT",
                path: "/articles/:slug",
                input,
            }, { request }],
        ),
        where: (frames: Frames) =>
            bindCurrentBranch(frames, CurrentBranch, branch).flatMap((frame) => {
                const branchId = frame[branch];
                if (typeof branchId !== "string") return [];
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                const authorName = getString(payloadValue, "author");
                if (!slugValue || !authorName) return [];
                const articleId = resolveArticleId(Article, branchId, slugValue);
                const authorId = resolveUserId(User, authorName);
                if (!articleId || !authorId) return [];
                const articleRow = Article._get({ article: articleId })[0];
                if (!articleRow || articleRow.author === authorId) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("forbidden"),
                }];
            }),
        then: actions([API.response, { request, output, code: 403 }]),
    });

    const UpdateArticleError = ({
        request,
        input,
        output,
        code,
        branch,
    }: Vars) => ({
        when: actions(
            [API.request, {
                method: "PUT",
                path: "/articles/:slug",
                input,
            }, { request }],
        ),
        where: (frames: Frames) =>
            bindCurrentBranch(frames, CurrentBranch, branch).flatMap((frame) => {
                const branchId = frame[branch];
                if (typeof branchId !== "string") return [];
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                const authorName = getString(payloadValue, "author");
                const titleValue = getString(payloadValue, "title");
                const descriptionValue = getString(payloadValue, "description");
                const bodyValue = getString(payloadValue, "body");
                if (!slugValue || !authorName || !titleValue || !descriptionValue || !bodyValue) {
                    return [{
                        ...frame,
                        [output]: errorOutput("missing fields"),
                        [code]: 422,
                    }];
                }
                const articleId = resolveArticleId(Article, branchId, slugValue);
                if (!articleId) {
                    return [{
                        ...frame,
                        [output]: errorOutput("article not found"),
                        [code]: 404,
                    }];
                }
                const authorId = resolveUserId(User, authorName);
                if (!authorId) {
                    return [{
                        ...frame,
                        [output]: errorOutput("author not found"),
                        [code]: 404,
                    }];
                }
                const articleRow = Article._get({ article: articleId })[0];
                if (articleRow && articleRow.author !== authorId) return [];
                return [];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const UpdateArticleFormat = ({ request, input, article, payload }: Vars) => ({
        when: actions(
            [API.request, {
                method: "PUT",
                path: "/articles/:slug",
                input,
            }, { request }],
            [Article.update, {}, { article }],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => {
                const payloadValue = asRecord(frame[input]);
                const viewerName = getString(payloadValue, "author");
                const viewerId = resolveUserId(User, viewerName);
                return {
                    ...frame,
                    [payload]: {
                        request: frame[request],
                        article: frame[article],
                        viewer: viewerId,
                        code: 200,
                    },
                };
            }),
        then: actions([API.format, { type: "article", payload }]),
    });

    const PerformDeleteArticle = ({ input, article, branch }: Vars) => ({
        when: actions([
            API.request,
            { method: "DELETE", path: "/articles/:slug", input },
            {},
        ]),
        where: (frames: Frames) =>
            bindCurrentBranch(frames, CurrentBranch, branch).flatMap((frame) => {
                const branchId = frame[branch];
                if (typeof branchId !== "string") return [];
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                const authorName = getString(payloadValue, "author");
                if (!slugValue || !authorName) return [];
                const articleId = resolveArticleId(Article, branchId, slugValue);
                if (!articleId) return [];
                const authorId = resolveUserId(User, authorName);
                if (!authorId) return [];
                const articleRow = Article._get({ article: articleId })[0];
                if (!articleRow || articleRow.author !== authorId) return [];
                return [{ ...frame, [article]: articleId }];
            }),
        then: actions([Article.remove, { article }]),
    });

    const DeleteArticle = ({ request, input, output }: Vars) => ({
        when: actions(
            [API.request, {
                method: "DELETE",
                path: "/articles/:slug",
                input,
            }, { request }],
            [Article.remove, {}, {}],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => ({
                ...frame,
                [output]: { ok: true },
            })),
        then: actions([API.response, { request, output, code: 200 }]),
    });

    const DeleteArticleUnauthorized = ({
        request,
        input,
        output,
        branch,
    }: Vars) => ({
        when: actions(
            [API.request, {
                method: "DELETE",
                path: "/articles/:slug",
                input,
            }, { request }],
        ),
        where: (frames: Frames) =>
            bindCurrentBranch(frames, CurrentBranch, branch).flatMap((frame) => {
                const branchId = frame[branch];
                if (typeof branchId !== "string") return [];
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                const authorName = getString(payloadValue, "author");
                if (!slugValue || !authorName) return [];
                const articleId = resolveArticleId(Article, branchId, slugValue);
                const authorId = resolveUserId(User, authorName);
                if (!articleId || !authorId) return [];
                const articleRow = Article._get({ article: articleId })[0];
                if (!articleRow || articleRow.author === authorId) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("forbidden"),
                }];
            }),
        then: actions([API.response, { request, output, code: 403 }]),
    });

    const DeleteArticleNotFound = ({
        request,
        input,
        output,
        code,
        branch,
    }: Vars) => ({
        when: actions(
            [API.request, {
                method: "DELETE",
                path: "/articles/:slug",
                input,
            }, { request }],
        ),
        where: (frames: Frames) =>
            bindCurrentBranch(frames, CurrentBranch, branch).flatMap((frame) => {
                const branchId = frame[branch];
                if (typeof branchId !== "string") return [];
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                const authorName = getString(payloadValue, "author");
                if (!slugValue || !authorName) {
                    return [{
                        ...frame,
                        [output]: errorOutput("missing fields"),
                        [code]: 422,
                    }];
                }
                const articleId = resolveArticleId(Article, branchId, slugValue);
                if (!articleId) {
                    return [{
                        ...frame,
                        [output]: errorOutput("article not found"),
                        [code]: 404,
                    }];
                }
                const authorId = resolveUserId(User, authorName);
                if (!authorId) {
                    return [{
                        ...frame,
                        [output]: errorOutput("author not found"),
                        [code]: 404,
                    }];
                }
                return [];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const ListArticles = ({ request, input, payload, branch }: Vars) => ({
        when: actions(
            [API.request, { method: "GET", path: "/articles", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            bindCurrentBranch(frames, CurrentBranch, branch).flatMap((frame) => {
                const branchId = frame[branch];
                if (typeof branchId !== "string") return [];
                const payloadValue = asRecord(frame[input]);
                const authorName = getString(payloadValue, "author");
                const favoritedBy = getString(payloadValue, "favoritedBy");
                const tagName = getString(payloadValue, "tag");
                const viewerName = getString(payloadValue, "viewer");
                const viewerId = resolveUserId(User, viewerName);

                const branchArticles = new Set(
                    Article._listByBranch({ branch: branchId }).map((row) =>
                        row.article
                    ),
                );

                const byAuthor = authorName
                    ? (() => {
                        const authorId = resolveUserId(User, authorName);
                        if (!authorId) return new Set<string>();
                        return new Set(
                            Article._getByAuthor({
                                branch: branchId,
                                author: authorId,
                            }).map((row) => row.article),
                        );
                    })()
                    : undefined;

                const byFavorited = favoritedBy
                    ? (() => {
                        const favUserId = resolveUserId(User, favoritedBy);
                        if (!favUserId) return new Set<string>();
                        return new Set(
                            Favorite._getByUser({ user: favUserId }).map((row) =>
                                row.target
                            ),
                        );
                    })()
                    : undefined;

                const byTag = tagName
                    ? new Set(
                        Tag._getByTag({ tag: tagName }).map((row) =>
                            row.target
                        ),
                    )
                    : undefined;

                let articleIds: string[];
                if (byAuthor || byFavorited || byTag) {
                    const sets = [byAuthor, byFavorited, byTag].filter((
                        set,
                    ): set is Set<string> => set !== undefined);
                    articleIds = sets.length > 0
                        ? Array.from(sets[0]).filter((id) =>
                            sets.every((set) => set.has(id))
                        )
                        : [];
                } else {
                    articleIds = Array.from(branchArticles);
                }

                articleIds = articleIds.filter((id) => branchArticles.has(id));

                return [{
                    ...frame,
                    [payload]: {
                        request: frame[request],
                        articles: articleIds,
                        viewer: viewerId,
                        code: 200,
                    },
                }];
            }),
        then: actions([API.format, { type: "articles", payload }]),
    });

    const FormatArticleResponse = ({
        payload,
        request,
        output,
        code,
    }: Vars) => ({
        when: actions([API.format, { type: "article", payload }, {}]),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[payload]);
                const requestId = payloadValue.request;
                const articleId = payloadValue.article;
                const viewerId = typeof payloadValue.viewer === "string"
                    ? payloadValue.viewer
                    : undefined;
                const status = typeof payloadValue.code === "number"
                    ? payloadValue.code
                    : 200;
                if (typeof requestId !== "string" || typeof articleId !== "string") {
                    return [];
                }
                const articleView = buildArticleView(
                    Article,
                    User,
                    Profile,
                    Tag,
                    Favorite,
                    articleId,
                    viewerId,
                );
                if (!articleView) return [];
                return [{
                    ...frame,
                    [request]: requestId,
                    [code]: status,
                    [output]: { article: articleView },
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const FormatArticlesResponse = ({
        payload,
        request,
        output,
        code,
    }: Vars) => ({
        when: actions([API.format, { type: "articles", payload }, {}]),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[payload]);
                const requestId = payloadValue.request;
                const viewerId = typeof payloadValue.viewer === "string"
                    ? payloadValue.viewer
                    : undefined;
                const status = typeof payloadValue.code === "number"
                    ? payloadValue.code
                    : 200;
                if (typeof requestId !== "string") return [];
                const articleIds = Array.isArray(payloadValue.articles)
                    ? payloadValue.articles.filter((id) => typeof id === "string")
                    : [];
                const { articles, articlesCount } = buildArticlesPayload(
                    Article,
                    User,
                    Profile,
                    Tag,
                    Favorite,
                    articleIds,
                    viewerId,
                );
                return [{
                    ...frame,
                    [request]: requestId,
                    [code]: status,
                    [output]: {
                        articles,
                        articlesCount,
                    },
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    return {
        CreateArticle,
        CreateArticleError,
        AddTagsToArticle,
        TrackArticleAfterCreate,
        CreateArticleFormat,
        GetArticle,
        GetArticleNotFound,
        UpdateArticle,
        UpdateArticleUnauthorized,
        UpdateArticleError,
        UpdateArticleFormat,
        DeleteArticleNotFound,
        DeleteArticleUnauthorized,
        PerformDeleteArticle,
        DeleteArticle,
        ListArticles,
        FormatArticleResponse,
        FormatArticlesResponse,
    } as const;
}
