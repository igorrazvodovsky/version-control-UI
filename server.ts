import { Application, Router } from "jsr:@oak/oak";
import { z } from "npm:zod";
import { createApp } from "./app.ts";
import { saveAppStateToKv } from "./persistence/app_state_kv.ts";

const kvPath = import.meta.main
    ? (Deno.env.get("APP_KV_PATH") ?? "tmp/app-state.kv")
    : undefined;

let kv: Deno.Kv | undefined;
if (kvPath) {
    if (typeof Deno.openKv === "function") {
        try {
            kv = await Deno.openKv(kvPath);
        } catch (error) {
            console.warn(
                `Failed to open Deno KV at ${kvPath}; persistence disabled.`,
                error,
            );
        }
    } else {
        console.warn(
            "Deno.openKv is unavailable; run with --unstable-kv or upgrade Deno. Persistence disabled.",
        );
    }
}

const appPromise = createApp({ kv });

let persistQueue: Promise<void> = Promise.resolve();

function shouldPersist(method: string) {
    const upper = method.toUpperCase();
    return upper === "POST" || upper === "PUT" || upper === "DELETE";
}

function queuePersist(app: Awaited<typeof appPromise>) {
    if (!kv) return Promise.resolve();
    persistQueue = persistQueue
        .then(async () => {
            await saveAppStateToKv(kv, app);
        })
        .catch((error) => {
            if (kvPath) {
                console.warn(`Failed to persist app state to Deno KV at ${kvPath}.`, error);
            } else {
                console.warn("Failed to persist app state.", error);
            }
        });
    return persistQueue;
}

type RouteDef = {
    method: string;
    template: string;
    paramMap?: Record<string, string>;
    inputSchema?: z.ZodType<Record<string, unknown>>;
};

const routes: RouteDef[] = [
    {
        method: "POST",
        template: "/users",
        inputSchema: z.object({
            username: z.string().trim().min(1),
            email: z.string().trim().min(1),
        }).passthrough(),
    },
    {
        method: "GET",
        template: "/profiles",
        inputSchema: z.object({
            username: z.string().trim().min(1),
        }).passthrough(),
    },
    {
        method: "GET",
        template: "/user",
        inputSchema: z.object({
            username: z.string().trim().min(1),
        }).passthrough(),
    },
    {
        method: "PUT",
        template: "/user",
        inputSchema: z.object({
            username: z.string().trim().min(1),
            newUsername: z.string().optional(),
            email: z.string().optional(),
        }).passthrough().refine((value) => {
            const hasName = value.newUsername !== undefined;
            const hasEmail = value.email !== undefined;
            return (hasName && !hasEmail) || (!hasName && hasEmail);
        }, { message: "provide exactly one field" }),
    },
    {
        method: "PUT",
        template: "/profiles",
        inputSchema: z.object({
            username: z.string().trim().min(1),
            bio: z.string().optional(),
            image: z.string().optional(),
        }).passthrough().refine((value) => {
            const hasBio = value.bio !== undefined;
            const hasImage = value.image !== undefined;
            return (hasBio && !hasImage) || (!hasBio && hasImage);
        }, { message: "provide only one field" }),
    },
    {
        method: "POST",
        template: "/articles",
        inputSchema: z.object({
            author: z.string().trim().min(1),
            title: z.string().trim().min(1),
            description: z.string().trim().min(1),
            body: z.string().trim().min(1),
            tagList: z.array(z.string()).optional(),
        }).passthrough(),
    },
    {
        method: "GET",
        template: "/articles",
        inputSchema: z.object({
            author: z.string().optional(),
            favoritedBy: z.string().optional(),
            tag: z.string().optional(),
            viewer: z.string().optional(),
        }).passthrough(),
    },
    {
        method: "GET",
        template: "/articles/:slug",
        inputSchema: z.object({
            slug: z.string().trim().min(1),
            viewer: z.string().optional(),
        }).passthrough(),
    },
    {
        method: "PUT",
        template: "/articles/:slug",
        inputSchema: z.object({
            slug: z.string().trim().min(1),
            author: z.string().trim().min(1),
            title: z.string().trim().min(1),
            description: z.string().trim().min(1),
            body: z.string().trim().min(1),
        }).passthrough(),
    },
    {
        method: "DELETE",
        template: "/articles/:slug",
        inputSchema: z.object({
            slug: z.string().trim().min(1),
            author: z.string().trim().min(1),
        }).passthrough(),
    },
    {
        method: "POST",
        template: "/articles/:slug/comments",
        inputSchema: z.object({
            slug: z.string().trim().min(1),
            author: z.string().trim().min(1),
            body: z.string().trim().min(1),
        }).passthrough(),
    },
    {
        method: "GET",
        template: "/articles/:slug/comments",
        inputSchema: z.object({
            slug: z.string().trim().min(1),
        }).passthrough(),
    },
    {
        method: "DELETE",
        template: "/articles/:slug/comments/:id",
        paramMap: { id: "commentId" },
        inputSchema: z.object({
            slug: z.string().trim().min(1),
            commentId: z.string().trim().min(1),
            author: z.string().trim().min(1),
        }).passthrough(),
    },
    {
        method: "POST",
        template: "/articles/:slug/favorite",
        inputSchema: z.object({
            slug: z.string().trim().min(1),
            user: z.string().trim().min(1),
        }).passthrough(),
    },
    {
        method: "DELETE",
        template: "/articles/:slug/favorite",
        inputSchema: z.object({
            slug: z.string().trim().min(1),
            user: z.string().trim().min(1),
        }).passthrough(),
    },
    { method: "GET", template: "/tags" },
    { method: "POST", template: "/version-control/init" },
    {
        method: "POST",
        template: "/version-control/branches",
        inputSchema: z.object({
            name: z.string().trim().min(1),
            label: z.string().trim().min(1).optional(),
        }).passthrough(),
    },
    { method: "GET", template: "/version-control/branches" },
    {
        method: "PUT",
        template: "/version-control/branches/current",
        inputSchema: z.object({
            name: z.string().trim().min(1),
        }).passthrough(),
    },
    { method: "GET", template: "/version-control/branches/current" },
    {
        method: "PUT",
        template: "/version-control/branches/:name",
        inputSchema: z.object({
            name: z.string().trim().min(1),
            label: z.string().trim().min(1),
        }).passthrough(),
    },
    {
        method: "GET",
        template: "/version-control/branches/:name/changes",
        inputSchema: z.object({
            name: z.string().trim().min(1),
        }).passthrough(),
    },
    {
        method: "POST",
        template: "/version-control/commits",
        inputSchema: z.object({
            message: z.string().trim().min(1),
        }).passthrough(),
    },
    {
        method: "GET",
        template: "/articles/:slug/history",
        inputSchema: z.object({
            slug: z.string().trim().min(1),
            limit: z.string().optional(),
        }).passthrough(),
    },
];

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

