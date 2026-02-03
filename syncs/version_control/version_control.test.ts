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
import { makeVersionControlSyncs } from "./index.ts";

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
        makeVersionControlSyncs(
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

Deno.test("version control: branch switching and commit capture", async () => {
    const { API, CurrentBranch, Branch, Article, ArticleSnapshot, Tag, TagSnapshot } = setup();

    await API.request({
        request: "r1",
        method: "POST",
        path: "/version-control/init",
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
        path: "/version-control/commits",
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
        path: "/version-control/branches",
        input: { name: "feat" },
    });

    const featBranchId = Branch._getByName({ name: "feat" })[0]?.branch;
    assert(featBranchId);

    await API.request({
        request: "r4",
        method: "PUT",
        path: "/version-control/branches/current",
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
        path: "/version-control/branches/current",
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

Deno.test("version control: branch list and change list", async () => {
    const { API, Branch, Article } = setup();

    await API.request({
        request: "b1",
        method: "POST",
        path: "/version-control/init",
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
        request: "b2",
        method: "POST",
        path: "/version-control/commits",
        input: { message: "init" },
    });

    await API.request({
        request: "b3",
        method: "POST",
        path: "/version-control/branches",
        input: { name: "feat" },
    });

    await API.request({
        request: "b4",
        method: "PUT",
        path: "/version-control/branches/current",
        input: { name: "feat" },
    });

    const featBranchId = Branch._getByName({ name: "feat" })[0]?.branch;
    assert(featBranchId);
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
        request: "b5",
        method: "GET",
        path: "/version-control/branches",
        input: {},
    });

    const branchList = API._get({ request: "b5" })[0];
    assert(branchList);
    const branchOutput = branchList.output as {
        branches: { name: string; status: string; isCurrent: boolean }[];
    };
    assertEqual(
        branchOutput.branches.some((branch) => branch.name === "feat"),
        true,
    );

    await API.request({
        request: "b6",
        method: "GET",
        path: "/version-control/branches/current",
        input: {},
    });
    const current = API._get({ request: "b6" })[0]?.output as {
        branch?: { name: string };
    };
    assertEqual(current.branch?.name, "feat");

    await API.request({
        request: "b7",
        method: "GET",
        path: "/version-control/branches/:name/changes",
        input: { name: "feat" },
    });
    const changesResponse = API._get({ request: "b7" })[0];
    assert(changesResponse);
    const changesOutput = changesResponse.output as {
        changes: { slug: string; changeType: string }[];
    };
    assertEqual(changesOutput.changes.length, 1);
    assertEqual(changesOutput.changes[0].slug, "hello");
    assertEqual(changesOutput.changes[0].changeType, "modified");
});

Deno.test("version control: article history uses main branch", async () => {
    const { API, Branch, Article } = setup();

    await API.request({
        request: "h1",
        method: "POST",
        path: "/version-control/init",
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
        request: "h2",
        method: "POST",
        path: "/version-control/commits",
        input: { message: "init" },
    });

    await API.request({
        request: "h3",
        method: "GET",
        path: "/articles/:slug/history",
        input: { slug: "hello" },
    });

    const historyResponse = API._get({ request: "h3" })[0];
    assert(historyResponse);
    const historyOutput = historyResponse.output as {
        history: { message: string }[];
    };
    assertEqual(historyOutput.history.length, 1);
    assertEqual(historyOutput.history[0].message, "init");

    await API.request({
        request: "h4",
        method: "POST",
        path: "/version-control/branches",
        input: { name: "feat" },
    });

    await API.request({
        request: "h5",
        method: "PUT",
        path: "/version-control/branches/current",
        input: { name: "feat" },
    });

    await API.request({
        request: "h6",
        method: "GET",
        path: "/articles/:slug/history",
        input: { slug: "hello" },
    });

    const historyOnFeat = API._get({ request: "h6" })[0];
    assert(historyOnFeat);
    const historyOutputFeat = historyOnFeat.output as {
        history: { message: string }[];
    };
    assertEqual(historyOutputFeat.history.length, 1);
    assertEqual(historyOutputFeat.history[0].message, "init");
});

Deno.test("version control: commit merges edit branch into main", async () => {
    const { API, Branch, Article, Tag } = setup();

    await API.request({
        request: "m1",
        method: "POST",
        path: "/version-control/init",
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
        path: "/version-control/commits",
        input: { message: "init" },
    });

    const mainHead = Branch._getHead({ branch: mainBranchId })[0]?.commit;
    assert(mainHead);

    await API.request({
        request: "m3",
        method: "POST",
        path: "/version-control/branches",
        input: { name: "feat" },
    });

    const featBranchId = Branch._getByName({ name: "feat" })[0]?.branch;
    assert(featBranchId);

    await API.request({
        request: "m4",
        method: "PUT",
        path: "/version-control/branches/current",
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
        path: "/version-control/commits",
        input: { message: "feat" },
    });

    const mergeHead = Branch._getHead({ branch: mainBranchId })[0]?.commit;
    assert(mergeHead);

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

    const featBranch = Branch._get({ branch: featBranchId })[0];
    assert(featBranch);
    assertEqual(featBranch.status, "COMMITTED");
});

Deno.test("version control: merge conflicts return error", async () => {
    const { API, Branch, Article } = setup();

    await API.request({
        request: "c1",
        method: "POST",
        path: "/version-control/init",
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
        path: "/version-control/commits",
        input: { message: "init" },
    });

    const baseHead = Branch._getHead({ branch: mainBranchId })[0]?.commit;
    assert(baseHead);

    await API.request({
        request: "c3",
        method: "POST",
        path: "/version-control/branches",
        input: { name: "feat" },
    });

    const featBranchId = Branch._getByName({ name: "feat" })[0]?.branch;
    assert(featBranchId);

    await API.request({
        request: "c4",
        method: "PUT",
        path: "/version-control/branches/current",
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
        request: "c6",
        method: "PUT",
        path: "/version-control/branches/current",
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
        method: "PUT",
        path: "/version-control/branches/current",
        input: { name: "feat" },
    });

    await API.request({
        request: "c8",
        method: "POST",
        path: "/version-control/commits",
        input: { message: "feat" },
    });

    const response = API._get({ request: "c8" })[0];
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
