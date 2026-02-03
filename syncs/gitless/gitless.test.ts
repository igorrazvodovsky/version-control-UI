import { Logging, SyncConcept } from "../../engine/mod.ts";
import { assert, assertEqual } from "../../engine/test/helpers.ts";
import { APIConcept } from "../../concepts/API.ts";
import { ArticleConcept } from "../../concepts/Article.ts";
import { ArticleSnapshotConcept } from "../../concepts/ArticleSnapshot.ts";
import { BranchConcept } from "../../concepts/Branch.ts";
import { CommitConcept } from "../../concepts/Commit.ts";
import { CurrentBranchConcept } from "../../concepts/CurrentBranch.ts";
import { TagConcept } from "../../concepts/Tag.ts";
import { TagSnapshotConcept } from "../../concepts/TagSnapshot.ts";
import { makeGitlessSyncs } from "./index.ts";

const CURRENT_BRANCH_ID = "current:default";

function setup() {
    const sync = new SyncConcept();
    sync.logging = Logging.OFF;
    const concepts = {
        API: new APIConcept(),
        CurrentBranch: new CurrentBranchConcept(),
        Branch: new BranchConcept(),
        Commit: new CommitConcept(),
        Article: new ArticleConcept(),
        ArticleSnapshot: new ArticleSnapshotConcept(),
        Tag: new TagConcept(),
        TagSnapshot: new TagSnapshotConcept(),
    };
    const { API, CurrentBranch, Branch, Commit, Article, ArticleSnapshot, Tag, TagSnapshot } =
        sync.instrument(concepts);
    sync.register(
        makeGitlessSyncs(
            API,
            CurrentBranch,
            Branch,
            Commit,
            Article,
            ArticleSnapshot,
            Tag,
            TagSnapshot,
        ),
    );
    return { API, CurrentBranch, Branch, Commit, Article, ArticleSnapshot, Tag, TagSnapshot };
}

Deno.test("gitless: branch switching and commit capture", async () => {
    const { API, CurrentBranch, Branch, Article, ArticleSnapshot, Tag, TagSnapshot } = setup();

    await API.request({
        request: "r1",
        method: "POST",
        path: "/gitless/init",
        input: {},
    });

    const mainBranchId = Branch._getByName({ name: "main" })[0]?.branch;
    assert(mainBranchId);

    const created = await Article.create({
        article: "a1",
        branch: mainBranchId,
        slug: "hello",
        title: "Hello",
        description: "Desc",
        body: "Body",
        author: "u1",
    });
    assert("article" in created);
    await Article.track({ article: "a1" });
    await Tag.add({ target: "a1", tag: "news" });

    await API.request({
        request: "r2",
        method: "POST",
        path: "/gitless/commits",
        input: { message: "init" },
    });

    const head = Branch._getHead({ branch: mainBranchId })[0]?.commit;
    assert(head);

    const snapshots = ArticleSnapshot._listByCommit({ commit: head });
    assertEqual(snapshots.length, 1);
    const tagSnapshots = TagSnapshot._listByCommit({ commit: head });
    assertEqual(tagSnapshots.length, 1);
    const tagSnapshot = TagSnapshot._get({ snapshot: tagSnapshots[0].snapshot });
    assertEqual(tagSnapshot[0]?.tag, "news");

    await API.request({
        request: "r3",
        method: "POST",
        path: "/gitless/branches",
        input: { name: "feat" },
    });

    const featBranchId = Branch._getByName({ name: "feat" })[0]?.branch;
    assert(featBranchId);

    await API.request({
        request: "r4",
        method: "PUT",
        path: "/gitless/branches/current",
        input: { name: "feat" },
    });

    const current = CurrentBranch._get({ current: CURRENT_BRANCH_ID })[0];
    assert(current);
    assertEqual(current.branch, featBranchId);

    const featArticleId = Article._getBySlug({
        branch: featBranchId,
        slug: "hello",
    })[0]?.article;
    assert(featArticleId);
    const featTags = Tag._getByTarget({ target: featArticleId });
    assertEqual(featTags.length, 1);
    assertEqual(featTags[0].tag, "news");

    await Article.update({
        article: featArticleId,
        title: "Hello",
        description: "Desc",
        body: "Body feat",
    });

    await API.request({
        request: "r5",
        method: "PUT",
        path: "/gitless/branches/current",
        input: { name: "main" },
    });

    const mainArticleId = Article._getBySlug({
        branch: mainBranchId,
        slug: "hello",
    })[0]?.article;
    assert(mainArticleId);

    const mainRow = Article._get({ article: mainArticleId })[0];
    assert(mainRow);
    assertEqual(mainRow.body, "Body");
});

