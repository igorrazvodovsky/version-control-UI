import { actions, Frames, Vars } from "../../engine/mod.ts";
import { asRecord, getOptionalString, getString, hasKey } from "./helpers.ts";
import {
    buildProfilePayload,
    buildUserPayload,
    errorOutput,
} from "./format.ts";
import type { APIConcept } from "../../concepts/API.ts";
import type { UserConcept } from "../../concepts/User.ts";
import type { ProfileConcept } from "../../concepts/Profile.ts";

type ProfileLookup =
    | { ok: true; userId: string; profileId: string }
    | { ok: false; code: number; error: string };

type UserLookup =
    | { ok: true; userId: string }
    | { ok: false; code: number; error: string };

function resolveProfile(
    User: UserConcept,
    Profile: ProfileConcept,
    username: string | undefined,
): ProfileLookup {
    if (!username) {
        return { ok: false, code: 422, error: "username required" };
    }
    const userRow = User._getByName({ name: username })[0];
    if (!userRow) {
        return { ok: false, code: 404, error: "user not found" };
    }
    const profileRow = Profile._getByUser({ user: userRow.user })[0];
    if (!profileRow) {
        return { ok: false, code: 404, error: "profile not found" };
    }
    return { ok: true, userId: userRow.user, profileId: profileRow.profile };
}

function resolveUser(
    User: UserConcept,
    username: string | undefined,
): UserLookup {
    if (!username) {
        return { ok: false, code: 422, error: "username required" };
    }
    const userRow = User._getByName({ name: username })[0];
    if (!userRow) {
        return { ok: false, code: 404, error: "user not found" };
    }
    return { ok: true, userId: userRow.user };
}

