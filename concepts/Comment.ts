export class CommentConcept {
    private comments = new Map<
        string,
        { target: string; author: string; body: string; createdAt: string; updatedAt: string }
    >();

    create({
        comment,
        target,
        author,
        body,
    }: {
        comment: string;
        target: string;
        author: string;
        body: string;
    }) {
        if (this.comments.has(comment)) {
            return { error: "comment already exists" };
        }
        if (!body.trim()) {
            return { error: "body required" };
        }
        const now = new Date().toISOString();
        this.comments.set(comment, {
            target,
            author,
            body,
            createdAt: now,
            updatedAt: now,
        });
        return { comment };
    }

    update({ comment, body }: { comment: string; body: string }) {
        const existing = this.comments.get(comment);
        if (!existing) {
            return { error: "comment not found" };
        }
        existing.body = body;
        existing.updatedAt = new Date().toISOString();
        return { comment };
    }

    delete({ comment }: { comment: string }) {
        if (!this.comments.has(comment)) {
            return { error: "comment not found" };
        }
        this.comments.delete(comment);
        return { comment };
    }

    _get({ comment }: { comment: string }): {
        comment: string;
        target: string;
        author: string;
        body: string;
        createdAt: string;
        updatedAt: string;
    }[] {
        const existing = this.comments.get(comment);
        if (!existing) return [];
        return [{
            comment,
            target: existing.target,
            author: existing.author,
            body: existing.body,
            createdAt: existing.createdAt,
            updatedAt: existing.updatedAt,
        }];
    }

    _getByTarget({ target }: { target: string }): { comment: string }[] {
        const results: { comment: string }[] = [];
        for (const [comment, data] of this.comments.entries()) {
            if (data.target === target) {
                results.push({ comment });
            }
        }
        return results;
    }

    _getByAuthor({ author }: { author: string }): { comment: string }[] {
        const results: { comment: string }[] = [];
        for (const [comment, data] of this.comments.entries()) {
            if (data.author === author) {
                results.push({ comment });
            }
        }
        return results;
    }
}
