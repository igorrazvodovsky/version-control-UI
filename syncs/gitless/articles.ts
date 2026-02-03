import { actions, Frames, Vars } from "../../engine/mod.ts";
import { asRecord, getOptionalString, getString } from "../realworld/helpers.ts";
import type { APIConcept } from "../../concepts/API.ts";
import type { CurrentBranchConcept } from "../../concepts/CurrentBranch.ts";
import type { BranchConcept } from "../../concepts/Branch.ts";
import type { CommitConcept } from "../../concepts/Commit.ts";
import type { ArticleConcept } from "../../concepts/Article.ts";
import type { ArticleSnapshotConcept } from "../../concepts/ArticleSnapshot.ts";
import type { TagConcept } from "../../concepts/Tag.ts";
import type { TagSnapshotConcept } from "../../concepts/TagSnapshot.ts";

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

type ArticleContent = {
    title: string;
    description: string;
    body: string;
    author: string;
    deleted: boolean;
};

type TargetArticle = {
    id: string;
    content: ArticleContent;
};

type MergePlan = {
    conflicts: string[];
    creates: Array<{ slug: string } & ArticleContent>;
    updates: Array<{ id: string; content: ArticleContent }>;
    removes: Array<{ id: string }>;
    tagAdds: Array<{ slug: string; tag: string }>;
    tagRemoves: Array<{ slug: string; tag: string }>;
};

type ArticleSnapshotRow = {
    snapshot: string;
    commit: string;
    article: string;
    slug: string;
    title: string;
    description: string;
    body: string;
    author: string;
    deleted: boolean;
};

type TagSnapshotRow = {
    snapshot: string;
    commit: string;
    article: string;
    tag: string;
};

function contentEquals(a: ArticleContent | undefined, b: ArticleContent | undefined) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.title === b.title &&
        a.description === b.description &&
        a.body === b.body &&
        a.author === b.author &&
        a.deleted === b.deleted;
}

function tagSetsEqual(a: Set<string>, b: Set<string>) {
    if (a.size !== b.size) return false;
    return Array.from(a).every((tag) => b.has(tag));
}

function listArticleSnapshots(
    ArticleSnapshot: ArticleSnapshotConcept,
    commit: string | undefined,
): ArticleSnapshotRow[] {
    if (!commit) return [];
    return ArticleSnapshot._listByCommit({ commit })
        .map((row) => ArticleSnapshot._get({ snapshot: row.snapshot })[0])
        .filter((row): row is ArticleSnapshotRow => row !== undefined);
}

function listTagSnapshots(
    TagSnapshot: TagSnapshotConcept,
    commit: string | undefined,
): TagSnapshotRow[] {
    if (!commit) return [];
    return TagSnapshot._listByCommit({ commit })
        .map((row) => TagSnapshot._get({ snapshot: row.snapshot })[0])
        .filter((row): row is TagSnapshotRow => row !== undefined);
}

function collectAncestors(Commit: CommitConcept, start: string) {
    const visited = new Set<string>();
    const queue = [start];
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current || visited.has(current)) continue;
        visited.add(current);
        const row = Commit._get({ commit: current })[0];
        const parents = row?.parents ?? [];
        queue.push(...parents);
    }
    return visited;
}

function findMergeBase(
    Commit: CommitConcept,
    targetHead: string | undefined,
    sourceHead: string | undefined,
) {
    if (!targetHead || !sourceHead) return undefined;
    const targetAncestors = collectAncestors(Commit, targetHead);
    const visited = new Set<string>();
    const queue = [sourceHead];
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current || visited.has(current)) continue;
        visited.add(current);
        if (targetAncestors.has(current)) return current;
        const row = Commit._get({ commit: current })[0];
        const parents = row?.parents ?? [];
        queue.push(...parents);
    }
    return undefined;
}

