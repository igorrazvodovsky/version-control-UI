import { actions, Frames, Vars } from "../../engine/mod.ts";
import { asRecord, getString } from "../realworld/helpers.ts";
import type { APIConcept } from "../../concepts/API.ts";
import type { CurrentBranchConcept } from "../../concepts/CurrentBranch.ts";
import type { BranchConcept } from "../../concepts/Branch.ts";
import type { CommitConcept } from "../../concepts/Commit.ts";
import type { ArticleConcept } from "../../concepts/Article.ts";
import type { ArticleSnapshotConcept } from "../../concepts/ArticleSnapshot.ts";

const CURRENT_BRANCH_ID = "current:default";
const DEFAULT_BRANCH_ID = "branch:main";
const DEFAULT_BRANCH_NAME = "main";

function errorOutput(message: string) {
    return { error: message };
}

function getCurrentBranch(CurrentBranch: CurrentBranchConcept) {
    return CurrentBranch._get({ current: CURRENT_BRANCH_ID })[0]?.branch;
}

function hasConflict(Article: ArticleConcept, branch: string) {
    const articleIds = Article._listByBranch({ branch }).map((row) => row.article);
    for (const articleId of articleIds) {
        const row = Article._get({ article: articleId })[0];
        if (row && row.status === "CONFLICT") return true;
    }
    return false;
}

