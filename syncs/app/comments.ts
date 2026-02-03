import { actions, Frames, Vars } from "../../engine/mod.ts";
import { asRecord, getString } from "./helpers.ts";
import { buildCommentView, buildCommentsPayload, errorOutput } from "./format.ts";
import type { APIConcept } from "../../concepts/API.ts";
import type { CurrentBranchConcept } from "../../concepts/CurrentBranch.ts";
import type { UserConcept } from "../../concepts/User.ts";
import type { ProfileConcept } from "../../concepts/Profile.ts";
import type { ArticleConcept } from "../../concepts/Article.ts";
import type { CommentConcept } from "../../concepts/Comment.ts";

const CURRENT_BRANCH_ID = "current:default";
const COMMENT_BRANCH_ENDPOINTS = new Set([
    "POST /articles/:slug/comments",
    "GET /articles/:slug/comments",
    "DELETE /articles/:slug/comments/:id",
]);

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

export function makeCommentSyncs(
    API: APIConcept,
    CurrentBranch: CurrentBranchConcept,
    User: UserConcept,
    Profile: ProfileConcept,
    Article: ArticleConcept,
    Comment: CommentConcept,
) {
    const CreateComment = ({
        request,
        input,
        comment,
        article,
        author,
        body,
        branch,
    }: Vars) => ({
        when: actions(
            [
                API.request,
                { method: "POST", path: "/articles/:slug/comments", input },
                { request },
            ],
        ),
        where: (frames: Frames) =>
            bindCurrentBranch(frames, CurrentBranch, branch).flatMap((frame) => {
                const branchId = frame[branch];
                if (typeof branchId !== "string") return [];
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                const authorName = getString(payloadValue, "author");
                const bodyValue = getString(payloadValue, "body");
                if (!slugValue || !authorName || !bodyValue) return [];
                const articleId = resolveArticleId(Article, branchId, slugValue);
                if (!articleId) return [];
                const authorId = resolveUserId(User, authorName);
                if (!authorId) return [];
                return [{
                    ...frame,
                    [branch]: branchId,
                    [article]: articleId,
                    [author]: authorId,
                    [body]: bodyValue,
                    [comment]: crypto.randomUUID(),
                }];
            }),
        then: actions([
            Comment.create,
            { comment, target: article, author, body },
        ]),
    });

    const CreateCommentError = ({
        request,
        input,
        output,
        code,
        branch,
    }: Vars) => ({
        when: actions(
            [
                API.request,
                { method: "POST", path: "/articles/:slug/comments", input },
                { request },
            ],
        ),
        where: (frames: Frames) =>
            bindCurrentBranch(frames, CurrentBranch, branch).flatMap((frame) => {
                const branchId = frame[branch];
                if (typeof branchId !== "string") return [];
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                const authorName = getString(payloadValue, "author");
                const bodyValue = getString(payloadValue, "body");
                if (!slugValue || !authorName || !bodyValue) {
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

    const CreateCommentFormat = ({ request, comment, payload }: Vars) => ({
        when: actions(
            [
                API.request,
                { method: "POST", path: "/articles/:slug/comments" },
                { request },
            ],
            [Comment.create, {}, { comment }],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => ({
                ...frame,
                [payload]: {
                    request: frame[request],
                    comment: frame[comment],
                    code: 201,
                },
            })),
        then: actions([API.format, { type: "comment", payload }]),
    });

    const CommentCurrentBranchMissing = ({ request, method, path, output, code }: Vars) => ({
        when: actions([API.request, { method, path }, { request }]),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const methodValue = frame[method];
                const pathValue = frame[path];
                if (typeof methodValue !== "string" || typeof pathValue !== "string") {
                    return [];
                }
                if (!COMMENT_BRANCH_ENDPOINTS.has(`${methodValue} ${pathValue}`)) {
                    return [];
                }
                const branchId =
                    CurrentBranch._get({ current: CURRENT_BRANCH_ID })[0]?.branch;
                if (branchId) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("current branch not set"),
                    [code]: 409,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const ListComments = ({ request, input, payload, branch }: Vars) => ({
        when: actions(
            [
                API.request,
                { method: "GET", path: "/articles/:slug/comments", input },
                { request },
            ],
        ),
        where: (frames: Frames) =>
            bindCurrentBranch(frames, CurrentBranch, branch).flatMap((frame) => {
                const branchId = frame[branch];
                if (typeof branchId !== "string") return [];
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                if (!slugValue) return [];
                const articleId = resolveArticleId(Article, branchId, slugValue);
                if (!articleId) return [];
                return [{
                    ...frame,
                    [payload]: {
                        request: frame[request],
                        article: articleId,
                        code: 200,
                    },
                }];
            }),
        then: actions([API.format, { type: "comments", payload }]),
    });

    const ListCommentsNotFound = ({
        request,
        input,
        output,
        code,
        branch,
    }: Vars) => ({
        when: actions(
            [
                API.request,
                { method: "GET", path: "/articles/:slug/comments", input },
                { request },
            ],
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

    const PerformDeleteComment = ({ input, comment, branch }: Vars) => ({
        when: actions([
            API.request,
            { method: "DELETE", path: "/articles/:slug/comments/:id", input },
            {},
        ]),
        where: (frames: Frames) =>
            bindCurrentBranch(frames, CurrentBranch, branch).flatMap((frame) => {
                const branchId = frame[branch];
                if (typeof branchId !== "string") return [];
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                const commentId = getString(payloadValue, "commentId");
                const authorName = getString(payloadValue, "author");
                if (!slugValue || !commentId || !authorName) return [];
                const articleId = resolveArticleId(Article, branchId, slugValue);
                if (!articleId) return [];
                const authorId = resolveUserId(User, authorName);
                if (!authorId) return [];
                const commentRow = Comment._get({ comment: commentId })[0];
                if (!commentRow) return [];
                if (commentRow.target !== articleId) return [];
                if (commentRow.author !== authorId) return [];
                return [{
                    ...frame,
                    [comment]: commentId,
                }];
            }),
        then: actions([Comment.delete, { comment }]),
    });

    const DeleteComment = ({ request, input, output }: Vars) => ({
        when: actions(
            [
                API.request,
                { method: "DELETE", path: "/articles/:slug/comments/:id", input },
                { request },
            ],
            [Comment.delete, {}, {}],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => ({
                ...frame,
                [output]: { ok: true },
            })),
        then: actions([API.response, { request, output, code: 200 }]),
    });

    const DeleteCommentUnauthorized = ({
        request,
        input,
        output,
        branch,
    }: Vars) => ({
        when: actions(
            [
                API.request,
                { method: "DELETE", path: "/articles/:slug/comments/:id", input },
                { request },
            ],
        ),
        where: (frames: Frames) =>
            bindCurrentBranch(frames, CurrentBranch, branch).flatMap((frame) => {
                const branchId = frame[branch];
                if (typeof branchId !== "string") return [];
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                const commentId = getString(payloadValue, "commentId");
                const authorName = getString(payloadValue, "author");
                if (!slugValue || !commentId || !authorName) return [];
                const articleId = resolveArticleId(Article, branchId, slugValue);
                const authorId = resolveUserId(User, authorName);
                if (!articleId || !authorId) return [];
                const commentRow = Comment._get({ comment: commentId })[0];
                if (!commentRow) return [];
                if (commentRow.target !== articleId) return [];
                if (commentRow.author === authorId) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("forbidden"),
                }];
            }),
        then: actions([API.response, { request, output, code: 403 }]),
    });

    const DeleteCommentNotFound = ({
        request,
        input,
        output,
        code,
        branch,
    }: Vars) => ({
        when: actions(
            [
                API.request,
                { method: "DELETE", path: "/articles/:slug/comments/:id", input },
                { request },
            ],
        ),
        where: (frames: Frames) =>
            bindCurrentBranch(frames, CurrentBranch, branch).flatMap((frame) => {
                const branchId = frame[branch];
                if (typeof branchId !== "string") return [];
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                const commentId = getString(payloadValue, "commentId");
                const authorName = getString(payloadValue, "author");
                if (!slugValue || !commentId || !authorName) {
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
                const commentRow = Comment._get({ comment: commentId })[0];
                if (!commentRow || commentRow.target !== articleId) {
                    return [{
                        ...frame,
                        [output]: errorOutput("comment not found"),
                        [code]: 404,
                    }];
                }
                return [];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const FormatCommentResponse = ({
        payload,
        request,
        output,
        code,
    }: Vars) => ({
        when: actions([API.format, { type: "comment", payload }, {}]),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[payload]);
                const requestId = payloadValue.request;
                const commentId = payloadValue.comment;
                const status = typeof payloadValue.code === "number"
                    ? payloadValue.code
                    : 200;
                if (typeof requestId !== "string" || typeof commentId !== "string") {
                    return [];
                }
                const commentView = buildCommentView(
                    Comment,
                    User,
                    Profile,
                    commentId,
                );
                if (!commentView) return [];
                return [{
                    ...frame,
                    [request]: requestId,
                    [code]: status,
                    [output]: { comment: commentView },
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const FormatCommentsResponse = ({
        payload,
        request,
        output,
        code,
    }: Vars) => ({
        when: actions([API.format, { type: "comments", payload }, {}]),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[payload]);
                const requestId = payloadValue.request;
                const articleId = payloadValue.article;
                const status = typeof payloadValue.code === "number"
                    ? payloadValue.code
                    : 200;
                if (typeof requestId !== "string") return [];
                if (typeof articleId !== "string" || articleId.length === 0) {
                    return [];
                }
                const { comments } = buildCommentsPayload(
                    Comment,
                    User,
                    Profile,
                    articleId,
                );
                return [{
                    ...frame,
                    [request]: requestId,
                    [code]: status,
                    [output]: { comments },
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    return {
        CommentCurrentBranchMissing,
        CreateComment,
        CreateCommentError,
        CreateCommentFormat,
        ListComments,
        ListCommentsNotFound,
        DeleteCommentNotFound,
        DeleteCommentUnauthorized,
        PerformDeleteComment,
        DeleteComment,
        FormatCommentResponse,
        FormatCommentsResponse,
    } as const;
}
