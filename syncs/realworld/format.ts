import type { ArticleConcept } from "../../concepts/Article.ts";
import type { CommentConcept } from "../../concepts/Comment.ts";
import type { FavoriteConcept } from "../../concepts/Favorite.ts";
import type { ProfileConcept } from "../../concepts/Profile.ts";
import type { TagConcept } from "../../concepts/Tag.ts";
import type { UserConcept } from "../../concepts/User.ts";
import { uniqueStrings } from "./helpers.ts";

export type UserPayload = {
    user: {
        username: string;
        email: string;
        bio: string;
        image: string;
        token: null;
    };
};

export type ProfilePayload = {
    profile: {
        username: string;
        bio: string;
        image: string;
        following: boolean;
    };
};

export type ArticleView = {
    slug: string;
    title: string;
    description: string;
    body: string;
    tagList: string[];
    createdAt: string;
    updatedAt: string;
    favorited: boolean;
    favoritesCount: number;
    author: {
        username: string;
        bio: string;
        image: string;
        following: boolean;
    };
};

export type CommentView = {
    id: string;
    createdAt: string;
    updatedAt: string;
    body: string;
    author: {
        username: string;
        bio: string;
        image: string;
        following: boolean;
    };
};

export function errorOutput(message: string) {
    return { errors: { body: [message] } };
}

export function buildUserPayload(
    User: UserConcept,
    Profile: ProfileConcept,
    userId: string,
): UserPayload | null {
    const userRow = User._get({ user: userId })[0];
    if (!userRow) return null;
    const profileId = Profile._getByUser({ user: userId })[0]?.profile;
    let bio = "";
    let image = "";
    if (profileId) {
        const profileRow = Profile._get({ profile: profileId })[0];
        if (profileRow) {
            bio = profileRow.bio;
            image = profileRow.image;
        }
    }
    return {
        user: {
            username: userRow.name,
            email: userRow.email,
            bio,
            image,
            token: null,
        },
    };
}

export function buildProfilePayload(
    User: UserConcept,
    Profile: ProfileConcept,
    userId: string,
): ProfilePayload | null {
    const userRow = User._get({ user: userId })[0];
    if (!userRow) return null;
    const profileId = Profile._getByUser({ user: userId })[0]?.profile;
    let bio = "";
    let image = "";
    if (profileId) {
        const profileRow = Profile._get({ profile: profileId })[0];
        if (profileRow) {
            bio = profileRow.bio;
            image = profileRow.image;
        }
    }
    return {
        profile: {
            username: userRow.name,
            bio,
            image,
            following: false,
        },
    };
}

export function buildArticleView(
    Article: ArticleConcept,
    User: UserConcept,
    Profile: ProfileConcept,
    Tag: TagConcept,
    Favorite: FavoriteConcept,
    articleId: string,
    viewerId?: string,
): ArticleView | null {
    const articleRow = Article._get({ article: articleId })[0];
    if (!articleRow) return null;
    const authorId = articleRow.author;
    const authorRow = User._get({ user: authorId })[0];
    const authorName = authorRow ? authorRow.name : authorId;
    const profileId = Profile._getByUser({ user: authorId })[0]?.profile;
    let bio = "";
    let image = "";
    if (profileId) {
        const profileRow = Profile._get({ profile: profileId })[0];
        if (profileRow) {
            bio = profileRow.bio;
            image = profileRow.image;
        }
    }
    const tags = uniqueStrings(
        Tag._getByTarget({ target: articleId }).map((row) => row.tag),
    );
    const favoritesCount =
        Favorite._countByTarget({ target: articleId })[0]?.count ?? 0;
    const favorited = viewerId
        ? Favorite._isFavorited({ user: viewerId, target: articleId })[0]
            ?.favorited ?? false
        : false;
    return {
        slug: articleRow.slug,
        title: articleRow.title,
        description: articleRow.description,
        body: articleRow.body,
        tagList: tags,
        createdAt: articleRow.createdAt,
        updatedAt: articleRow.updatedAt,
        favorited,
        favoritesCount,
        author: {
            username: authorName,
            bio,
            image,
            following: false,
        },
    };
}

export function buildArticlesPayload(
    Article: ArticleConcept,
    User: UserConcept,
    Profile: ProfileConcept,
    Tag: TagConcept,
    Favorite: FavoriteConcept,
    articleIds: string[],
    viewerId?: string,
) {
    const articles = articleIds
        .map((id) =>
            buildArticleView(
                Article,
                User,
                Profile,
                Tag,
                Favorite,
                id,
                viewerId,
            )
        )
        .filter((article): article is ArticleView => article !== null);
    return { articles, articlesCount: articles.length };
}

export function buildCommentView(
    Comment: CommentConcept,
    User: UserConcept,
    Profile: ProfileConcept,
    commentId: string,
): CommentView | null {
    const commentRow = Comment._get({ comment: commentId })[0];
    if (!commentRow) return null;
    const authorId = commentRow.author;
    const authorRow = User._get({ user: authorId })[0];
    const authorName = authorRow ? authorRow.name : authorId;
    const profileId = Profile._getByUser({ user: authorId })[0]?.profile;
    let bio = "";
    let image = "";
    if (profileId) {
        const profileRow = Profile._get({ profile: profileId })[0];
        if (profileRow) {
            bio = profileRow.bio;
            image = profileRow.image;
        }
    }
    return {
        id: commentId,
        createdAt: "",
        updatedAt: "",
        body: commentRow.body,
        author: {
            username: authorName,
            bio,
            image,
            following: false,
        },
    };
}

export function buildCommentsPayload(
    Comment: CommentConcept,
    User: UserConcept,
    Profile: ProfileConcept,
    articleId: string,
) {
    const commentIds = Comment._getByTarget({ target: articleId })
        .map((row) => row.comment);
    const comments = commentIds
        .map((id) => buildCommentView(Comment, User, Profile, id))
        .filter((comment): comment is CommentView => comment !== null);
    return { comments };
}

export function buildTagsPayload(Tag: TagConcept) {
    const tags = uniqueStrings(Tag._getAll({}).map((row) => row.tag));
    return { tags };
}
