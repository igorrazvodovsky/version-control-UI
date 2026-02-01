export class CurrentBranchConcept {
    private current = new Map<string, { branch: string }>();

    set({ current, branch }: { current: string; branch: string }) {
        this.current.set(current, { branch });
        return { current };
    }

    _get({ current }: { current: string }): { current: string; branch: string }[] {
        const existing = this.current.get(current);
        if (!existing) return [];
        return [{ current, branch: existing.branch }];
    }
}