function buildTargetArticles(Article: ArticleConcept, branch: string) {
    return Article._listByBranch({ branch })
        .map((row) => row.article)
        .map((articleId) => {
            const row = Article._get({ article: articleId })[0];
            if (!row) return undefined;
            return {
                slug: row.slug,
                entry: {
                    id: articleId,
                    content: {
                        title: row.title,
                        description: row.description,
                        body: row.body,
                        author: row.author,
                        deleted: row.deleted,
                    },
                },
            };
        })
        .filter((row): row is { slug: string; entry: TargetArticle } => row !== undefined)
        .reduce((map, row) => {
            map.set(row.slug, row.entry);
            return map;
        }, new Map<string, TargetArticle>());
}

function buildSnapshotContentBySlug(snapshots: ArticleSnapshotRow[]) {
    return snapshots.reduce((map, row) => {
        map.set(row.slug, {
            title: row.title,
            description: row.description,
            body: row.body,
            author: row.author,
            deleted: row.deleted,
        });
        return map;
    }, new Map<string, ArticleContent>());
}

function buildSnapshotSlugByArticle(snapshots: ArticleSnapshotRow[]) {
    return snapshots.reduce((map, row) => {
        map.set(row.article, row.slug);
        return map;
    }, new Map<string, string>());
}

function buildTagsBySlug(
    TagSnapshot: TagSnapshotConcept,
    commit: string | undefined,
    slugByArticle: Map<string, string>,
) {
    const map = new Map<string, Set<string>>();
    listTagSnapshots(TagSnapshot, commit).forEach((row) => {
        const slug = slugByArticle.get(row.article);
        if (!slug) return;
        const existing = map.get(slug) ?? new Set<string>();
        existing.add(row.tag);
        map.set(slug, existing);
    });
    return map;
}

function buildTargetTagsBySlug(
    Tag: TagConcept,
    targetArticles: Map<string, TargetArticle>,
) {
    const map = new Map<string, Set<string>>();
    Array.from(targetArticles.entries()).forEach(([slug, article]) => {
        const tags = Tag._getByTarget({ target: article.id }).map((row) => row.tag);
        map.set(slug, new Set(tags));
    });
    return map;
}