export function makeUserProfileSyncs(
    API: APIConcept,
    User: UserConcept,
    Profile: ProfileConcept,
) {
    const RegisterUser = ({
        request,
        input,
        username,
        email,
        user,
    }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/users", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => {
                const payload = asRecord(frame[input]);
                const name = getString(payload, "username") ?? "";
                const mail = getString(payload, "email") ?? "";
                return {
                    ...frame,
                    [username]: name,
                    [email]: mail,
                    [user]: crypto.randomUUID(),
                };
            }),
        then: actions([User.register, {
            user,
            name: username,
            email,
        }]),
    });

    const RegisterUserError = ({ request, error, output }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/users" }, { request }],
            [User.register, {}, { error }],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => ({
                ...frame,
                [output]: errorOutput(String(frame[error])),
            })),
        then: actions([API.response, { request, output, code: 422 }]),
    });

    const RegisterUserFormat = ({
        request,
        user,
        profile,
        payload,
    }: Vars) => ({
        when: actions(
            [API.request, { method: "POST", path: "/users" }, { request }],
            [User.register, {}, { user }],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => ({
                ...frame,
                [profile]: crypto.randomUUID(),
                [payload]: {
                    request: frame[request],
                    user: frame[user],
                    code: 201,
                },
            })),
        then: actions(
            [Profile.register, { profile, user }],
            [API.format, { type: "user", payload }],
        ),
    });

    const FormatUserResponse = ({
        payload,
        request,
        user,
        output,
        code,
    }: Vars) => ({
        when: actions([API.format, { type: "user", payload }, {}]),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[payload]);
                const requestId = payloadValue.request;
                const userId = payloadValue.user;
                const status = typeof payloadValue.code === "number"
                    ? payloadValue.code
                    : 200;
                if (typeof requestId !== "string" || typeof userId !== "string") {
                    return [];
                }
                const payloadOut = buildUserPayload(User, Profile, userId);
                if (!payloadOut) return [];
                return [{
                    ...frame,
                    [request]: requestId,
                    [user]: userId,
                    [code]: status,
                    [output]: payloadOut,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const GetUser = ({ request, input, payload }: Vars) => ({
        when: actions(
            [API.request, { method: "GET", path: "/user", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const username = getString(payloadValue, "username");
                const lookup = resolveUser(User, username);
                if (!lookup.ok) return [];
                return [{
                    ...frame,
                    [payload]: {
                        request: frame[request],
                        user: lookup.userId,
                        code: 200,
                    },
                }];
            }),
        then: actions([API.format, { type: "user", payload }]),
    });

    const GetUserNotFound = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "GET", path: "/user", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const username = getString(payloadValue, "username");
                const lookup = resolveUser(User, username);
                if (lookup.ok) return [];
                return [{
                    ...frame,
                    [output]: errorOutput(lookup.error),
                    [code]: lookup.code,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const UpdateUserName = ({ input, user, name }: Vars) => ({
        when: actions([API.request, { method: "PUT", path: "/user", input }, {}]),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const username = getString(payloadValue, "username");
                const hasName = hasKey(payloadValue, "newUsername");
                const hasEmail = hasKey(payloadValue, "email");
                if (!hasName || hasEmail) return [];
                const nextName = getString(payloadValue, "newUsername");
                if (!nextName) return [];
                const lookup = resolveUser(User, username);
                if (!lookup.ok) return [];
                return [{
                    ...frame,
                    [user]: lookup.userId,
                    [name]: nextName,
                }];
            }),
        then: actions([User.update, { user, name }]),
    });

    const UpdateUserEmail = ({ input, user, email }: Vars) => ({
        when: actions([API.request, { method: "PUT", path: "/user", input }, {}]),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const username = getString(payloadValue, "username");
                const hasName = hasKey(payloadValue, "newUsername");
                const hasEmail = hasKey(payloadValue, "email");
                if (hasName || !hasEmail) return [];
                const nextEmail = getString(payloadValue, "email");
                if (!nextEmail) return [];
                const lookup = resolveUser(User, username);
                if (!lookup.ok) return [];
                return [{
                    ...frame,
                    [user]: lookup.userId,
                    [email]: nextEmail,
                }];
            }),
        then: actions([User.update, { user, email }]),
    });

    const UpdateUserError = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "PUT", path: "/user", input }, { request }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const username = getString(payloadValue, "username");
                const hasName = hasKey(payloadValue, "newUsername");
                const hasEmail = hasKey(payloadValue, "email");
                if (!username) {
                    return [{
                        ...frame,
                        [output]: errorOutput("username required"),
                        [code]: 422,
                    }];
                }
                if ((hasName && hasEmail) || (!hasName && !hasEmail)) {
                    return [{
                        ...frame,
                        [output]: errorOutput("provide exactly one field"),
                        [code]: 422,
                    }];
                }
                if (hasName) {
                    const nextName = getString(payloadValue, "newUsername");
                    if (!nextName) {
                        return [{
                            ...frame,
                            [output]: errorOutput("username invalid"),
                            [code]: 422,
                        }];
                    }
                }
                if (hasEmail) {
                    const nextEmail = getString(payloadValue, "email");
                    if (!nextEmail) {
                        return [{
                            ...frame,
                            [output]: errorOutput("email invalid"),
                            [code]: 422,
                        }];
                    }
                }
                const lookup = resolveUser(User, username);
                if (!lookup.ok) {
                    return [{
                        ...frame,
                        [output]: errorOutput(lookup.error),
                        [code]: lookup.code,
                    }];
                }
                return [];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const UpdateUserActionError = ({ request, error, output }: Vars) => ({
        when: actions(
            [API.request, { method: "PUT", path: "/user" }, { request }],
            [User.update, {}, { error }],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => ({
                ...frame,
                [output]: errorOutput(String(frame[error])),
            })),
        then: actions([API.response, { request, output, code: 422 }]),
    });

    const UpdateUserFormat = ({ request, user, payload }: Vars) => ({
        when: actions(
            [API.request, { method: "PUT", path: "/user" }, { request }],
            [User.update, {}, { user }],
        ),
        where: (frames: Frames) =>
            frames.map((frame) => ({
                ...frame,
                [payload]: {
                    request: frame[request],
                    user: frame[user],
                    code: 200,
                },
            })),
        then: actions([API.format, { type: "user", payload }]),
    });

    const GetProfile = ({ request, input, payload }: Vars) => ({
        when: actions(
            [API.request, { method: "GET", path: "/profiles", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const username = getString(payloadValue, "username");
                const lookup = resolveProfile(User, Profile, username);
                if (!lookup.ok) return [];
                return [{
                    ...frame,
                    [payload]: {
                        request: frame[request],
                        user: lookup.userId,
                        code: 200,
                    },
                }];
            }),
        then: actions([API.format, { type: "profile", payload }]),
    });

    const GetProfileNotFound = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "GET", path: "/profiles", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const username = getString(payloadValue, "username");
                const lookup = resolveProfile(User, Profile, username);
                if (lookup.ok) return [];
                return [{
                    ...frame,
                    [output]: errorOutput(lookup.error),
                    [code]: lookup.code,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const UpdateProfileBio = ({
        input,
        profile,
        bio,
        user,
    }: Vars) => ({
        when: actions([API.request, { method: "PUT", path: "/profiles", input }, {}]),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const username = getString(payloadValue, "username");
                const hasBio = hasKey(payloadValue, "bio");
                const hasImage = hasKey(payloadValue, "image");
                if (!hasBio || hasImage) return [];
                const bioValue = getOptionalString(payloadValue, "bio");
                if (bioValue === undefined) return [];
                const lookup = resolveProfile(User, Profile, username);
                if (!lookup.ok) return [];
                return [{
                    ...frame,
                    [profile]: lookup.profileId,
                    [user]: lookup.userId,
                    [bio]: bioValue,
                }];
            }),
        then: actions([Profile.update, { profile, bio }]),
    });

    const UpdateProfileImage = ({
        input,
        profile,
        image,
        user,
    }: Vars) => ({
        when: actions([API.request, { method: "PUT", path: "/profiles", input }, {}]),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const username = getString(payloadValue, "username");
                const hasBio = hasKey(payloadValue, "bio");
                const hasImage = hasKey(payloadValue, "image");
                if (hasBio || !hasImage) return [];
                const imageValue = getString(payloadValue, "image");
                if (!imageValue) return [];
                const lookup = resolveProfile(User, Profile, username);
                if (!lookup.ok) return [];
                return [{
                    ...frame,
                    [profile]: lookup.profileId,
                    [user]: lookup.userId,
                    [image]: imageValue,
                }];
            }),
        then: actions([Profile.update, { profile, image }]),
    });

    const UpdateProfileError = ({ request, input, output, code }: Vars) => ({
        when: actions(
            [API.request, { method: "PUT", path: "/profiles", input }, {
                request,
            }],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const username = getString(payloadValue, "username");
                if (!username) {
                    return [{
                        ...frame,
                        [output]: errorOutput("username required"),
                        [code]: 422,
                    }];
                }
                const hasBio = hasKey(payloadValue, "bio");
                const hasImage = hasKey(payloadValue, "image");
                if (hasBio && hasImage) {
                    return [{
                        ...frame,
                        [output]: errorOutput("provide only one field"),
                        [code]: 422,
                    }];
                }
                if (!hasBio && !hasImage) {
                    return [{
                        ...frame,
                        [output]: errorOutput("missing update field"),
                        [code]: 422,
                    }];
                }
                if (hasImage) {
                    const imageValue = getString(payloadValue, "image");
                    if (!imageValue) {
                        return [{
                            ...frame,
                            [output]: errorOutput("image invalid"),
                            [code]: 422,
                        }];
                    }
                }
                if (hasBio) {
                    const bioValue = getOptionalString(payloadValue, "bio");
                    if (bioValue === undefined) {
                        return [{
                            ...frame,
                            [output]: errorOutput("bio invalid"),
                            [code]: 422,
                        }];
                    }
                }
                const lookup = resolveProfile(User, Profile, username);
                if (!lookup.ok) {
                    return [{
                        ...frame,
                        [output]: errorOutput(lookup.error),
                        [code]: lookup.code,
                    }];
                }
                return [];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    const UpdateProfileFormat = ({ request, input, payload }: Vars) => ({
        when: actions(
            [API.request, { method: "PUT", path: "/profiles", input }, {
                request,
            }],
            [Profile.update, {}, {}],
        ),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[input]);
                const username = getString(payloadValue, "username");
                const lookup = resolveProfile(User, Profile, username);
                if (!lookup.ok) return [];
                return [{
                    ...frame,
                    [payload]: {
                        request: frame[request],
                        user: lookup.userId,
                        code: 200,
                    },
                }];
            }),
        then: actions([API.format, { type: "profile", payload }]),
    });

    const FormatProfileResponse = ({
        payload,
        request,
        user,
        output,
        code,
    }: Vars) => ({
        when: actions([API.format, { type: "profile", payload }, {}]),
        where: (frames: Frames) =>
            frames.flatMap((frame) => {
                const payloadValue = asRecord(frame[payload]);
                const requestId = payloadValue.request;
                const userId = payloadValue.user;
                const status = typeof payloadValue.code === "number"
                    ? payloadValue.code
                    : 200;
                if (typeof requestId !== "string" || typeof userId !== "string") {
                    return [];
                }
                const payloadOut = buildProfilePayload(User, Profile, userId);
                if (!payloadOut) return [];
                return [{
                    ...frame,
                    [request]: requestId,
                    [user]: userId,
                    [code]: status,
                    [output]: payloadOut,
                }];
            }),
        then: actions([API.response, { request, output, code }]),
    });

    return {
        RegisterUser,
        RegisterUserError,
        RegisterUserFormat,
        FormatUserResponse,
        GetUser,
        GetUserNotFound,
        UpdateUserError,
        UpdateUserName,
        UpdateUserEmail,
        UpdateUserActionError,
        UpdateUserFormat,
        GetProfile,
        GetProfileNotFound,
        UpdateProfileBio,
        UpdateProfileImage,
        UpdateProfileError,
        UpdateProfileFormat,
        FormatProfileResponse,
    } as const;
}
