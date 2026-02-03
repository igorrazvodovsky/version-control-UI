import type { APIConcept } from "../../concepts/API.ts";
import type { CurrentBranchConcept } from "../../concepts/CurrentBranch.ts";
import type { BranchConcept } from "../../concepts/Branch.ts";
import type { CommitConcept } from "../../concepts/Commit.ts";
import type { ArticleConcept } from "../../concepts/Article.ts";
import type { ArticleSnapshotConcept } from "../../concepts/ArticleSnapshot.ts";
import type { TagConcept } from "../../concepts/Tag.ts";
import type { TagSnapshotConcept } from "../../concepts/TagSnapshot.ts";
import { makeVersionControlArticleSyncs } from "./articles.ts";

export function makeVersionControlSyncs(
    API: APIConcept,
    CurrentBranch: CurrentBranchConcept,
    Branch: BranchConcept,
    Commit: CommitConcept,
    Article: ArticleConcept,
    ArticleSnapshot: ArticleSnapshotConcept,
    Tag: TagConcept,
    TagSnapshot: TagSnapshotConcept,
) {
    return {
        ...makeVersionControlArticleSyncs(
            API,
            CurrentBranch,
            Branch,
            Commit,
            Article,
            ArticleSnapshot,
            Tag,
            TagSnapshot,
        ),
    } as const;
}
