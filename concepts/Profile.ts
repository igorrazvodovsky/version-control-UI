export class ProfileConcept {
    private profiles = new Map<string, { user: string; bio: string; image: string }>();
    private byUser = new Map<string, Set<string>>();

    register({ profile, user }: { profile: string; user: string }) {
        if (!this.profiles.has(profile)) {
            this.profiles.set(profile, { user, bio: "", image: "" });
            const existing = this.byUser.get(user) ?? new Set<string>();
            existing.add(profile);
            this.byUser.set(user, existing);
        }
        return { profile };
    }

    update(input: { profile: string; bio: string } | { profile: string; image: string }) {
        const existing = this.profiles.get(input.profile);
        if (!existing) {
            if ("image" in input) {
                return { error: "profile not found" };
            }
            return { profile: input.profile };
        }
        if ("bio" in input) {
            existing.bio = input.bio;
            return { profile: input.profile };
        }
        if (!this.isValidImage(input.image)) {
            return { error: "image invalid" };
        }
        existing.image = input.image;
        return { profile: input.profile };
    }

    _get({ profile }: { profile: string }): { profile: string; user: string; bio: string; image: string }[] {
        const existing = this.profiles.get(profile);
        if (!existing) return [];
        return [{ profile, user: existing.user, bio: existing.bio, image: existing.image }];
    }

    _getByUser({ user }: { user: string }): { profile: string }[] {
        const profiles = this.byUser.get(user);
        if (!profiles) return [];
        return Array.from(profiles).map((profile) => ({ profile }));
    }

    private isValidImage(image: string) {
        return image.trim().length > 0;
    }
}
