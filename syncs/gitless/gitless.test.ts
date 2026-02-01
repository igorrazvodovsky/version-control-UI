import { Logging, SyncConcept } from "../../engine/mod.ts";
import { assert, assertEqual } from "../../engine/test/helpers.ts";
import { APIConcept } from "../../concepts/API.ts";
import { ArticleConcept } from "../../concepts/Article.ts";
import { ArticleSnapshotConcept } from "../../concepts/ArticleSnapshot.ts";
import { BranchConcept } from "../../concepts/Branch.ts";
import { CommitConcept } from "../../concepts/Commit.ts";
import { CurrentBranchConcept } from "../../concepts/CurrentBranch.ts";
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
    };
    const { API, CurrentBranch, Branch, Commit, Article, ArticleSnapshot } =
        sync.instrument(concepts);
    sync.register(
        makeGitlessSyncs(
            API,
            CurrentBranch,
            Branch,
            Commit,
            Article,
            ArticleSnapshot,
        ),
    );
    return { API, CurrentBranch, Branch, Commit, Article, ArticleSnapshot };
}

Deno.test("gitless: branch switching and commit capture", async () => {
    const { API, CurrentBranch, Branch, Article, ArticleSnapshot } = setup();

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
