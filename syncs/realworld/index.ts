import type { APIConcept } from "../../concepts/API.ts";
import type { ArticleConcept } from "../../concepts/Article.ts";
import type { CommentConcept } from "../../concepts/Comment.ts";
import type { CurrentBranchConcept } from "../../concepts/CurrentBranch.ts";
import type { FavoriteConcept } from "../../concepts/Favorite.ts";
import type { ProfileConcept } from "../../concepts/Profile.ts";
import type { TagConcept } from "../../concepts/Tag.ts";
import type { UserConcept } from "../../concepts/User.ts";
import { makeArticleSyncs } from "./articles.ts";
import { makeCascadeSyncs } from "./cascades.ts";
import { makeCommentSyncs } from "./comments.ts";
import { makeFavoriteTagSyncs } from "./favorites_tags.ts";
import { makeUserProfileSyncs } from "./user_profile.ts";

export function makeRealWorldSyncs(
    API: APIConcept,
    CurrentBranch: CurrentBranchConcept,
    User: UserConcept,
    Profile: ProfileConcept,
    Article: ArticleConcept,
    Comment: CommentConcept,
    Tag: TagConcept,
    Favorite: FavoriteConcept,
) {
    return {
        ...makeUserProfileSyncs(API, User, Profile),
        ...makeArticleSyncs(
            API,
            CurrentBranch,
            User,
            Profile,
            Article,
            Tag,
            Favorite,
        ),
        ...makeCommentSyncs(
            API,
            CurrentBranch,
            User,
            Profile,
            Article,
            Comment,
        ),
        ...makeFavoriteTagSyncs(
            API,
            CurrentBranch,
            User,
            Article,
            Favorite,
            Tag,
        ),
        ...makeCascadeSyncs(Article, Comment, Tag, Favorite),
    } as const;
}