function buildMergePlan(
    Commit: CommitConcept,
    ArticleSnapshot: ArticleSnapshotConcept,
    TagSnapshot: TagSnapshotConcept,
    Article: ArticleConcept,
    Tag: TagConcept,
    targetBranch: string,
    targetHead: string,
    sourceHead: string,
): MergePlan {
    const baseHead = findMergeBase(Commit, targetHead, sourceHead);
    const baseSnapshots = listArticleSnapshots(ArticleSnapshot, baseHead);
    const sourceSnapshots = listArticleSnapshots(ArticleSnapshot, sourceHead);
    const baseBySlug = buildSnapshotContentBySlug(baseSnapshots);
    const sourceBySlug = buildSnapshotContentBySlug(sourceSnapshots);
    const targetBySlug = buildTargetArticles(Article, targetBranch);

    const baseSlugByArticle = buildSnapshotSlugByArticle(baseSnapshots);
    const sourceSlugByArticle = buildSnapshotSlugByArticle(sourceSnapshots);
    const baseTagsBySlug = buildTagsBySlug(TagSnapshot, baseHead, baseSlugByArticle);
    const sourceTagsBySlug = buildTagsBySlug(
        TagSnapshot,
        sourceHead,
        sourceSlugByArticle,
    );
    const targetTagsBySlug = buildTargetTagsBySlug(Tag, targetBySlug);

    const slugSet = new Set<string>([
        ...Array.from(baseBySlug.keys()),
        ...Array.from(sourceBySlug.keys()),
        ...Array.from(targetBySlug.keys()),
    ]);
    const conflicts = new Set<string>();
    const creates: Array<{ slug: string } & ArticleContent> = [];
    const updates: Array<{ id: string; content: ArticleContent }> = [];
    const removes: Array<{ id: string }> = [];
    const tagAdds: Array<{ slug: string; tag: string }> = [];
    const tagRemoves: Array<{ slug: string; tag: string }> = [];

    Array.from(slugSet.values()).forEach((slug) => {
        const source = sourceBySlug.get(slug);
        if (!source) return;
        const base = baseBySlug.get(slug);
        const target = targetBySlug.get(slug);
        const targetContent = target?.content;
        const sourceEqBase = contentEquals(source, base);
        if (sourceEqBase) return;
        const targetEqBase = contentEquals(targetContent, base);
        const sourceEqTarget = contentEquals(source, targetContent);
        if (targetEqBase) {
            if (source.deleted) {
                if (target) {
                    removes.push({ id: target.id });
                }
                return;
            }
            if (target) {
                updates.push({ id: target.id, content: source });
            } else {
                creates.push({ slug, ...source });
            }
            return;
        }
        if (!sourceEqTarget) {
            conflicts.add(slug);
        }
    });

    Array.from(sourceBySlug.keys()).forEach((slug) => {
        const baseTags = baseTagsBySlug.get(slug) ?? new Set<string>();
        const sourceTags = sourceTagsBySlug.get(slug) ?? new Set<string>();
        const targetTags = targetTagsBySlug.get(slug) ?? new Set<string>();
        const sourceEqBase = tagSetsEqual(sourceTags, baseTags);
        if (sourceEqBase) return;
        const targetEqBase = tagSetsEqual(targetTags, baseTags);
        const sourceEqTarget = tagSetsEqual(sourceTags, targetTags);
        if (targetEqBase) {
            Array.from(sourceTags)
                .filter((tag) => !targetTags.has(tag))
                .forEach((tag) => tagAdds.push({ slug, tag }));
            Array.from(targetTags)
                .filter((tag) => !sourceTags.has(tag))
                .forEach((tag) => tagRemoves.push({ slug, tag }));
            return;
        }
        if (!sourceEqTarget) {
            conflicts.add(slug);
        }
    });

    return {
        conflicts: Array.from(conflicts),
        creates,
        updates,
        removes,
        tagAdds,
        tagRemoves,
    };
}