const InputRecordSchema = z.record(z.string(), z.unknown());

class ValidationError extends Error {
    status: number;

    constructor(message: string, status = 422) {
        super(message);
        this.status = status;
    }
}

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

function applyCorsHeaders(headers: Headers) {
    for (const [key, value] of Object.entries(corsHeaders)) {
        headers.set(key, value);
    }
}

function parseRecord(value: unknown, message: string): Record<string, unknown> {
    const result = InputRecordSchema.safeParse(value);
    if (!result.success) {
        throw new Error(message);
    }
    return result.data;
}

function formatZodError(error: z.ZodError) {
    const issues = "issues" in error && Array.isArray(error.issues)
        ? error.issues
        : (error as unknown as { errors?: { message: string; path?: string[] }[] })
            .errors ?? [];
    if (issues.length === 0) return "invalid input";
    const issue = issues[0];
    const path = Array.isArray(issue.path) && issue.path.length > 0
        ? issue.path.join(".")
        : "input";
    return `${path} ${issue.message}`.trim();
}

function validateInput(route: RouteDef, input: Record<string, unknown>) {
    if (!route.inputSchema) return input;
    const result = route.inputSchema.safeParse(input);
    if (!result.success) {
        throw new ValidationError(formatZodError(result.error));
    }
    return result.data;
}

async function readJsonBody(
    ctx: { request: { hasBody: boolean; body?: any } },
) {
    if (!ctx.request.hasBody) return {};
    const body = ctx.request.body;
    if (!body) return {};
    let parsed: unknown;

    try {
        const bodyType = typeof body.type === "string" ? body.type : undefined;

        if (bodyType === "json" && typeof body.json === "function") {
            parsed = await body.json();
        } else if (bodyType === "text" && typeof body.text === "function") {
            const text = await body.text();
            if (!text.trim()) return {};
            parsed = JSON.parse(text);
        } else if (typeof body.json === "function") {
            parsed = await body.json();
        } else {
            throw new Error("Body must be a JSON object");
        }
    } catch (error) {
        throw new Error(errorMessage(error, "Invalid JSON"));
    }

    if (parsed === undefined || parsed === null || parsed === "") {
        return {};
    }

    return parseRecord(parsed, "Body must be a JSON object");
}

