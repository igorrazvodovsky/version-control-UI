import { serve } from "https://deno.land/std/http/server.ts";
import { createRealWorldApp } from "./realworld_app.ts";

const appPromise = createRealWorldApp();

type RouteDef = {
    method: string;
    template: string;
    pattern: RegExp;
    params: string[];
    paramMap?: Record<string, string>;
};

function compileRoute(template: string): { pattern: RegExp; params: string[] } {
    const params: string[] = [];
    const parts = template.split("/").filter(Boolean).map((part) => {
        if (part.startsWith(":")) {
            params.push(part.slice(1));
            return "([^/]+)";
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    });
    const pattern = new RegExp(`^/${parts.join("/")}$`);
    return { pattern, params };
}

function buildRoute(
    method: string,
    template: string,
    paramMap?: Record<string, string>,
): RouteDef {
    const { pattern, params } = compileRoute(template);
    return { method, template, pattern, params, paramMap };
}

const routes: RouteDef[] = [
    buildRoute("POST", "/users"),
    buildRoute("GET", "/profiles"),
    buildRoute("GET", "/user"),
    buildRoute("PUT", "/user"),
    buildRoute("PUT", "/profiles"),
    buildRoute("POST", "/articles"),
    buildRoute("GET", "/articles"),
    buildRoute("GET", "/articles/:slug"),
    buildRoute("PUT", "/articles/:slug"),
    buildRoute("DELETE", "/articles/:slug"),
    buildRoute("POST", "/articles/:slug/comments"),
    buildRoute("GET", "/articles/:slug/comments"),
    buildRoute(
        "DELETE",
        "/articles/:slug/comments/:id",
        { id: "commentId" },
    ),
    buildRoute("POST", "/articles/:slug/favorite"),
    buildRoute("DELETE", "/articles/:slug/favorite"),
    buildRoute("GET", "/tags"),
    buildRoute("POST", "/gitless/init"),
    buildRoute("POST", "/gitless/branches"),
    buildRoute("PUT", "/gitless/branches/current"),
    buildRoute("POST", "/gitless/commits"),
];

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(status: number, body: unknown) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...corsHeaders,
        },
    });
}

function errorResponse(status: number, message: string) {
    return jsonResponse(status, { error: message });
}

function matchRoute(method: string, path: string) {
    for (const route of routes) {
        if (route.method !== method) continue;
        const match = route.pattern.exec(path);
        if (!match) continue;
        const params: Record<string, string> = {};
        route.params.forEach((param, idx) => {
            const name = route.paramMap?.[param] ?? param;
            params[name] = match[idx + 1];
        });
        return { route, params };
    }
    return null;
}

function queryToInput(searchParams: URLSearchParams) {
    const input: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
        input[key] = value;
    }
    return input;
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
    const text = await request.text();
    if (!text.trim()) return {};
    try {
        const parsed = JSON.parse(text) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Body must be a JSON object");
        }
        return parsed as Record<string, unknown>;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid JSON";
        throw new Error(message);
    }
}

export async function handleRequest(request: Request): Promise<Response> {
    if (request.method.toUpperCase() === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const matched = matchRoute(method, url.pathname);
    if (!matched) {
        return errorResponse(404, "route not found");
    }

    const queryInput = queryToInput(url.searchParams);
    let bodyInput: Record<string, unknown> = {};
    if (method !== "GET") {
        try {
            bodyInput = await readJsonBody(request);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Invalid JSON";
            return errorResponse(400, message);
        }
    }

    const input = {
        ...queryInput,
        ...bodyInput,
        ...matched.params,
    } as Record<string, unknown>;

    const { API } = await appPromise;
    const requestId = crypto.randomUUID();
    await API.request({
        request: requestId,
        method,
        path: matched.route.template,
        input,
    });

    const stored = API._get({ request: requestId })[0];
    if (!stored || (stored.code === 0 && stored.output === null)) {
        return errorResponse(500, `no response for request ${requestId}`);
    }

    return jsonResponse(stored.code || 200, stored.output ?? {});
}

if (import.meta.main) {
    const port = Number(Deno.env.get("PORT") ?? "8080");
    serve(handleRequest, { port });
    console.log(`HTTP adapter listening on http://localhost:${port}`);
}
