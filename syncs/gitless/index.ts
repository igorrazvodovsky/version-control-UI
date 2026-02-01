import type { APIConcept } from "../../concepts/API.ts";
import type { CurrentBranchConcept } from "../../concepts/CurrentBranch.ts";
import type { BranchConcept } from "../../concepts/Branch.ts";
import type { CommitConcept } from "../../concepts/Commit.ts";
import type { ArticleConcept } from "../../concepts/Article.ts";
import type { ArticleSnapshotConcept } from "../../concepts/ArticleSnapshot.ts";
import { makeGitlessArticleSyncs } from "./articles.ts";

export function makeGitlessSyncs(
    API: APIConcept,
    CurrentBranch: CurrentBranchConcept,
    Branch: BranchConcept,
    Commit: CommitConcept,
    Article: ArticleConcept,
    ArticleSnapshot: ArticleSnapshotConcept,
) {
    return {
        ...makeGitlessArticleSyncs(
            API,
            CurrentBranch,
            Branch,
            Commit,
            Article,
            ArticleSnapshot,
        ),
    } as const;
}