export function makeGitlessArticleSyncs(
    API: APIConcept,
    CurrentBranch: CurrentBranchConcept,
    Branch: BranchConcept,
    Commit: CommitConcept,
    Article: ArticleConcept,
    ArticleSnapshot: ArticleSnapshotConcept,
    Tag: TagConcept,
    TagSnapshot: TagSnapshotConcept,
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

    const CloneBranchHeadOnCreate = ({ branch, sourceBranch, commit }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/branches" }, {}],
            [Branch.create, { branch }, { branch }],
        ),
        where: (frames: Frames) =>
            frames
                .query(CurrentBranch._get, { current: CURRENT_BRANCH_ID }, {
                    branch: sourceBranch,
                })
                .flatMap((frame) => {
                    const sourceId = frame[sourceBranch];
                    if (typeof sourceId !== "string") return [];
                    const head = Branch._getHead({ branch: sourceId })[0]?.commit;
                    if (!head) return [];
                    return [{
                        ...frame,
                        [commit]: head,
                    }];
                }),
        then: actions([Branch.setHead, { branch, commit }]),
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

    const CloneTagsForArticle = ({ article, source, tag }: Vars) => ({
        when: actions([Article.clone, { article, source }, { article }]),
        where: (frames: Frames) =>
            frames.query(Tag._getByTarget, { target: source }, { tag }),
        then: actions([Tag.add, { target: article, tag }]),
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

    const MergeMissingName = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/merges", input }, {
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

    const MergeNoCurrentBranch = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/merges", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) return [];
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

    const MergeSourceNotFound = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/merges", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) return [];
                const branchId = getCurrentBranch(CurrentBranch);
                if (!branchId) return [];
                const sourceBranch = Branch._getByName({ name: nameValue })[0]?.branch;
                if (sourceBranch) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("branch not found"),
                    [code]: 404,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const MergeBranchConflict = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/merges", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) return [];
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

    const MergeNoHead = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/merges", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) return [];
                const targetBranch = getCurrentBranch(CurrentBranch);
                if (!targetBranch) return [];
                const sourceBranch = Branch._getByName({ name: nameValue })[0]?.branch;
                if (!sourceBranch) return [];
                const targetHead = Branch._getHead({ branch: targetBranch })[0]?.commit;
                const sourceHead = Branch._getHead({ branch: sourceBranch })[0]?.commit;
                if (targetHead && sourceHead) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("branch has no commits"),
                    [code]: 409,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const MergeConflict = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/merges", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) return [];
                const targetBranch = getCurrentBranch(CurrentBranch);
                if (!targetBranch) return [];
                const sourceBranch = Branch._getByName({ name: nameValue })[0]?.branch;
                if (!sourceBranch) return [];
                if (hasConflict(Article, targetBranch)) return [];
                const targetHead = Branch._getHead({ branch: targetBranch })[0]?.commit;
                const sourceHead = Branch._getHead({ branch: sourceBranch })[0]?.commit;
                if (!targetHead || !sourceHead) return [];
                const plan = buildMergePlan(
                    Commit,
                    ArticleSnapshot,
                    TagSnapshot,
                    Article,
                    Tag,
                    targetBranch,
                    targetHead,
                    sourceHead,
                );
                if (plan.conflicts.length === 0) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("merge conflicts not supported"),
                    [code]: 409,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const MergeApplyCreates = ({
        request,
        input,
        branch,
        article,
        slug,
        title,
        description,
        body,
        author,
    }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/merges", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) return [];
                const targetBranch = getCurrentBranch(CurrentBranch);
                if (!targetBranch) return [];
                const sourceBranch = Branch._getByName({ name: nameValue })[0]?.branch;
                if (!sourceBranch) return [];
                if (hasConflict(Article, targetBranch)) return [];
                const targetHead = Branch._getHead({ branch: targetBranch })[0]?.commit;
                const sourceHead = Branch._getHead({ branch: sourceBranch })[0]?.commit;
                if (!targetHead || !sourceHead) return [];
                const plan = buildMergePlan(
                    Commit,
                    ArticleSnapshot,
                    TagSnapshot,
                    Article,
                    Tag,
                    targetBranch,
                    targetHead,
                    sourceHead,
                );
                if (plan.conflicts.length > 0) return [];
                return plan.creates.map((create) => ({
                    ...frame,
                    [branch]: targetBranch,
                    [article]: `article:${crypto.randomUUID()}`,
                    [slug]: create.slug,
                    [title]: create.title,
                    [description]: create.description,
                    [body]: create.body,
                    [author]: create.author,
                }));
            }),
        then: actions(
            [Article.create, { article, branch, slug, title, description, body, author }],
            [Article.track, { article }],
        ),
    });

    const MergeApplyUpdates = ({
        request,
        input,
        article,
        title,
        description,
        body,
    }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/merges", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) return [];
                const targetBranch = getCurrentBranch(CurrentBranch);
                if (!targetBranch) return [];
                const sourceBranch = Branch._getByName({ name: nameValue })[0]?.branch;
                if (!sourceBranch) return [];
                if (hasConflict(Article, targetBranch)) return [];
                const targetHead = Branch._getHead({ branch: targetBranch })[0]?.commit;
                const sourceHead = Branch._getHead({ branch: sourceBranch })[0]?.commit;
                if (!targetHead || !sourceHead) return [];
                const plan = buildMergePlan(
                    Commit,
                    ArticleSnapshot,
                    TagSnapshot,
                    Article,
                    Tag,
                    targetBranch,
                    targetHead,
                    sourceHead,
                );
                if (plan.conflicts.length > 0) return [];
                return plan.updates.map((update) => ({
                    ...frame,
                    [article]: update.id,
                    [title]: update.content.title,
                    [description]: update.content.description,
                    [body]: update.content.body,
                }));
            }),
        then: actions(
            [Article.update, { article, title, description, body }],
            [Article.track, { article }],
        ),
    });

    const MergeApplyRemoves = ({ request, input, article }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/merges", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) return [];
                const targetBranch = getCurrentBranch(CurrentBranch);
                if (!targetBranch) return [];
                const sourceBranch = Branch._getByName({ name: nameValue })[0]?.branch;
                if (!sourceBranch) return [];
                if (hasConflict(Article, targetBranch)) return [];
                const targetHead = Branch._getHead({ branch: targetBranch })[0]?.commit;
                const sourceHead = Branch._getHead({ branch: sourceBranch })[0]?.commit;
                if (!targetHead || !sourceHead) return [];
                const plan = buildMergePlan(
                    Commit,
                    ArticleSnapshot,
                    TagSnapshot,
                    Article,
                    Tag,
                    targetBranch,
                    targetHead,
                    sourceHead,
                );
                if (plan.conflicts.length > 0) return [];
                return plan.removes.map((remove) => ({
                    ...frame,
                    [article]: remove.id,
                }));
            }),
        then: actions(
            [Article.remove, { article }],
            [Article.track, { article }],
        ),
    });

    const MergeApplyTagAdds = ({ request, input, target, tag }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/merges", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) return [];
                const targetBranch = getCurrentBranch(CurrentBranch);
                if (!targetBranch) return [];
                const sourceBranch = Branch._getByName({ name: nameValue })[0]?.branch;
                if (!sourceBranch) return [];
                if (hasConflict(Article, targetBranch)) return [];
                const targetHead = Branch._getHead({ branch: targetBranch })[0]?.commit;
                const sourceHead = Branch._getHead({ branch: sourceBranch })[0]?.commit;
                if (!targetHead || !sourceHead) return [];
                const plan = buildMergePlan(
                    Commit,
                    ArticleSnapshot,
                    TagSnapshot,
                    Article,
                    Tag,
                    targetBranch,
                    targetHead,
                    sourceHead,
                );
                if (plan.conflicts.length > 0) return [];
                return plan.tagAdds.flatMap((add) => {
                    const articleId =
                        Article._getBySlug({ branch: targetBranch, slug: add.slug })[0]
                            ?.article;
                    if (!articleId) return [];
                    return [{
                        ...frame,
                        [target]: articleId,
                        [tag]: add.tag,
                    }];
                });
            }),
        then: actions([Tag.add, { target, tag }]),
    });

    const MergeApplyTagRemoves = ({ request, input, target, tag }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/merges", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) return [];
                const targetBranch = getCurrentBranch(CurrentBranch);
                if (!targetBranch) return [];
                const sourceBranch = Branch._getByName({ name: nameValue })[0]?.branch;
                if (!sourceBranch) return [];
                if (hasConflict(Article, targetBranch)) return [];
                const targetHead = Branch._getHead({ branch: targetBranch })[0]?.commit;
                const sourceHead = Branch._getHead({ branch: sourceBranch })[0]?.commit;
                if (!targetHead || !sourceHead) return [];
                const plan = buildMergePlan(
                    Commit,
                    ArticleSnapshot,
                    TagSnapshot,
                    Article,
                    Tag,
                    targetBranch,
                    targetHead,
                    sourceHead,
                );
                if (plan.conflicts.length > 0) return [];
                return plan.tagRemoves.flatMap((remove) => {
                    const articleId =
                        Article._getBySlug({ branch: targetBranch, slug: remove.slug })[0]
                            ?.article;
                    if (!articleId) return [];
                    return [{
                        ...frame,
                        [target]: articleId,
                        [tag]: remove.tag,
                    }];
                });
            }),
        then: actions([Tag.remove, { target, tag }]),
    });

    const MergeCommit = ({
        request,
        input,
        branch,
        commit,
        parents,
        message,
    }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/merges", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) return [];
                const rawMessage = getOptionalString(payloadValue, "message");
                const trimmed = rawMessage ? rawMessage.trim() : "";
                const mergeMessage = trimmed.length > 0 ? trimmed : `merge ${nameValue}`;
                const targetBranch = getCurrentBranch(CurrentBranch);
                if (!targetBranch) return [];
                const sourceBranch = Branch._getByName({ name: nameValue })[0]?.branch;
                if (!sourceBranch) return [];
                if (hasConflict(Article, targetBranch)) return [];
                const targetHead = Branch._getHead({ branch: targetBranch })[0]?.commit;
                const sourceHead = Branch._getHead({ branch: sourceBranch })[0]?.commit;
                if (!targetHead || !sourceHead) return [];
                const plan = buildMergePlan(
                    Commit,
                    ArticleSnapshot,
                    TagSnapshot,
                    Article,
                    Tag,
                    targetBranch,
                    targetHead,
                    sourceHead,
                );
                if (plan.conflicts.length > 0) return [];
                return [{
                    ...frame,
                    [branch]: targetBranch,
                    [commit]: crypto.randomUUID(),
                    [parents]: [targetHead, sourceHead],
                    [message]: mergeMessage,
                }];
            }),
        then: actions([Commit.create, { commit, branch, parents, message }]),
    });

    const MergeResponse = ({ request, input, commit, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/gitless/merges", input }, {
                request,
            }],
            [Commit.create, { commit }, { commit }],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                return {
                    ...frame,
                    [output]: {
                        ok: true,
                        merge: { source: nameValue, commit: frame[commit] },
                    },
                    [code]: 200,
                };
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

    const CommitWithParent = ({
        request,
        input,
        branch,
        commit,
        parents,
        message,
    }: Vars) => ({
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
                    [parents]: [parentId],
                    [message]: messageValue,
                }];
            }),
        then: actions([Commit.create, { commit, branch, parents, message }]),
    });

    const CommitWithoutParent = ({
        request,
        input,
        branch,
        commit,
        parents,
        message,
    }: Vars) => ({
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
                    [parents]: [],
                    [message]: messageValue,
                }];
            }),
        then: actions([Commit.create, { commit, branch, parents, message }]),
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

    const CaptureTagSnapshots = ({ branch, commit, article, tag, snapshot }: Vars) => ({
        when: actions([Commit.create, { branch, commit }, { commit }]),
        where: (frames: Frames) =>
            frames
                .query(Article._listByBranch, { branch }, { article })
                .flatMap((frame) => {
                    const articleId = frame[article];
                    if (typeof articleId !== "string") return [];
                    const row = Article._get({ article: articleId })[0];
                    if (!row || row.status !== "TRACKED") return [];
                    const tags = Tag._getByTarget({ target: articleId });
                    return tags.map((tagRow) => ({
                        ...frame,
                        [snapshot]: crypto.randomUUID(),
                        [tag]: tagRow.tag,
                    }));
                }),
        then: actions([TagSnapshot.capture, { snapshot, commit, article, tag }]),
    });

    return {
        InitBranchCreate,
        InitBranchSetCurrent,
        CreateBranch,
        CreateBranchMissing,
        CreateBranchExists,
        CreateBranchResponse,
        CloneBranchHeadOnCreate,
        CloneArticlesOnBranchCreate,
        CloneTagsForArticle,
        SwitchBranch,
        SwitchBranchMissing,
        SwitchBranchNotFound,
        MergeMissingName,
        MergeNoCurrentBranch,
        MergeSourceNotFound,
        MergeBranchConflict,
        MergeNoHead,
        MergeConflict,
        MergeApplyCreates,
        MergeApplyUpdates,
        MergeApplyRemoves,
        MergeApplyTagAdds,
        MergeApplyTagRemoves,
        MergeCommit,
        MergeResponse,
        CommitMissingMessage,
        CommitNoCurrentBranch,
        CommitConflict,
        CommitWithParent,
        CommitWithoutParent,
        CommitResponse,
        AdvanceBranchHead,
        CaptureArticleSnapshots,
        CaptureTagSnapshots,
    } as const;
}
