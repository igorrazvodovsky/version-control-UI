export class CommitConcept {
    private commits = new Map<
        string,
        {
            branch: string;
            parent?: string;
            message: string;
            createdAt: string;
        }
    >();

    create({
        commit,
        branch,
        message,
        parent,
    }: {
        commit: string;
        branch: string;
        message: string;
        parent?: string;
    }) {
        if (this.commits.has(commit)) {
            return { error: "commit already exists" };
        }
        const now = new Date().toISOString();
        this.commits.set(commit, {
            branch,
            parent,
            message,
            createdAt: now,
        });
        return { commit };
    }

    _get({ commit }: { commit: string }): {
        commit: string;
        branch: string;
        parent: string | undefined;
        message: string;
        createdAt: string;
    }[] {
        const existing = this.commits.get(commit);
        if (!existing) return [];
        return [{
            commit,
            branch: existing.branch,
            parent: existing.parent,
            message: existing.message,
            createdAt: existing.createdAt,
        }];
    }

    _listByBranch({ branch }: { branch: string }): { commit: string }[] {
        const results: { commit: string }[] = [];
        for (const [commit, data] of this.commits.entries()) {
            if (data.branch === branch) {
                results.push({ commit });
            }
        }
        return results;
    }
}
