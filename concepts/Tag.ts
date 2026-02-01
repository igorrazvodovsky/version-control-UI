export class TagConcept {
    private tagsByTarget = new Map<string, Set<string>>();

    add({ target, tag }: { target: string; tag: string }) {
        const existing = this.tagsByTarget.get(target) ?? new Set<string>();
        if (existing.has(tag)) {
            return { error: "tag already associated" };
        }
        existing.add(tag);
        this.tagsByTarget.set(target, existing);
        return { target };
    }

    remove({ target, tag }: { target: string; tag: string }) {
        const existing = this.tagsByTarget.get(target);
        if (!existing || !existing.has(tag)) {
            return { error: "tag not associated" };
        }
        existing.delete(tag);
        if (existing.size === 0) {
            this.tagsByTarget.delete(target);
        }
        return { target };
    }

    _getByTarget({ target }: { target: string }): { tag: string }[] {
        const tags = this.tagsByTarget.get(target);
        if (!tags) return [];
        return Array.from(tags).map((tag) => ({ tag }));
    }

    _getByTag({ tag }: { tag: string }): { target: string }[] {
        const results: { target: string }[] = [];
        for (const [target, tags] of this.tagsByTarget.entries()) {
            if (tags.has(tag)) {
                results.push({ target });
            }
        }
        return results;
    }

    _getAll(_: Record<PropertyKey, never>): { tag: string }[] {
        const all = new Set<string>();
        for (const tags of this.tagsByTarget.values()) {
            for (const tag of tags) {
                all.add(tag);
            }
        }
        return Array.from(all).map((tag) => ({ tag }));
    }
}
