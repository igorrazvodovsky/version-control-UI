export class BranchConcept {
    private branches = new Map<
        string,
        {
            name: string;
            label: string;
            head?: string;
            baseVersion?: number;
            status: "MAIN" | "IN_PROGRESS" | "COMMITTED";
            createdAt: string;
        }
    >();
    private byName = new Map<string, string>();

    create(
        { branch, name, label, baseVersion }: {
            branch: string;
            name: string;
            label: string;
            baseVersion?: number;
        },
    ) {
        const trimmedName = name.trim();
        if (!trimmedName) {
            return { error: "name required" };
        }
        const trimmedLabel = label.trim();
        if (!trimmedLabel) {
            return { error: "label required" };
        }
        if (baseVersion !== undefined && Number.isNaN(baseVersion)) {
            return { error: "baseVersion must be a number" };
        }
        if (this.branches.has(branch)) {
            return { error: "branch already exists" };
        }
        if (this.byName.has(trimmedName)) {
            return { error: "name not unique" };
        }
        const now = new Date().toISOString();
        const status = trimmedName === "main" ? "MAIN" : "IN_PROGRESS";
        this.branches.set(branch, {
            name: trimmedName,
            label: trimmedLabel,
            createdAt: now,
            status,
            baseVersion,
        });
        this.byName.set(trimmedName, branch);
        return { branch };
    }

    setLabel({ branch, label }: { branch: string; label: string }) {
        const existing = this.branches.get(branch);
        if (!existing) {
            return { error: "branch not found" };
        }
        const trimmedLabel = label.trim();
        if (!trimmedLabel) {
            return { error: "label required" };
        }
        existing.label = trimmedLabel;
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

    setStatus({
        branch,
        status,
    }: {
        branch: string;
        status: "MAIN" | "IN_PROGRESS" | "COMMITTED";
    }) {
        const existing = this.branches.get(branch);
        if (!existing) {
            return { error: "branch not found" };
        }
        existing.status = status;
        return { branch };
    }

    _get({ branch }: { branch: string }): {
        branch: string;
        name: string;
        label: string;
        head: string | undefined;
        baseVersion: number | undefined;
        status: string;
    }[] {
        const existing = this.branches.get(branch);
        if (!existing) return [];
        return [{
            branch,
            name: existing.name,
            label: existing.label,
            head: existing.head,
            baseVersion: existing.baseVersion,
            status: existing.status,
        }];
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
