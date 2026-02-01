export class UserConcept {
    private users = new Map<string, { name: string; email: string }>();
    private byName = new Map<string, string>();
    private byEmail = new Map<string, string>();

    register({ user, name, email }: { user: string; name: string; email: string }) {
        const trimmedName = name.trim();
        const trimmedEmail = email.trim();
        if (!trimmedName) {
            return { error: "name required" };
        }
        if (!this.isValidEmail(trimmedEmail)) {
            return { error: "email invalid" };
        }
        if (this.users.has(user)) {
            return { error: "user already exists" };
        }
        if (this.byName.has(trimmedName)) {
            return { error: "name not unique" };
        }
        if (this.byEmail.has(trimmedEmail)) {
            return { error: "email not unique" };
        }
        this.users.set(user, { name: trimmedName, email: trimmedEmail });
        this.byName.set(trimmedName, user);
        this.byEmail.set(trimmedEmail, user);
        return { user };
    }

    update(input: { user: string; name: string } | { user: string; email: string }) {
        const existing = this.users.get(input.user);
        if (!existing) {
            return { error: "user not found" };
        }
        if ("name" in input) {
            const nextName = input.name.trim();
            if (!nextName) {
                return { error: "name required" };
            }
            const owner = this.byName.get(nextName);
            if (owner && owner !== input.user) {
                return { error: "name not unique" };
            }
            if (existing.name !== nextName) {
                this.byName.delete(existing.name);
                this.byName.set(nextName, input.user);
                existing.name = nextName;
            }
            return { user: input.user };
        }
        const nextEmail = input.email.trim();
        if (!this.isValidEmail(nextEmail)) {
            return { error: "email invalid" };
        }
        const owner = this.byEmail.get(nextEmail);
        if (owner && owner !== input.user) {
            return { error: "email not unique" };
        }
        if (existing.email !== nextEmail) {
            this.byEmail.delete(existing.email);
            this.byEmail.set(nextEmail, input.user);
            existing.email = nextEmail;
        }
        return { user: input.user };
    }

    _get({ user }: { user: string }): { user: string; name: string; email: string }[] {
        const existing = this.users.get(user);
        if (!existing) return [];
        return [{ user, name: existing.name, email: existing.email }];
    }

    _getByName({ name }: { name: string }): { user: string }[] {
        const user = this.byName.get(name.trim());
        return user ? [{ user }] : [];
    }

    _getByEmail({ email }: { email: string }): { user: string }[] {
        const user = this.byEmail.get(email.trim());
        return user ? [{ user }] : [];
    }

    private isValidEmail(email: string) {
        return email.includes("@") && !email.startsWith("@") && !email.endsWith("@");
    }
}
