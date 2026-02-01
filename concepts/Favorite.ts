export class FavoriteConcept {
    private favoritesByUser = new Map<string, Set<string>>();

    favorite({ user, target }: { user: string; target: string }) {
        const favorites = this.favoritesByUser.get(user) ?? new Set<string>();
        if (favorites.has(target)) {
            return { error: "already favorited" };
        }
        favorites.add(target);
        this.favoritesByUser.set(user, favorites);
        return { user, target };
    }

    unfavorite({ user, target }: { user: string; target: string }) {
        const favorites = this.favoritesByUser.get(user);
        if (!favorites || !favorites.has(target)) {
            return { error: "not favorited" };
        }
        favorites.delete(target);
        if (favorites.size === 0) {
            this.favoritesByUser.delete(user);
        }
        return { user, target };
    }

    _getByUser({ user }: { user: string }): { target: string }[] {
        const favorites = this.favoritesByUser.get(user);
        if (!favorites) return [];
        return Array.from(favorites).map((target) => ({ target }));
    }

    _getByTarget({ target }: { target: string }): { user: string }[] {
        const results: { user: string }[] = [];
        for (const [user, favorites] of this.favoritesByUser.entries()) {
            if (favorites.has(target)) {
                results.push({ user });
            }
        }
        return results;
    }

    _countByTarget({ target }: { target: string }): { count: number }[] {
        let count = 0;
        for (const favorites of this.favoritesByUser.values()) {
            if (favorites.has(target)) {
                count += 1;
            }
        }
        return [{ count }];
    }

    _isFavorited({ user, target }: { user: string; target: string }): { favorited: boolean }[] {
        const favorites = this.favoritesByUser.get(user);
        return [{ favorited: favorites ? favorites.has(target) : false }];
    }
}
