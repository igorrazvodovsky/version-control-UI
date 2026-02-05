type MapEntries<V> = Array<[string, V]>;

export type PersistedAppStateV1 = {
    version: 1;
    savedAt: string;
    concepts: {
        Article: { articles: MapEntries<unknown> };
        ArticleSnapshot: { snapshots: MapEntries<unknown> };
        TagSnapshot: { snapshots: MapEntries<unknown> };
        Branch: { branches: MapEntries<unknown> };
        Commit: { commits: MapEntries<unknown> };
        CurrentBranch: { current: MapEntries<{ branch: string }> };
        Comment: { comments: MapEntries<unknown> };
        Tag: { tagsByTarget: Array<[string, string[]]> };
        Favorite: { favoritesByUser: Array<[string, string[]]> };
        User: { users: MapEntries<unknown> };
        Profile: { profiles: MapEntries<unknown> };
    };
};

export type PersistedAppState = PersistedAppStateV1;

export type PersistableApp = {
    Article: unknown;
    ArticleSnapshot: unknown;
    TagSnapshot: unknown;
    Branch: unknown;
    Commit: unknown;
    CurrentBranch: unknown;
    Comment: unknown;
    Tag: unknown;
    Favorite: unknown;
    User: unknown;
    Profile: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isPersistedAppStateV1(value: unknown): value is PersistedAppStateV1 {
    if (!isRecord(value)) return false;
    if (value.version !== 1) return false;
    if (typeof value.savedAt !== "string") return false;
    if (!isRecord(value.concepts)) return false;
    return true;
}

function mapEntries(value: unknown): MapEntries<unknown> {
    return value instanceof Map ? Array.from(value.entries()) : [];
}

function mapSetEntries(value: unknown): Array<[string, string[]]> {
    if (!(value instanceof Map)) return [];
    const entries: Array<[string, string[]]> = [];
    for (const [key, setValue] of value.entries()) {
        if (typeof key !== "string") continue;
        if (!(setValue instanceof Set)) continue;
        const values = Array.from(setValue).filter((item): item is string =>
            typeof item === "string"
        );
        entries.push([key, values]);
    }
    return entries;
}

function ensureConceptMapEntries(value: unknown): MapEntries<unknown> {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is [string, unknown] =>
        Array.isArray(entry) && entry.length === 2 && typeof entry[0] === "string"
    );
}

function ensureConceptSetMapEntries(value: unknown): Array<[string, string[]]> {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is [string, string[]] =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === "string" &&
        Array.isArray(entry[1]) &&
        entry[1].every((item) => typeof item === "string")
    );
}

function normalizeLoadedState(raw: PersistedAppStateV1): PersistedAppStateV1 {
    const concepts = raw.concepts;
    if (!isRecord(concepts)) {
        throw new Error("Invalid app state: concepts missing");
    }

    const conceptsRecord = concepts as unknown as Record<string, unknown>;
    const getConcept = (key: string): Record<string, unknown> => {
        const value = conceptsRecord[key];
        return isRecord(value) ? value : {};
    };

    return {
        version: 1,
        savedAt: raw.savedAt,
        concepts: {
            Article: {
                articles: ensureConceptMapEntries(getConcept("Article").articles),
            },
            ArticleSnapshot: {
                snapshots: ensureConceptMapEntries(
                    getConcept("ArticleSnapshot").snapshots,
                ),
            },
            TagSnapshot: {
                snapshots: ensureConceptMapEntries(getConcept("TagSnapshot").snapshots),
            },
            Branch: {
                branches: ensureConceptMapEntries(getConcept("Branch").branches),
            },
            Commit: {
                commits: ensureConceptMapEntries(getConcept("Commit").commits),
            },
            CurrentBranch: {
                current: ensureConceptMapEntries(getConcept("CurrentBranch").current)
                    .filter((
                        entry,
                    ): entry is [string, { branch: string }] =>
                        typeof entry[1] === "object" &&
                        entry[1] !== null &&
                        "branch" in entry[1] &&
                        typeof (entry[1] as { branch?: unknown }).branch === "string"
                    ),
            },
            Comment: {
                comments: ensureConceptMapEntries(getConcept("Comment").comments),
            },
            Tag: {
                tagsByTarget: ensureConceptSetMapEntries(getConcept("Tag").tagsByTarget),
            },
            Favorite: {
                favoritesByUser: ensureConceptSetMapEntries(
                    getConcept("Favorite").favoritesByUser,
                ),
            },
            User: {
                users: ensureConceptMapEntries(getConcept("User").users),
            },
            Profile: {
                profiles: ensureConceptMapEntries(getConcept("Profile").profiles),
            },
        },
    };
}

export function parsePersistedAppState(value: unknown): PersistedAppState {
    if (!isPersistedAppStateV1(value)) {
        throw new Error("Unsupported app state format");
    }
    return normalizeLoadedState(value);
}

export function snapshotAppState(app: PersistableApp): PersistedAppStateV1 {
    const Article = app.Article as any;
    const ArticleSnapshot = app.ArticleSnapshot as any;
    const TagSnapshot = app.TagSnapshot as any;
    const Branch = app.Branch as any;
    const Commit = app.Commit as any;
    const CurrentBranch = app.CurrentBranch as any;
    const Comment = app.Comment as any;
    const Tag = app.Tag as any;
    const Favorite = app.Favorite as any;
    const User = app.User as any;
    const Profile = app.Profile as any;

    return {
        version: 1,
        savedAt: new Date().toISOString(),
        concepts: {
            Article: { articles: mapEntries(Article.articles) },
            ArticleSnapshot: { snapshots: mapEntries(ArticleSnapshot.snapshots) },
            TagSnapshot: { snapshots: mapEntries(TagSnapshot.snapshots) },
            Branch: { branches: mapEntries(Branch.branches) },
            Commit: { commits: mapEntries(Commit.commits) },
            CurrentBranch: { current: mapEntries(CurrentBranch.current) as MapEntries<{ branch: string }> },
            Comment: { comments: mapEntries(Comment.comments) },
            Tag: { tagsByTarget: mapSetEntries(Tag.tagsByTarget) },
            Favorite: { favoritesByUser: mapSetEntries(Favorite.favoritesByUser) },
            User: { users: mapEntries(User.users) },
            Profile: { profiles: mapEntries(Profile.profiles) },
        },
    };
}
