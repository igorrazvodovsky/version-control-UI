import { actions, Frames, Vars } from "../../engine/mod.ts";
import { asRecord, getOptionalString, getString } from "../app/helpers.ts";
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

function titleCaseWords(input: string) {
    return input
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
        .join(" ");
}

function defaultBranchLabelFromName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return "";
    if (trimmed === DEFAULT_BRANCH_NAME) return DEFAULT_BRANCH_NAME;
    if (/^t-\d+$/i.test(trimmed)) return trimmed.toUpperCase();

    const cleaned = trimmed.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
    if (!cleaned) return trimmed;
    const suffixMatch = cleaned.match(/^(.*)\s([a-z]{4})$/i);
    if (!suffixMatch) {
        return titleCaseWords(cleaned);
    }

    const [, base] = suffixMatch;
    const trimmedBase = base.trim();
    if (!trimmedBase) return titleCaseWords(cleaned);
    return titleCaseWords(trimmedBase);
}

function errorOutput(message: string) {
    return { error: message };
}

function getCurrentBranch(CurrentBranch: CurrentBranchConcept) {
    return CurrentBranch._get({ current: CURRENT_BRANCH_ID })[0]?.branch;
}

function getMainBranchId(Branch: BranchConcept) {
    return Branch._getByName({ name: DEFAULT_BRANCH_NAME })[0]?.branch;
}

function getCommitVersion(Commit: CommitConcept, commit: string | undefined) {
    if (!commit) return undefined;
    return Commit._get({ commit })[0]?.version;
}

function getNextMainVersion(Commit: CommitConcept, mainBranchId: string) {
    const commits = Commit._listByBranch({ branch: mainBranchId });
    let maxVersion = 0;
    for (const row of commits) {
        const version = Commit._get({ commit: row.commit })[0]?.version;
        if (typeof version === "number" && version > maxVersion) {
            maxVersion = version;
        }
    }
    return maxVersion + 1;
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
    updatedAt: string;
};

