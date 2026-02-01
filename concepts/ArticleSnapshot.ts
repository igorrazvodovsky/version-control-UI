export class ArticleSnapshotConcept {
    private snapshots = new Map<
        string,
        {
            commit: string;
            article: string;
            slug: string;
            title: string;
            description: string;
            body: string;
            author: string;
            deleted: boolean;
        }
    >();

    capture({
        snapshot,
        commit,
        article,
        slug,
        title,
        description,
        body,
        author,
        deleted,
    }: {
        snapshot: string;
        commit: string;
        article: string;
        slug: string;
        title: string;
        description: string;
        body: string;
        author: string;
        deleted: boolean;
    }) {
        this.snapshots.set(snapshot, {
            commit,
            article,
            slug,
            title,
            description,
            body,
            author,
            deleted,
        });
        return { snapshot };
    }

    _listByCommit({ commit }: { commit: string }): { snapshot: string }[] {
        const results: { snapshot: string }[] = [];
        for (const [snapshot, data] of this.snapshots.entries()) {
            if (data.commit === commit) {
                results.push({ snapshot });
            }
        }
        return results;
    }

    _get({ snapshot }: { snapshot: string }): {
        snapshot: string;
        commit: string;
        article: string;
        slug: string;
        title: string;
        description: string;
        body: string;
        author: string;
        deleted: boolean;
    }[] {
        const existing = this.snapshots.get(snapshot);
        if (!existing) return [];
        return [{
            snapshot,
            commit: existing.commit,
            article: existing.article,
            slug: existing.slug,
            title: existing.title,
            description: existing.description,
            body: existing.body,
            author: existing.author,
            deleted: existing.deleted,
        }];
    }
}
