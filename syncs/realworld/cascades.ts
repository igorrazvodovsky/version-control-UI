import { actions, Frames, Vars } from "../../engine/mod.ts";
import type { ArticleConcept } from "../../concepts/Article.ts";
import type { CommentConcept } from "../../concepts/Comment.ts";
import type { TagConcept } from "../../concepts/Tag.ts";
import type { FavoriteConcept } from "../../concepts/Favorite.ts";

export function makeCascadeSyncs(
    Article: ArticleConcept,
    Comment: CommentConcept,
    Tag: TagConcept,
    Favorite: FavoriteConcept,
) {
    const CascadeDeleteComments = ({ article, comment }: Vars) => ({
        when: actions([Article.delete, {}, { article }]),
        where: (frames: Frames) =>
            frames.query(Comment._getByTarget, { target: article }, { comment }),
        then: actions([Comment.delete, { comment }]),
    });

    const CascadeDeleteTags = ({ article, tag }: Vars) => ({
        when: actions([Article.delete, {}, { article }]),
        where: (frames: Frames) =>
            frames.query(Tag._getByTarget, { target: article }, { tag }),
        then: actions([Tag.remove, { target: article, tag }]),
    });

    const CascadeDeleteFavorites = ({ article, user }: Vars) => ({
        when: actions([Article.delete, {}, { article }]),
        where: (frames: Frames) =>
            frames.query(Favorite._getByTarget, { target: article }, { user }),
        then: actions([Favorite.unfavorite, { user, target: article }]),
    });

    return {
        CascadeDeleteComments,
        CascadeDeleteTags,
        CascadeDeleteFavorites,
    } as const;
}
