import { Logging, SyncConcept } from "./engine/mod.ts";
import { APIConcept } from "./concepts/API.ts";
import { ArticleConcept } from "./concepts/Article.ts";
import { ArticleSnapshotConcept } from "./concepts/ArticleSnapshot.ts";
import { BranchConcept } from "./concepts/Branch.ts";
import { CommentConcept } from "./concepts/Comment.ts";
import { CommitConcept } from "./concepts/Commit.ts";
import { CurrentBranchConcept } from "./concepts/CurrentBranch.ts";
import { FavoriteConcept } from "./concepts/Favorite.ts";
import { ProfileConcept } from "./concepts/Profile.ts";
import { TagConcept } from "./concepts/Tag.ts";
import { TagSnapshotConcept } from "./concepts/TagSnapshot.ts";
import { UserConcept } from "./concepts/User.ts";
import { makeVersionControlSyncs } from "./syncs/version_control/index.ts";
import { makeAppSyncs } from "./syncs/app/index.ts";

export async function createApp() {
    const sync = new SyncConcept();
    sync.logging = Logging.OFF;
    const concepts = {
        API: new APIConcept(),
        CurrentBranch: new CurrentBranchConcept(),
        Branch: new BranchConcept(),
        Commit: new CommitConcept(),
        Article: new ArticleConcept(),
        ArticleSnapshot: new ArticleSnapshotConcept(),
        TagSnapshot: new TagSnapshotConcept(),
        Comment: new CommentConcept(),
        Tag: new TagConcept(),
        Favorite: new FavoriteConcept(),
        User: new UserConcept(),
        Profile: new ProfileConcept(),
    };
    const {
        API,
        CurrentBranch,
        Branch,
        Commit,
        Article,
        ArticleSnapshot,
        TagSnapshot,
        Comment,
        Tag,
        Favorite,
        User,
        Profile,
    } = sync.instrument(concepts);

    sync.register({
        ...makeVersionControlSyncs(
            API,
            CurrentBranch,
            Branch,
            Commit,
            Article,
            ArticleSnapshot,
            Tag,
            TagSnapshot,
        ),
        ...makeAppSyncs(
            API,
            CurrentBranch,
            User,
            Profile,
            Article,
            Comment,
            Tag,
            Favorite,
        ),
    });

    await API.request({
        request: "version-control:init",
        method: "POST",
        path: "/version-control/init",
        input: {},
    });

    return {
        sync,
        API,
        CurrentBranch,
        Branch,
        Commit,
        Article,
        ArticleSnapshot,
        TagSnapshot,
        Comment,
        Tag,
        Favorite,
        User,
        Profile,
    };
}