Deno.test("gitless: clean merge creates merge commit", async () => {
    const { API, Branch, Commit, Article, Tag } = setup();

    await API.request({
        request: "m1",
        method: "POST",
        path: "/gitless/init",
        input: {},
    });

    const mainBranchId = Branch._getByName({ name: "main" })[0]?.branch;
    assert(mainBranchId);

    await Article.create({
        article: "a1",
        branch: mainBranchId,
        slug: "hello",
        title: "Hello",
        description: "Desc",
        body: "Body",
        author: "u1",
    });
    await Article.track({ article: "a1" });
    await Tag.add({ target: "a1", tag: "base" });

    await API.request({
        request: "m2",
        method: "POST",
        path: "/gitless/commits",
        input: { message: "init" },
    });

    const mainHead = Branch._getHead({ branch: mainBranchId })[0]?.commit;
    assert(mainHead);

    await API.request({
        request: "m3",
        method: "POST",
        path: "/gitless/branches",
        input: { name: "feat" },
    });

    const featBranchId = Branch._getByName({ name: "feat" })[0]?.branch;
    assert(featBranchId);

    await API.request({
        request: "m4",
        method: "PUT",
        path: "/gitless/branches/current",
        input: { name: "feat" },
    });

    const featArticleId = Article._getBySlug({
        branch: featBranchId,
        slug: "hello",
    })[0]?.article;
    assert(featArticleId);

    await Article.update({
        article: featArticleId,
        title: "Hello",
        description: "Desc",
        body: "Body feat",
    });
    await Tag.add({ target: featArticleId, tag: "feat" });

    await API.request({
        request: "m5",
        method: "POST",
        path: "/gitless/commits",
        input: { message: "feat" },
    });

    const featHead = Branch._getHead({ branch: featBranchId })[0]?.commit;
    assert(featHead);

    await API.request({
        request: "m6",
        method: "PUT",
        path: "/gitless/branches/current",
        input: { name: "main" },
    });

    await API.request({
        request: "m7",
        method: "POST",
        path: "/gitless/merges",
        input: { name: "feat" },
    });

    const mergeHead = Branch._getHead({ branch: mainBranchId })[0]?.commit;
    assert(mergeHead);
    const mergeRow = Commit._get({ commit: mergeHead })[0];
    assert(mergeRow);
    assertEqual(mergeRow.parents.includes(mainHead), true);
    assertEqual(mergeRow.parents.includes(featHead), true);

    const mainArticleId = Article._getBySlug({
        branch: mainBranchId,
        slug: "hello",
    })[0]?.article;
    assert(mainArticleId);
    const mainRow = Article._get({ article: mainArticleId })[0];
    assert(mainRow);
    assertEqual(mainRow.body, "Body feat");
    const mainTags = Tag._getByTarget({ target: mainArticleId }).map((row) =>
        row.tag
    );
    assertEqual(mainTags.includes("feat"), true);
});

Deno.test("gitless: merge conflicts return error", async () => {
    const { API, Branch, Article } = setup();

    await API.request({
        request: "c1",
        method: "POST",
        path: "/gitless/init",
        input: {},
    });

    const mainBranchId = Branch._getByName({ name: "main" })[0]?.branch;
    assert(mainBranchId);

    await Article.create({
        article: "a1",
        branch: mainBranchId,
        slug: "hello",
        title: "Hello",
        description: "Desc",
        body: "Body",
        author: "u1",
    });
    await Article.track({ article: "a1" });

    await API.request({
        request: "c2",
        method: "POST",
        path: "/gitless/commits",
        input: { message: "init" },
    });

    const baseHead = Branch._getHead({ branch: mainBranchId })[0]?.commit;
    assert(baseHead);

    await API.request({
        request: "c3",
        method: "POST",
        path: "/gitless/branches",
        input: { name: "feat" },
    });

    const featBranchId = Branch._getByName({ name: "feat" })[0]?.branch;
    assert(featBranchId);

    await API.request({
        request: "c4",
        method: "PUT",
        path: "/gitless/branches/current",
        input: { name: "feat" },
    });

    const featArticleId = Article._getBySlug({
        branch: featBranchId,
        slug: "hello",
    })[0]?.article;
    assert(featArticleId);
    await Article.update({
        article: featArticleId,
        title: "Hello",
        description: "Desc",
        body: "Body feat",
    });

    await API.request({
        request: "c5",
        method: "POST",
        path: "/gitless/commits",
        input: { message: "feat" },
    });

    await API.request({
        request: "c6",
        method: "PUT",
        path: "/gitless/branches/current",
        input: { name: "main" },
    });

    const mainArticleId = Article._getBySlug({
        branch: mainBranchId,
        slug: "hello",
    })[0]?.article;
    assert(mainArticleId);
    await Article.update({
        article: mainArticleId,
        title: "Hello",
        description: "Desc",
        body: "Body main",
    });

    await API.request({
        request: "c7",
        method: "POST",
        path: "/gitless/merges",
        input: { name: "feat" },
    });

    const response = API._get({ request: "c7" })[0];
    assert(response);
    assertEqual(response.code, 409);
    const output = response.output as { error?: string };
    assertEqual(output.error, "merge conflicts not supported");

    const mainRow = Article._get({ article: mainArticleId })[0];
    assert(mainRow);
    assertEqual(mainRow.body, "Body main");
    const headAfter = Branch._getHead({ branch: mainBranchId })[0]?.commit;
    assertEqual(headAfter, baseHead);
});