export function makeGitlessArticleSyncs(
    API: APIConcept,
    CurrentBranch: CurrentBranchConcept,
    Branch: BranchConcept,
    Commit: CommitConcept,
    Article: ArticleConcept,
    ArticleSnapshot: ArticleSnapshotConcept,
) {
    const InitBranchCreate = ({ request, branch, name }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/init" }, { request }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const existing = Branch._getByName({ name: DEFAULT_BRANCH_NAME })[0]
                    ?.branch;
                if (existing) return [];
                return [{
                    ...frame,
                    [branch]: DEFAULT_BRANCH_ID,
                    [name]: DEFAULT_BRANCH_NAME,
                }];
            }),
        then: actions([Branch.create, { branch, name }]),
    });

    const InitBranchSetCurrent = ({ request, branch, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/init" }, { request }],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => {
                const existing = Branch._getByName({ name: DEFAULT_BRANCH_NAME })[0]
                    ?.branch ?? DEFAULT_BRANCH_ID;
                return {
                    ...frame,
                    [branch]: existing,
                    [output]: { ok: true, branch: DEFAULT_BRANCH_NAME },
                    [code]: 200,
                };
            }),
        then: actions(
            [CurrentBranch.set, { current: CURRENT_BRANCH_ID, branch }],
            [API.response, { request, output, code }],
        ),
    });

    const CreateBranch = ({ request, input, name, branch }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/branches", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) return [];
                const existing = Branch._getByName({ name: nameValue })[0]?.branch;
                if (existing) return [];
                return [{
                    ...frame,
                    [name]: nameValue,
                    [branch]: `branch:${crypto.randomUUID()}`,
                }];
            }),
        then: actions([Branch.create, { branch, name }]),
    });

    const CreateBranchMissing = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/branches", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (nameValue) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("name required"),
                    [code]: 422,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const CreateBranchExists = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/branches", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) return [];
                const existing = Branch._getByName({ name: nameValue })[0]?.branch;
                if (!existing) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("branch already exists"),
                    [code]: 409,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const CreateBranchResponse = ({ request, input, branch, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/branches", input }, {
                request,
            }],
            [Branch.create, { branch }, { branch }],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                return {
                    ...frame,
                    [output]: {
                        ok: true,
                        branch: {
                            id: frame[branch],
                            name: nameValue,
                        },
                    },
                    [code]: 201,
                };
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const CloneArticlesOnBranchCreate = ({
        branch,
        sourceBranch,
        sourceArticle,
        article,
    }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/branches" }, {}],
            [Branch.create, { branch }, { branch }],
        ),
        where: (frames: Frames) =>
            frames
                .query(CurrentBranch._get, { current: CURRENT_BRANCH_ID }, {
                    branch: sourceBranch,
                })
                .query(Article._listByBranch, { branch: sourceBranch }, {
                    article: sourceArticle,
                })
                .flatMap((frame) => {
                    const sourceId = frame[sourceArticle];
                    if (typeof sourceId !== "string") return [];
                    return [{
                        ...frame,
                        [article]: crypto.randomUUID(),
                    }];
                }),
        then: actions([Article.clone, { article, source: sourceArticle, branch }]),
    });

    const SwitchBranch = ({ request, input, branch, output, code }: Vars) => ({
        when: actions(
            [API.request, {
                method: "PUT",
                path: "/gitless/branches/current",
                input,
            }, { request }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) return [];
                const branchId = Branch._getByName({ name: nameValue })[0]?.branch;
                if (!branchId) return [];
                return [{
                    ...frame,
                    [branch]: branchId,
                    [output]: { ok: true, branch: nameValue },
                    [code]: 200,
                }];
            }),
        then: actions(
            [CurrentBranch.set, { current: CURRENT_BRANCH_ID, branch }],
            [API.response, { request, output, code }],
        ),
    });

    const SwitchBranchMissing = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, {
                method: "PUT",
                path: "/gitless/branches/current",
                input,
            }, { request }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (nameValue) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("name required"),
                    [code]: 422,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const SwitchBranchNotFound = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, {
                method: "PUT",
                path: "/gitless/branches/current",
                input,
            }, { request }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) return [];
                const branchId = Branch._getByName({ name: nameValue })[0]?.branch;
                if (branchId) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("branch not found"),
                    [code]: 404,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const CommitMissingMessage = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/commits", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const messageValue = getString(payloadValue, "message");
                if (messageValue) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("message required"),
                    [code]: 422,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const CommitNoCurrentBranch = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/commits", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const messageValue = getString(payloadValue, "message");
                if (!messageValue) return [];
                const branchId = getCurrentBranch(CurrentBranch);
                if (branchId) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("current branch not set"),
                    [code]: 404,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const CommitConflict = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/commits", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const messageValue = getString(payloadValue, "message");
                if (!messageValue) return [];
                const branchId = getCurrentBranch(CurrentBranch);
                if (!branchId) return [];
                if (!hasConflict(Article, branchId)) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("branch has conflicts"),
                    [code]: 409,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const CommitWithParent = ({ request, input, branch, commit, parent, message }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/commits", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const messageValue = getString(payloadValue, "message");
                if (!messageValue) return [];
                const branchId = getCurrentBranch(CurrentBranch);
                if (!branchId) return [];
                if (hasConflict(Article, branchId)) return [];
                const parentId = Branch._getHead({ branch: branchId })[0]?.commit;
                if (!parentId) return [];
                return [{
                    ...frame,
                    [branch]: branchId,
                    [commit]: crypto.randomUUID(),
                    [parent]: parentId,
                    [message]: messageValue,
                }];
            }),
        then: actions([Commit.create, { commit, branch, parent, message }]),
    });

    const CommitWithoutParent = ({ request, input, branch, commit, message }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/commits", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const messageValue = getString(payloadValue, "message");
                if (!messageValue) return [];
                const branchId = getCurrentBranch(CurrentBranch);
                if (!branchId) return [];
                if (hasConflict(Article, branchId)) return [];
                const parentId = Branch._getHead({ branch: branchId })[0]?.commit;
                if (parentId) return [];
                return [{
                    ...frame,
                    [branch]: branchId,
                    [commit]: crypto.randomUUID(),
                    [message]: messageValue,
                }];
            }),
        then: actions([Commit.create, { commit, branch, message }]),
    });

    const CommitResponse = ({ request, commit, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/commits" }, { request }],
            [Commit.create, {}, { commit }],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => ({
                ...frame,
                [output]: { ok: true, commit: frame[commit] },
                [code]: 201,
            })),
        then: actions([API.response, { request, output, code }]),
    });

    const AdvanceBranchHead = ({ branch, commit }: Vars) => ({
        when: actions([Commit.create, { branch, commit }, { commit }]),
        then: actions([Branch.setHead, { branch, commit }]),
    });

    const CaptureArticleSnapshots = ({
        branch,
        commit,
        article,
        snapshot,
        slug,
        title,
        description,
        body,
        author,
        deleted,
    }: Vars) => ({
        when: actions([Commit.create, { branch, commit }, { commit }]),
        where: (frames: Frames) =>
            frames
                .query(Article._listByBranch, { branch }, { article })
                .flatMap((frame) => {
                    const articleId = frame[article];
                    if (typeof articleId !== "string") return [];
                    const row = Article._get({ article: articleId })[0];
                    if (!row || row.status !== "TRACKED") return [];
                    return [{
                        ...frame,
                        [snapshot]: crypto.randomUUID(),
                        [slug]: row.slug,
                        [title]: row.title,
                        [description]: row.description,
                        [body]: row.body,
                        [author]: row.author,
                        [deleted]: row.deleted,
                    }];
                }),
        then: actions([
            ArticleSnapshot.capture,
            { snapshot, commit, article, slug, title, description, body, author, deleted },
        ]),
    });

    return {
        InitBranchCreate,
        InitBranchSetCurrent,
        CreateBranch,
        CreateBranchMissing,
        CreateBranchExists,
        CreateBranchResponse,
        CloneArticlesOnBranchCreate,
        SwitchBranch,
        SwitchBranchMissing,
        SwitchBranchNotFound,
        CommitMissingMessage,
        CommitNoCurrentBranch,
        CommitConflict,
        CommitWithParent,
        CommitWithoutParent,
        CommitResponse,
        AdvanceBranchHead,
        CaptureArticleSnapshots,
    } as const;
}
