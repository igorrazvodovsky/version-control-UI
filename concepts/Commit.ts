export class CommitConcept {
    private commits = new Map<
        string,
        {
            branch: string;
            parents: string[];
            message: string;
            createdAt: string;
        }
    >();

    create({
        commit,
        branch,
        message,
        parents,
    }: {
        commit: string;
        branch: string;
        message: string;
        parents: string[];
    }) {
        if (this.commits.has(commit)) {
            return { error: "commit already exists" };
        }
        const now = new Date().toISOString();
        this.commits.set(commit, {
            branch,
            parents: [...parents],
            message,
            createdAt: now,
        });
        return { commit };
    }

    _get({ commit }: { commit: string }): {
        commit: string;
        branch: string;
        parents: string[];
        message: string;
        createdAt: string;
    }[] {
        const existing = this.commits.get(commit);
        if (!existing) return [];
        return [{
            commit,
            branch: existing.branch,
            parents: [...existing.parents],
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