type BranchChange = {
    slug: string;
    title: string;
    changeType: "added" | "modified" | "deleted";
    fieldsChanged: string[];
    updatedAt: string | null;
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
                    updatedAt: row.updatedAt,
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

function buildWorkingContentBySlug(targetArticles: Map<string, TargetArticle>) {
    return Array.from(targetArticles.entries()).reduce((map, [slug, article]) => {
        map.set(slug, article.content);
        return map;
    }, new Map<string, ArticleContent>());
}

function buildWorkingUpdatedAtBySlug(targetArticles: Map<string, TargetArticle>) {
    return Array.from(targetArticles.entries()).reduce((map, [slug, article]) => {
        map.set(slug, article.updatedAt);
        return map;
    }, new Map<string, string>());
}

function diffFields(
    base: ArticleContent | undefined,
    working: ArticleContent | undefined,
    baseTags: Set<string>,
    workingTags: Set<string>,
) {
    const fields: string[] = [];
    if (!base && working) {
        return ["title", "description", "body", "tags"];
    }
    if (base && !working) {
        return ["deleted"];
    }
    if (!base || !working) return fields;
    if (base.title !== working.title) fields.push("title");
    if (base.description !== working.description) fields.push("description");
    if (base.body !== working.body) fields.push("body");
    if (base.deleted !== working.deleted) fields.push("deleted");
    if (!tagSetsEqual(baseTags, workingTags)) fields.push("tags");
    return fields;
}

function buildBranchChanges(
    ArticleSnapshot: ArticleSnapshotConcept,
    TagSnapshot: TagSnapshotConcept,
    Article: ArticleConcept,
    Tag: TagConcept,
    branch: string,
    baseCommit: string | undefined,
): BranchChange[] {
    const baseSnapshots = listArticleSnapshots(ArticleSnapshot, baseCommit);
    const baseBySlug = buildSnapshotContentBySlug(baseSnapshots);
    const baseSlugByArticle = buildSnapshotSlugByArticle(baseSnapshots);
    const baseTagsBySlug = buildTagsBySlug(TagSnapshot, baseCommit, baseSlugByArticle);

    const workingArticles = buildTargetArticles(Article, branch);
    const workingBySlug = buildWorkingContentBySlug(workingArticles);
    const workingUpdatedAt = buildWorkingUpdatedAtBySlug(workingArticles);
    const workingTagsBySlug = buildTargetTagsBySlug(Tag, workingArticles);

    const slugSet = new Set<string>([
        ...Array.from(baseBySlug.keys()),
        ...Array.from(workingBySlug.keys()),
    ]);

    const changes: BranchChange[] = [];

    slugSet.forEach((slug) => {
        const base = baseBySlug.get(slug);
        const working = workingBySlug.get(slug);
        const workingTags = workingTagsBySlug.get(slug) ?? new Set<string>();
        const baseTags = baseTagsBySlug.get(slug) ?? new Set<string>();

        if (!base && !working) return;

        const isAdded = (!!working && !working.deleted) && (!base || base.deleted);
        const isDeleted = !!base && !base.deleted && (!working || working.deleted);
        const isModified = !!base && !!working &&
            !base.deleted &&
            !working.deleted &&
            (!contentEquals(working, base) ||
                !tagSetsEqual(workingTags, baseTags));

        if (!isAdded && !isDeleted && !isModified) return;

        const changeType: BranchChange["changeType"] = isAdded
            ? "added"
            : isDeleted
            ? "deleted"
            : "modified";
        const title = working?.title ?? base?.title ?? slug;
        const fieldsChanged = diffFields(base, working, baseTags, workingTags);
        changes.push({
            slug,
            title,
            changeType,
            fieldsChanged,
            updatedAt: workingUpdatedAt.get(slug) ?? null,
        });
    });

    return changes;
}

function buildWorkingMergePlan(
    ArticleSnapshot: ArticleSnapshotConcept,
    TagSnapshot: TagSnapshotConcept,
    Article: ArticleConcept,
    Tag: TagConcept,
    baseCommit: string | undefined,
    sourceBranch: string,
    targetBranch: string,
): MergePlan {
    const baseSnapshots = listArticleSnapshots(ArticleSnapshot, baseCommit);
    const baseBySlug = buildSnapshotContentBySlug(baseSnapshots);
    const sourceBySlug = buildWorkingContentBySlug(
        buildTargetArticles(Article, sourceBranch),
    );
    const targetBySlug = buildTargetArticles(Article, targetBranch);

    const baseSlugByArticle = buildSnapshotSlugByArticle(baseSnapshots);
    const baseTagsBySlug = buildTagsBySlug(TagSnapshot, baseCommit, baseSlugByArticle);
    const sourceTagsBySlug = buildTargetTagsBySlug(
        Tag,
        buildTargetArticles(Article, sourceBranch),
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

export function makeVersionControlArticleSyncs(
    API: APIConcept,
    CurrentBranch: CurrentBranchConcept,
    Branch: BranchConcept,
    Commit: CommitConcept,
    Article: ArticleConcept,
    ArticleSnapshot: ArticleSnapshotConcept,
    Tag: TagConcept,
    TagSnapshot: TagSnapshotConcept,
) {
    const InitBranchCreate = ({ request, branch, name, label }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/init" }, { request }],
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
                    [label]: DEFAULT_BRANCH_NAME,
                }];
            }),
        then: actions([Branch.create, { branch, name, label }]),
    });

    const InitBranchSetCurrent = ({ request, branch, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/init" }, { request }],
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

    const CreateBranch = ({ request, input, name, label, branch, baseVersion }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/branches", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) return [];
                const labelValue = getString(payloadValue, "label") ??
                    defaultBranchLabelFromName(nameValue);
                if (!labelValue) return [];
                const existing = Branch._getByName({ name: nameValue })[0]?.branch;
                if (existing) return [];
                const mainId = getMainBranchId(Branch);
                const mainHead = mainId ? Branch._getHead({ branch: mainId })[0]?.commit : undefined;
                const mainVersion = mainHead ? getCommitVersion(Commit, mainHead) : undefined;
                if (typeof mainVersion !== "number") return [];
                return [{
                    ...frame,
                    [name]: nameValue,
                    [label]: labelValue,
                    [branch]: `branch:${crypto.randomUUID()}`,
                    [baseVersion]: mainVersion,
                }];
            }),
        then: actions([Branch.create, { branch, name, label, baseVersion }]),
    });

    const CreateBranchNoBaseVersion = ({ request, input, name, label, branch }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/branches", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) return [];
                const labelValue = getString(payloadValue, "label") ??
                    defaultBranchLabelFromName(nameValue);
                if (!labelValue) return [];
                const existing = Branch._getByName({ name: nameValue })[0]?.branch;
                if (existing) return [];
                const mainId = getMainBranchId(Branch);
                const mainHead = mainId ? Branch._getHead({ branch: mainId })[0]?.commit : undefined;
                const mainVersion = mainHead ? getCommitVersion(Commit, mainHead) : undefined;
                if (typeof mainVersion === "number") return [];
                return [{
                    ...frame,
                    [name]: nameValue,
                    [label]: labelValue,
                    [branch]: `branch:${crypto.randomUUID()}`,
                }];
            }),
        then: actions([Branch.create, { branch, name, label }]),
    });

    const CreateBranchMissing = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/branches", input }, {
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
            [API.request, { method: "POST", path: "/version-control/branches", input }, {
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
            [API.request, { method: "POST", path: "/version-control/branches", input }, {
                request,
            }],
            [Branch.create, { branch }, { branch }],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                const labelValue = (getString(payloadValue, "label") ??
                    (nameValue ? defaultBranchLabelFromName(nameValue) : undefined)) ?? null;
                return {
                    ...frame,
                    [output]: {
                        ok: true,
                        branch: {
                            id: frame[branch],
                            name: nameValue,
                            label: labelValue,
                        },
                    },
                    [code]: 201,
                };
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const CloneBranchHeadOnCreate = ({ branch, sourceBranch, commit }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/branches" }, {}],
            [Branch.create, { branch }, { branch }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const sourceId = Branch._getByName({ name: DEFAULT_BRANCH_NAME })[0]
                    ?.branch;
                if (!sourceId) return [];
                const head = Branch._getHead({ branch: sourceId })[0]?.commit;
                if (!head) return [];
                return [{
                    ...frame,
                    [sourceBranch]: sourceId,
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
            [API.request, { method: "POST", path: "/version-control/branches" }, {}],
            [Branch.create, { branch }, { branch }],
        ),
        where: (frames: Frames) =>
            frames
                .flatMap((frame) => {
                    const sourceId = Branch._getByName({ name: DEFAULT_BRANCH_NAME })[0]
                        ?.branch;
                    if (!sourceId) return [];
                    return [{
                        ...frame,
                        [sourceBranch]: sourceId,
                    }];
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
                path: "/version-control/branches/current",
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
                path: "/version-control/branches/current",
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
                path: "/version-control/branches/current",
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

    const RenameBranchLabel = ({ request, input, name, label, branch, output, code }: Vars) => ({
        when: actions(
            [API.request, {
                method: "PUT",
                path: "/version-control/branches/:name",
                input,
            }, { request }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                const labelValue = getString(payloadValue, "label");
                if (!nameValue || !labelValue) return [];
                if (nameValue === DEFAULT_BRANCH_NAME) return [];
                const branchId = Branch._getByName({ name: nameValue })[0]?.branch;
                if (!branchId) return [];
                return [{
                    ...frame,
                    [name]: nameValue,
                    [label]: labelValue,
                    [branch]: branchId,
                    [output]: {
                        ok: true,
                        branch: { id: branchId, name: nameValue, label: labelValue },
                    },
                    [code]: 200,
                }];
            }),
        then: actions(
            [Branch.setLabel, { branch, label }],
            [API.response, { request, output, code }],
        ),
    });

    const RenameBranchLabelMissing = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, {
                method: "PUT",
                path: "/version-control/branches/:name",
                input,
            }, { request }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                if (!nameValue) {
                    return [{
                        ...frame,
                        [output]: errorOutput("name required"),
                        [code]: 422,
                    }];
                }
                const labelValue = getString(payloadValue, "label");
                if (labelValue) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("label required"),
                    [code]: 422,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const RenameBranchLabelMain = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, {
                method: "PUT",
                path: "/version-control/branches/:name",
                input,
            }, { request }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                const labelValue = getString(payloadValue, "label");
                if (!nameValue || !labelValue) return [];
                if (nameValue !== DEFAULT_BRANCH_NAME) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("cannot rename main"),
                    [code]: 409,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const RenameBranchLabelNotFound = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, {
                method: "PUT",
                path: "/version-control/branches/:name",
                input,
            }, { request }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const nameValue = getString(payloadValue, "name");
                const labelValue = getString(payloadValue, "label");
                if (!nameValue || !labelValue) return [];
                if (nameValue === DEFAULT_BRANCH_NAME) return [];
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

    const ListBranches = ({ request, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "GET", path: "/version-control/branches" }, { request }],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => {
                const currentId = getCurrentBranch(CurrentBranch);
                const branches = Branch._list({});
                const results = branches
                    .map((row) => Branch._get({ branch: row.branch })[0])
                    .filter((row) =>
                        row !== undefined && row.status !== "COMMITTED"
                    )
                    .map((row) => {
                        const isMain = row?.name === DEFAULT_BRANCH_NAME;
                        const version = isMain ? getCommitVersion(Commit, row?.head) : undefined;
                        return {
                            id: row?.branch,
                            name: row?.name,
                            label: row?.label ?? null,
                            status: row?.status,
                            head: row?.head ?? null,
                            baseVersion: row?.baseVersion ?? null,
                            version: version ?? null,
                            isCurrent: row?.branch === currentId,
                        };
                    });
                return {
                    ...frame,
                    [output]: { branches: results },
                    [code]: 200,
                };
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const GetCurrentBranch = ({ request, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "GET", path: "/version-control/branches/current" }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const currentId = getCurrentBranch(CurrentBranch);
                if (!currentId) return [];
                const row = Branch._get({ branch: currentId })[0];
                if (!row) return [];
                const isMain = row.name === DEFAULT_BRANCH_NAME;
                const version = isMain ? getCommitVersion(Commit, row.head) : undefined;
                return [{
                    ...frame,
                    [output]: {
                        branch: {
                            id: row.branch,
                            name: row.name,
                            label: row.label ?? null,
                            status: row.status,
                            head: row.head ?? null,
                            baseVersion: row.baseVersion ?? null,
                            version: version ?? null,
                        },
                    },
                    [code]: 200,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const GetCurrentBranchMissing = ({ request, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "GET", path: "/version-control/branches/current" }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const currentId = getCurrentBranch(CurrentBranch);
                if (currentId) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("current branch not set"),
                    [code]: 404,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const BranchChanges = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, {
                method: "GET",
                path: "/version-control/branches/:name/changes",
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
                const row = Branch._get({ branch: branchId })[0];
                if (!row) return [];
                const changes = buildBranchChanges(
                    ArticleSnapshot,
                    TagSnapshot,
                    Article,
                    Tag,
                    branchId,
                    row.head,
                );
                return [{
                    ...frame,
                    [output]: {
                        branch: {
                            id: row.branch,
                            name: row.name,
                            label: row.label ?? null,
                            status: row.status,
                            head: row.head ?? null,
                        },
                        baseCommit: row.head ?? null,
                        changes,
                    },
                    [code]: 200,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const BranchChangesMissing = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, {
                method: "GET",
                path: "/version-control/branches/:name/changes",
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

    const BranchChangesNotFound = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, {
                method: "GET",
                path: "/version-control/branches/:name/changes",
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

    const ArticleHistory = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, {
                method: "GET",
                path: "/articles/:slug/history",
                input,
            }, { request }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                if (!slugValue) return [];
                const mainId = Branch._getByName({ name: DEFAULT_BRANCH_NAME })[0]
                    ?.branch;
                if (!mainId) return [];
                const articleId = Article._getBySlug({ branch: mainId, slug: slugValue })[0]
                    ?.article;
                if (!articleId) return [];
                const limitValue = getOptionalString(payloadValue, "limit");
                const limit = limitValue ? Number.parseInt(limitValue, 10) : undefined;
                const commits = Commit._listByBranch({ branch: mainId })
                    .map((row) => Commit._get({ commit: row.commit })[0])
                    .filter((row): row is NonNullable<typeof row> => row !== undefined)
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

                const history = commits.filter((commit) => {
                    const snapshots = ArticleSnapshot._listByCommit({
                        commit: commit.commit,
                    });
                    return snapshots.some((snapshot) => {
                        const row = ArticleSnapshot._get({ snapshot: snapshot.snapshot })[0];
                        return row?.article === articleId;
                    });
                }).map((commit) => ({
                    commit: commit.commit,
                    message: commit.message,
                    createdAt: commit.createdAt,
                }));

                const limited = typeof limit === "number" && Number.isFinite(limit)
                    ? history.slice(0, Math.max(0, limit))
                    : history;

                return [{
                    ...frame,
                    [output]: { history: limited },
                    [code]: 200,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const ArticleHistoryMissing = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, {
                method: "GET",
                path: "/articles/:slug/history",
                input,
            }, { request }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                if (slugValue) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("slug required"),
                    [code]: 422,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const ArticleHistoryNotFound = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, {
                method: "GET",
                path: "/articles/:slug/history",
                input,
            }, { request }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const slugValue = getString(payloadValue, "slug");
                if (!slugValue) return [];
                const mainId = Branch._getByName({ name: DEFAULT_BRANCH_NAME })[0]
                    ?.branch;
                if (!mainId) return [{
                    ...frame,
                    [output]: errorOutput("main branch not set"),
                    [code]: 409,
                }];
                const articleId = Article._getBySlug({ branch: mainId, slug: slugValue })[0]
                    ?.article;
                if (articleId) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("article not found"),
                    [code]: 404,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const MergeMissingName = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/merges", input }, {
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
            [API.request, { method: "POST", path: "/version-control/merges", input }, {
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
            [API.request, { method: "POST", path: "/version-control/merges", input }, {
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
            [API.request, { method: "POST", path: "/version-control/merges", input }, {
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
            [API.request, { method: "POST", path: "/version-control/merges", input }, {
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
            [API.request, { method: "POST", path: "/version-control/merges", input }, {
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
            [API.request, { method: "POST", path: "/version-control/merges", input }, {
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
            [API.request, { method: "POST", path: "/version-control/merges", input }, {
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
            [API.request, { method: "POST", path: "/version-control/merges", input }, {
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
            [API.request, { method: "POST", path: "/version-control/merges", input }, {
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
            [API.request, { method: "POST", path: "/version-control/merges", input }, {
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
        sourceBranch,
        version,
    }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/merges", input }, {
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
                const sourceId = Branch._getByName({ name: nameValue })[0]?.branch;
                if (!sourceId) return [];
                if (hasConflict(Article, targetBranch)) return [];
                const targetHead = Branch._getHead({ branch: targetBranch })[0]?.commit;
                const sourceHead = Branch._getHead({ branch: sourceId })[0]?.commit;
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
                const nextVersion = targetBranch === getMainBranchId(Branch)
                    ? getNextMainVersion(Commit, targetBranch)
                    : undefined;
                return [{
                    ...frame,
                    [branch]: targetBranch,
                    [sourceBranch]: sourceId,
                    [commit]: crypto.randomUUID(),
                    [parents]: [targetHead, sourceHead],
                    [message]: mergeMessage,
                    [version]: nextVersion,
                }];
            }),
        then: actions(
            [Commit.create, { commit, branch, parents, message, version }],
            [Branch.setStatus, { branch: sourceBranch, status: "COMMITTED" }],
        ),
    });

    const MergeResponse = ({ request, input, commit, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/merges", input }, {
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
            [API.request, { method: "POST", path: "/version-control/commits", input }, {
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
            [API.request, { method: "POST", path: "/version-control/commits", input }, {
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
            [API.request, { method: "POST", path: "/version-control/commits", input }, {
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

    const CommitMergeConflict = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/commits", input }, {
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
                const mainId = getMainBranchId(Branch);
                if (!mainId) return [{
                    ...frame,
                    [output]: errorOutput("main branch not set"),
                    [code]: 409,
                }];
                if (branchId === mainId) return [];
                const baseCommit = Branch._getHead({ branch: branchId })[0]?.commit;
                const plan = buildWorkingMergePlan(
                    ArticleSnapshot,
                    TagSnapshot,
                    Article,
                    Tag,
                    baseCommit,
                    branchId,
                    mainId,
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

    const CommitMergeNoChanges = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/commits", input }, {
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
                const mainId = getMainBranchId(Branch);
                if (!mainId) return [];
                if (branchId === mainId) return [];
                const baseCommit = Branch._getHead({ branch: branchId })[0]?.commit;
                const changes = buildBranchChanges(
                    ArticleSnapshot,
                    TagSnapshot,
                    Article,
                    Tag,
                    branchId,
                    baseCommit,
                );
                if (changes.length > 0) return [];
                return [{
                    ...frame,
                    [output]: errorOutput("no changes to commit"),
                    [code]: 409,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const CommitOnMainWithParent = ({
        request,
        input,
        branch,
        commit,
        parents,
        message,
        version,
    }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/commits", input }, {
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
                const mainId = getMainBranchId(Branch);
                if (!mainId || branchId !== mainId) return [];
                if (hasConflict(Article, branchId)) return [];
                const parentId = Branch._getHead({ branch: branchId })[0]?.commit;
                if (!parentId) return [];
                return [{
                    ...frame,
                    [branch]: branchId,
                    [commit]: crypto.randomUUID(),
                    [parents]: [parentId],
                    [message]: messageValue,
                    [version]: getNextMainVersion(Commit, branchId),
                }];
            }),
        then: actions([Commit.create, { commit, branch, parents, message, version }]),
    });

    const CommitOnMainWithoutParent = ({
        request,
        input,
        branch,
        commit,
        parents,
        message,
        version,
    }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/commits", input }, {
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
                const mainId = getMainBranchId(Branch);
                if (!mainId || branchId !== mainId) return [];
                if (hasConflict(Article, branchId)) return [];
                const parentId = Branch._getHead({ branch: branchId })[0]?.commit;
                if (parentId) return [];
                return [{
                    ...frame,
                    [branch]: branchId,
                    [commit]: crypto.randomUUID(),
                    [parents]: [],
                    [message]: messageValue,
                    [version]: getNextMainVersion(Commit, branchId),
                }];
            }),
        then: actions([Commit.create, { commit, branch, parents, message, version }]),
    });

    const CommitMergeApplyCreates = ({
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
            [API.request, { method: "POST", path: "/version-control/commits", input }, {
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
                const mainId = getMainBranchId(Branch);
                if (!mainId || branchId === mainId) return [];
                if (hasConflict(Article, branchId)) return [];
                const baseCommit = Branch._getHead({ branch: branchId })[0]?.commit;
                const plan = buildWorkingMergePlan(
                    ArticleSnapshot,
                    TagSnapshot,
                    Article,
                    Tag,
                    baseCommit,
                    branchId,
                    mainId,
                );
                if (plan.conflicts.length > 0 || plan.creates.length === 0) return [];
                return plan.creates.map((create) => ({
                    ...frame,
                    [branch]: mainId,
                    [article]: crypto.randomUUID(),
                    [slug]: create.slug,
                    [title]: create.title,
                    [description]: create.description,
                    [body]: create.body,
                    [author]: create.author,
                }));
            }),
        then: actions([Article.create, { article, branch, slug, title, description, body, author }]),
    });

    const CommitMergeApplyUpdates = ({
        request,
        input,
        article,
        title,
        description,
        body,
    }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/commits", input }, {
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
                const mainId = getMainBranchId(Branch);
                if (!mainId || branchId === mainId) return [];
                if (hasConflict(Article, branchId)) return [];
                const baseCommit = Branch._getHead({ branch: branchId })[0]?.commit;
                const plan = buildWorkingMergePlan(
                    ArticleSnapshot,
                    TagSnapshot,
                    Article,
                    Tag,
                    baseCommit,
                    branchId,
                    mainId,
                );
                if (plan.conflicts.length > 0 || plan.updates.length === 0) return [];
                return plan.updates.map((update) => ({
                    ...frame,
                    [article]: update.id,
                    [title]: update.content.title,
                    [description]: update.content.description,
                    [body]: update.content.body,
                }));
            }),
        then: actions([Article.update, { article, title, description, body }]),
    });

    const CommitMergeApplyRemoves = ({ request, input, article }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/commits", input }, {
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
                const mainId = getMainBranchId(Branch);
                if (!mainId || branchId === mainId) return [];
                if (hasConflict(Article, branchId)) return [];
                const baseCommit = Branch._getHead({ branch: branchId })[0]?.commit;
                const plan = buildWorkingMergePlan(
                    ArticleSnapshot,
                    TagSnapshot,
                    Article,
                    Tag,
                    baseCommit,
                    branchId,
                    mainId,
                );
                if (plan.conflicts.length > 0 || plan.removes.length === 0) return [];
                return plan.removes.map((remove) => ({
                    ...frame,
                    [article]: remove.id,
                }));
            }),
        then: actions([Article.remove, { article }]),
    });

    const CommitMergeApplyTagAdds = ({ request, input, article, tag, slug }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/commits", input }, {
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
                const mainId = getMainBranchId(Branch);
                if (!mainId || branchId === mainId) return [];
                if (hasConflict(Article, branchId)) return [];
                const baseCommit = Branch._getHead({ branch: branchId })[0]?.commit;
                const plan = buildWorkingMergePlan(
                    ArticleSnapshot,
                    TagSnapshot,
                    Article,
                    Tag,
                    baseCommit,
                    branchId,
                    mainId,
                );
                if (plan.conflicts.length > 0 || plan.tagAdds.length === 0) return [];
                return plan.tagAdds.flatMap((add) => {
                    const targetArticle = Article._getBySlug({
                        branch: mainId,
                        slug: add.slug,
                    })[0]?.article;
                    if (!targetArticle) return [];
                    return [{
                        ...frame,
                        [article]: targetArticle,
                        [tag]: add.tag,
                        [slug]: add.slug,
                    }];
                });
            }),
        then: actions([Tag.add, { target: article, tag }]),
    });

    const CommitMergeApplyTagRemoves = ({
        request,
        input,
        article,
        tag,
        slug,
    }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/commits", input }, {
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
                const mainId = getMainBranchId(Branch);
                if (!mainId || branchId === mainId) return [];
                if (hasConflict(Article, branchId)) return [];
                const baseCommit = Branch._getHead({ branch: branchId })[0]?.commit;
                const plan = buildWorkingMergePlan(
                    ArticleSnapshot,
                    TagSnapshot,
                    Article,
                    Tag,
                    baseCommit,
                    branchId,
                    mainId,
                );
                if (plan.conflicts.length > 0 || plan.tagRemoves.length === 0) return [];
                return plan.tagRemoves.flatMap((remove) => {
                    const targetArticle = Article._getBySlug({
                        branch: mainId,
                        slug: remove.slug,
                    })[0]?.article;
                    if (!targetArticle) return [];
                    return [{
                        ...frame,
                        [article]: targetArticle,
                        [tag]: remove.tag,
                        [slug]: remove.slug,
                    }];
                });
            }),
        then: actions([Tag.remove, { target: article, tag }]),
    });

    const CommitMergeCommit = ({
        request,
        input,
        branch,
        commit,
        parents,
        message,
        sourceBranch,
        version,
    }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/commits", input }, {
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
                const mainId = getMainBranchId(Branch);
                if (!mainId || branchId === mainId) return [];
                if (hasConflict(Article, branchId)) return [];
                const baseCommit = Branch._getHead({ branch: branchId })[0]?.commit;
                const plan = buildWorkingMergePlan(
                    ArticleSnapshot,
                    TagSnapshot,
                    Article,
                    Tag,
                    baseCommit,
                    branchId,
                    mainId,
                );
                if (plan.conflicts.length > 0) return [];
                const changes = buildBranchChanges(
                    ArticleSnapshot,
                    TagSnapshot,
                    Article,
                    Tag,
                    branchId,
                    baseCommit,
                );
                if (changes.length === 0) return [];
                const mainHead = Branch._getHead({ branch: mainId })[0]?.commit;
                const parentList = [mainHead, baseCommit].filter(
                    (parent, index, array) =>
                        !!parent && array.indexOf(parent) === index,
                ) as string[];
                return [{
                    ...frame,
                    [branch]: mainId,
                    [sourceBranch]: branchId,
                    [commit]: crypto.randomUUID(),
                    [parents]: parentList,
                    [message]: messageValue,
                    [version]: getNextMainVersion(Commit, mainId),
                }];
            }),
        then: actions(
            [Commit.create, { commit, branch, parents, message, version }],
            [Branch.setStatus, { branch: sourceBranch, status: "COMMITTED" }],
        ),
    });

    const CommitResponse = ({ request, commit, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/version-control/commits" }, { request }],
            [Commit.create, {}, { commit }],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => {
                const commitId = frame[commit];
                if (typeof commitId !== "string") {
                    return {
                        ...frame,
                        [output]: errorOutput("commit not found"),
                        [code]: 500,
                    };
                }
                const commitRow = Commit._get({ commit: commitId })[0];
                return {
                    ...frame,
                    [output]: { ok: true, commit: commitId, version: commitRow?.version ?? null },
                    [code]: 201,
                };
            }),
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
        CreateBranchMissing,
        CreateBranchExists,
        CreateBranch,
        CreateBranchNoBaseVersion,
        CreateBranchResponse,
        CloneBranchHeadOnCreate,
        CloneArticlesOnBranchCreate,
        CloneTagsForArticle,
        SwitchBranch,
        SwitchBranchMissing,
        SwitchBranchNotFound,
        RenameBranchLabel,
        RenameBranchLabelMissing,
        RenameBranchLabelMain,
        RenameBranchLabelNotFound,
        ListBranches,
        GetCurrentBranch,
        GetCurrentBranchMissing,
        BranchChanges,
        BranchChangesMissing,
        BranchChangesNotFound,
        ArticleHistory,
        ArticleHistoryMissing,
        ArticleHistoryNotFound,
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
        CommitMergeConflict,
        CommitMergeNoChanges,
        CommitOnMainWithParent,
        CommitOnMainWithoutParent,
        CommitMergeApplyCreates,
        CommitMergeApplyUpdates,
        CommitMergeApplyRemoves,
        CommitMergeApplyTagAdds,
        CommitMergeApplyTagRemoves,
        CommitMergeCommit,
        CommitResponse,
        AdvanceBranchHead,
        CaptureArticleSnapshots,
        CaptureTagSnapshots,
    } as const;
}
