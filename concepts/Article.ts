export class ArticleConcept {
    private articles = new Map<
        string,
        {
            slug: string;
            title: string;
            description: string;
            body: string;
            author: string;
            createdAt: string;
            updatedAt: string;
        }
    >();
    private bySlug = new Map<string, string>();

    create({
        article,
        slug,
        title,
        description,
        body,
        author,
    }: {
        article: string;
        slug: string;
        title: string;
        description: string;
        body: string;
        author: string;
    }) {
        const trimmedSlug = slug.trim();
        if (!trimmedSlug) {
            return { error: "slug required" };
        }
        if (!title.trim() || !description.trim() || !body.trim()) {
            return { error: "fields invalid" };
        }
        if (this.articles.has(article)) {
            return { error: "article already exists" };
        }
        if (this.bySlug.has(trimmedSlug)) {
            return { error: "slug not unique" };
        }
        const now = new Date().toISOString();
        this.articles.set(article, {
            slug: trimmedSlug,
            title,
            description,
            body,
            author,
            createdAt: now,
            updatedAt: now,
        });
        this.bySlug.set(trimmedSlug, article);
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
        existing.title = title;
        existing.description = description;
        existing.body = body;
        existing.updatedAt = new Date().toISOString();
        return { article };
    }

    delete({ article }: { article: string }) {
        const existing = this.articles.get(article);
        if (!existing) {
            return { error: "article not found" };
        }
        this.articles.delete(article);
        this.bySlug.delete(existing.slug);
        return { article };
    }

    _get({ article }: { article: string }): {
        article: string;
        slug: string;
        title: string;
        description: string;
        body: string;
        author: string;
        createdAt: string;
        updatedAt: string;
    }[] {
        const existing = this.articles.get(article);
        if (!existing) return [];
        return [{
            article,
            slug: existing.slug,
            title: existing.title,
            description: existing.description,
            body: existing.body,
            author: existing.author,
            createdAt: existing.createdAt,
            updatedAt: existing.updatedAt,
        }];
    }

    _getBySlug({ slug }: { slug: string }): { article: string }[] {
        const article = this.bySlug.get(slug.trim());
        return article ? [{ article }] : [];
    }

    _getByAuthor({ author }: { author: string }): { article: string }[] {
        const results: { article: string }[] = [];
        for (const [article, data] of this.articles.entries()) {
            if (data.author === author) {
                results.push({ article });
            }
        }
        return results;
    }

    _list(_: Record<PropertyKey, never>): { article: string }[] {
        return Array.from(this.articles.keys()).map((article) => ({ article }));
    }
}