function queryToInput(searchParams: URLSearchParams) {
    return Object.fromEntries(searchParams.entries());
}

function paramsToInput(
    params: Record<string, string>,
    paramMap?: Record<string, string>,
) {
    const input: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
        const name = paramMap?.[key] ?? key;
        input[name] = value;
    }
    return input;
}

async function buildInput(
    ctx: {
        request: { method: string; url: URL; hasBody: boolean; body?: unknown };
        params: Record<string, string>;
    },
    route: RouteDef,
) {
    const queryInput = queryToInput(ctx.request.url.searchParams);
    const bodyInput = ctx.request.method === "GET" ? {} : await readJsonBody(ctx);
    const paramsInput = paramsToInput(ctx.params, route.paramMap);
    const input = {
        ...queryInput,
        ...bodyInput,
        ...paramsInput,
    } as Record<string, unknown>;
    return validateInput(route, input);
}

async function handleRoute(
    ctx: {
        request: { method: string; url: URL; hasBody: boolean; body?: unknown };
        params: Record<string, string>;
        response: { status: number; body: unknown; type?: string };
    },
    route: RouteDef,
) {
    const input = await buildInput(ctx, route);
    const app = await appPromise;
    const { API } = app;
    const requestId = crypto.randomUUID();
    await API.request({
        request: requestId,
        method: ctx.request.method.toUpperCase(),
        path: route.template,
        input,
    });

    const stored = API._get({ request: requestId })[0];
    if (!stored || (stored.code === 0 && stored.output === null)) {
        ctx.response.status = 500;
        ctx.response.type = "json";
        ctx.response.body = { error: `no response for request ${requestId}` };
        return;
    }

    ctx.response.status = stored.code || 200;
    ctx.response.type = "json";
    ctx.response.body = stored.output ?? {};

    if (shouldPersist(ctx.request.method)) {
        await queuePersist(app);
    }
}

function registerRoute(router: Router, route: RouteDef) {
    const handler = async (ctx: any) => {
        try {
            await handleRoute(ctx, route);
        } catch (error) {
            const status = error instanceof ValidationError
                ? error.status
                : 400;
            ctx.response.status = status;
            ctx.response.type = "json";
            ctx.response.body = { error: errorMessage(error, "Invalid request") };
        }
    };

    switch (route.method) {
        case "GET":
            router.get(route.template, handler);
            break;
        case "POST":
            router.post(route.template, handler);
            break;
        case "PUT":
            router.put(route.template, handler);
            break;
        case "DELETE":
            router.delete(route.template, handler);
            break;
        default:
            router.all(route.template, handler);
    }
}

function createServerApp() {
    const app = new Application();
    const router = new Router();

    for (const route of routes) {
        registerRoute(router, route);
    }

    app.use(async (ctx, next) => {
        if (ctx.request.method.toUpperCase() === "OPTIONS") {
            applyCorsHeaders(ctx.response.headers);
            ctx.response.status = 204;
            return;
        }

        await next();
        applyCorsHeaders(ctx.response.headers);
    });

    app.use(router.routes());
    app.use(router.allowedMethods());
    app.use((ctx) => {
        const isNotFound = ctx.response.status === 404 ||
            (ctx.response.status === 200 && ctx.response.body == null);
        if (isNotFound) {
            ctx.response.status = 404;
            ctx.response.type = "json";
            ctx.response.body = { error: "route not found" };
        }
    });

    return app;
}

const app = createServerApp();

export async function handleRequest(request: Request): Promise<Response> {
    const handler = (app as unknown as {
        handle?: (request: Request) => Promise<Response | undefined>;
        fetch?: (request: Request) => Promise<Response>;
    });
    const response = handler.handle
        ? await handler.handle(request)
        : handler.fetch
        ? await handler.fetch(request)
        : undefined;
    if (!response) {
        const headers = new Headers({
            "Content-Type": "application/json; charset=utf-8",
        });
        applyCorsHeaders(headers);
        return new Response(JSON.stringify({ error: "route not found" }), {
            status: 404,
            headers,
        });
    }
    return response;
}

if (import.meta.main) {
    const port = Number(Deno.env.get("PORT") ?? "8080");
    app.listen({ port });
    console.log(`HTTP adapter listening on http://localhost:${port}`);
}
