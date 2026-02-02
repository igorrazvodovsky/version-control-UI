export class TagSnapshotConcept {
    private snapshots = new Map<
        string,
        {
            commit: string;
            article: string;
            tag: string;
        }
    >();

    capture({
        snapshot,
        commit,
        article,
        tag,
    }: {
        snapshot: string;
        commit: string;
        article: string;
        tag: string;
    }) {
        this.snapshots.set(snapshot, { commit, article, tag });
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
        tag: string;
    }[] {
        const existing = this.snapshots.get(snapshot);
        if (!existing) return [];
        return [{
            snapshot,
            commit: existing.commit,
            article: existing.article,
            tag: existing.tag,
        }];
    }
}
