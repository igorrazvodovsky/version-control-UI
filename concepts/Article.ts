export class ArticleConcept {
    private articles = new Map<
        string,
        {
            branch: string;
            slug: string;
            title: string;
            description: string;
            body: string;
            author: string;
            status: "TRACKED" | "UNTRACKED" | "IGNORED" | "CONFLICT";
            deleted: boolean;
            createdAt: string;
            updatedAt: string;
        }
    >();
    private bySlug = new Map<string, Map<string, string>>();

    private getBranchSlugMap(branch: string) {
        let branchMap = this.bySlug.get(branch);
        if (!branchMap) {
            branchMap = new Map();
            this.bySlug.set(branch, branchMap);
        }
        return branchMap;
    }

    create({
        article,
        branch,
        slug,
        title,
        description,
        body,
        author,
    }: {
        article: string;
        branch: string;
        slug: string;
        title: string;
        description: string;
        body: string;
        author: string;
    }) {
        const trimmedSlug = slug.trim();
        const trimmedBranch = branch.trim();
        if (!trimmedBranch) {
            return { error: "branch required" };
        }
        if (!trimmedSlug) {
            return { error: "slug required" };
        }
        if (!title.trim() || !description.trim() || !body.trim()) {
            return { error: "fields invalid" };
        }
        if (this.articles.has(article)) {
            return { error: "article already exists" };
        }
        const branchSlugs = this.getBranchSlugMap(trimmedBranch);
        if (branchSlugs.has(trimmedSlug)) {
            return { error: "slug not unique" };
        }
        const now = new Date().toISOString();
        this.articles.set(article, {
            branch: trimmedBranch,
            slug: trimmedSlug,
            title,
            description,
            body,
            author,
            status: "UNTRACKED",
            deleted: false,
            createdAt: now,
            updatedAt: now,
        });
        branchSlugs.set(trimmedSlug, article);
        return { article };
    }

    clone({
        article,
        source,
        branch,
    }: {
        article: string;
        source: string;
        branch: string;
    }) {
        const sourceRow = this.articles.get(source);
        const trimmedBranch = branch.trim();
        if (!trimmedBranch) {
            return { error: "branch required" };
        }
        if (!sourceRow) {
            return { error: "source not found" };
        }
        if (this.articles.has(article)) {
            return { error: "article already exists" };
        }
        const branchSlugs = this.getBranchSlugMap(trimmedBranch);
        if (branchSlugs.has(sourceRow.slug)) {
            return { error: "slug not unique" };
        }
        this.articles.set(article, {
            branch: trimmedBranch,
            slug: sourceRow.slug,
            title: sourceRow.title,
            description: sourceRow.description,
            body: sourceRow.body,
            author: sourceRow.author,
            status: sourceRow.status,
            deleted: sourceRow.deleted,
            createdAt: sourceRow.createdAt,
            updatedAt: sourceRow.updatedAt,
        });
        branchSlugs.set(sourceRow.slug, article);
        return { article };
    }

    update({
        article,
        title,
        description,
        body,
    }: {
        article: string;
        title: string;
        description: string;
        body: string;
    }) {
        const existing = this.articles.get(article);
        if (!existing) {
            return { error: "article not found" };
        }
        if (existing.deleted) {
            return { error: "article deleted" };
        }
        existing.title = title;
        existing.description = description;
        existing.body = body;
        existing.updatedAt = new Date().toISOString();
        return { article };
    }

    remove({ article }: { article: string }) {
        const existing = this.articles.get(article);
        if (!existing) {
            return { error: "article not found" };
        }
        if (!existing.deleted) {
            existing.deleted = true;
            existing.updatedAt = new Date().toISOString();
        }
        return { article };
    }

    track({ article }: { article: string }) {
        return this.setStatus(article, "TRACKED");
    }

    untrack({ article }: { article: string }) {
        return this.setStatus(article, "UNTRACKED");
    }

    ignore({ article }: { article: string }) {
        return this.setStatus(article, "IGNORED");
    }

    markConflict({ article }: { article: string }) {
        return this.setStatus(article, "CONFLICT");
    }

    resolveConflict({ article }: { article: string }) {
        return this.setStatus(article, "TRACKED");
    }

    private setStatus(
        article: string,
        status: "TRACKED" | "UNTRACKED" | "IGNORED" | "CONFLICT",
    ) {
        const existing = this.articles.get(article);
        if (!existing) {
            return { error: "article not found" };
        }
        existing.status = status;
        existing.updatedAt = new Date().toISOString();
        return { article };
    }

    _get({ article }: { article: string }): {
        article: string;
        branch: string;
        slug: string;
        title: string;
        description: string;
        body: string;
        author: string;
        status: string;
        deleted: boolean;
        createdAt: string;
        updatedAt: string;
    }[] {
        const existing = this.articles.get(article);
        if (!existing) return [];
        return [{
            article,
            branch: existing.branch,
            slug: existing.slug,
            title: existing.title,
            description: existing.description,
            body: existing.body,
            author: existing.author,
            status: existing.status,
            deleted: existing.deleted,
            createdAt: existing.createdAt,
            updatedAt: existing.updatedAt,
        }];
    }

    _getBySlug({ branch, slug }: { branch: string; slug: string }):
        { article: string }[] {
        const branchKey = branch.trim();
        if (!branchKey) return [];
        const articleId = this.bySlug.get(branchKey)?.get(slug.trim());
        if (!articleId) return [];
        const existing = this.articles.get(articleId);
        if (!existing || existing.deleted) return [];
        return [{ article: articleId }];
    }

    _getByAuthor({ branch, author }: { branch: string; author: string }):
        { article: string }[] {
        const results: { article: string }[] = [];
        for (const [article, data] of this.articles.entries()) {
            if (
                data.branch === branch &&
                data.author === author &&
                !data.deleted
            ) {
                results.push({ article });
            }
        }
        return results;
    }

    _listByBranch({ branch }: { branch: string }): { article: string }[] {
        const results: { article: string }[] = [];
        for (const [article, data] of this.articles.entries()) {
            if (data.branch === branch) {
                results.push({ article });
            }
        }
        return results;
    }
}
