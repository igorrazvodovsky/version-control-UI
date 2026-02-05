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
import type { PersistedAppState } from "./persistence/app_state.ts";
import { loadAppStateFromKv, saveAppStateToKv } from "./persistence/app_state_kv.ts";

type CreateAppOptions = {
    kv?: Deno.Kv;
};

function applyAppState(
    concepts: Record<string, unknown>,
    state: PersistedAppState,
) {
    const {
        Article,
        ArticleSnapshot,
        TagSnapshot,
        Branch,
        Commit,
        CurrentBranch,
        Comment,
        Tag,
        Favorite,
        User,
        Profile,
    } = state.concepts;

    const articleConcept = concepts.Article as any;
    articleConcept.articles = new Map(Article.articles);
    const bySlug = new Map<string, Map<string, string>>();
    for (const [articleId, row] of articleConcept.articles.entries()) {
        if (!row || typeof row !== "object") continue;
        const branch = typeof row.branch === "string" ? row.branch : "";
        const slug = typeof row.slug === "string" ? row.slug : "";
        const deleted = "deleted" in row ? Boolean(row.deleted) : false;
        if (deleted || !branch || !slug) continue;
        let branchMap = bySlug.get(branch);
        if (!branchMap) {
            branchMap = new Map();
            bySlug.set(branch, branchMap);
        }
        branchMap.set(slug, articleId);
    }
    articleConcept.bySlug = bySlug;

    const articleSnapshotConcept = concepts.ArticleSnapshot as any;
    articleSnapshotConcept.snapshots = new Map(ArticleSnapshot.snapshots);

    const tagSnapshotConcept = concepts.TagSnapshot as any;
    tagSnapshotConcept.snapshots = new Map(TagSnapshot.snapshots);

    const branchConcept = concepts.Branch as any;
    branchConcept.branches = new Map(Branch.branches);
    const byName = new Map<string, string>();
    for (const [branchId, row] of branchConcept.branches.entries()) {
        if (!row || typeof row !== "object") continue;
        const name = typeof row.name === "string" ? row.name : "";
        if (!name) continue;
        byName.set(name, branchId);
    }
    branchConcept.byName = byName;

    const commitConcept = concepts.Commit as any;
    commitConcept.commits = new Map(Commit.commits);

    const currentBranchConcept = concepts.CurrentBranch as any;
    currentBranchConcept.current = new Map(CurrentBranch.current);

    const commentConcept = concepts.Comment as any;
    commentConcept.comments = new Map(Comment.comments);

    const tagConcept = concepts.Tag as any;
    tagConcept.tagsByTarget = new Map(
        Tag.tagsByTarget.map(([target, tags]) => [target, new Set(tags)]),
    );

    const favoriteConcept = concepts.Favorite as any;
    favoriteConcept.favoritesByUser = new Map(
        Favorite.favoritesByUser.map(([user, targets]) => [user, new Set(targets)]),
    );

    const userConcept = concepts.User as any;
    userConcept.users = new Map(User.users);
    const byUserName = new Map<string, string>();
    const byEmail = new Map<string, string>();
    for (const [userId, row] of userConcept.users.entries()) {
        if (!row || typeof row !== "object") continue;
        const name = typeof row.name === "string" ? row.name : "";
        const email = typeof row.email === "string" ? row.email : "";
        if (name) byUserName.set(name, userId);
        if (email) byEmail.set(email, userId);
    }
    userConcept.byName = byUserName;
    userConcept.byEmail = byEmail;

    const profileConcept = concepts.Profile as any;
    profileConcept.profiles = new Map(Profile.profiles);
    const byUser = new Map<string, Set<string>>();
    for (const [profileId, row] of profileConcept.profiles.entries()) {
        if (!row || typeof row !== "object") continue;
        const user = typeof row.user === "string" ? row.user : "";
        if (!user) continue;
        const existing = byUser.get(user) ?? new Set<string>();
        existing.add(profileId);
        byUser.set(user, existing);
    }
    profileConcept.byUser = byUser;
}

export async function createApp(options: CreateAppOptions = {}) {
    const sync = new SyncConcept();
    sync.logging = Logging.OFF;

    let state: PersistedAppState | null = null;
    if (options.kv) {
        try {
            state = await loadAppStateFromKv(options.kv);
        } catch (error) {
            console.warn(
                "Failed to load app state from Deno KV; starting fresh.",
                error,
            );
        }
    }

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

    if (state) {
        applyAppState(concepts, state);
    }

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

    const persistable = {
        Article,
        ArticleSnapshot,
        TagSnapshot,
        Branch,
        Commit,
        CurrentBranch,
        Comment,
        Tag,
        Favorite,
        User,
        Profile,
    };

    if (options.kv) {
        try {
            await saveAppStateToKv(options.kv, persistable);
        } catch (error) {
            console.warn(
                "Failed to persist app state to Deno KV.",
                error,
            );
        }
    }

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
