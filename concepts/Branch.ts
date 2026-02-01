export class BranchConcept {
    private branches = new Map<
        string,
        {
            name: string;
            head?: string;
            createdAt: string;
        }
    >();
    private byName = new Map<string, string>();

    create({ branch, name }: { branch: string; name: string }) {
        const trimmedName = name.trim();
        if (!trimmedName) {
            return { error: "name required" };
        }
        if (this.branches.has(branch)) {
            return { error: "branch already exists" };
        }
        if (this.byName.has(trimmedName)) {
            return { error: "name not unique" };
        }
        const now = new Date().toISOString();
        this.branches.set(branch, { name: trimmedName, createdAt: now });
        this.byName.set(trimmedName, branch);
        return { branch };
    }

    setHead({ branch, commit }: { branch: string; commit: string }) {
        const existing = this.branches.get(branch);
        if (!existing) {
            return { error: "branch not found" };
        }
        existing.head = commit;
        return { branch };
    }

    _get({ branch }: { branch: string }): {
        branch: string;
        name: string;
        head: string | undefined;
    }[] {
        const existing = this.branches.get(branch);
        if (!existing) return [];
        return [{ branch, name: existing.name, head: existing.head }];
    }

    _getByName({ name }: { name: string }): { branch: string }[] {
        const branch = this.byName.get(name.trim());
        return branch ? [{ branch }] : [];
    }

    _list(_: Record<PropertyKey, never>): { branch: string }[] {
        return Array.from(this.branches.keys()).map((branch) => ({ branch }));
    }

    _getHead({ branch }: { branch: string }): { commit: string }[] {
        const existing = this.branches.get(branch);
        if (!existing || !existing.head) return [];
        return [{ commit: existing.head }];
    }
}
