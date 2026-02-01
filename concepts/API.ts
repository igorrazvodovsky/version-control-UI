export class APIConcept {
    private requests = new Map<
        string,
        {
            method: string;
            path: string;
            input: unknown;
            output: unknown;
            code: number;
        }
    >();

    request({
        request,
        method,
        path,
        input,
    }: {
        request: string;
        method: string;
        path: string;
        input: unknown;
    }) {
        const existing = this.requests.get(request);
        if (existing) {
            existing.method = method;
            existing.path = path;
            existing.input = input;
            return { request };
        }
        this.requests.set(request, {
            method,
            path,
            input,
            output: null,
            code: 0,
        });
        return { request };
    }

    response({
        request,
        output,
        code,
    }: {
        request: string;
        output: unknown;
        code: number;
    }) {
        const existing = this.requests.get(request);
        if (existing) {
            existing.output = output;
            existing.code = code;
            return { request };
        }
        this.requests.set(request, {
            method: "",
            path: "",
            input: null,
            output,
            code,
        });
        return { request };
    }

    format({ type: _type, payload }: { type: string; payload: unknown }) {
        return { output: payload };
    }

    _get({ request }: { request: string }): {
        request: string;
        method: string;
        path: string;
        input: unknown;
        output: unknown;
        code: number;
    }[] {
        const existing = this.requests.get(request);
        if (!existing) return [];
        return [{
            request,
            method: existing.method,
            path: existing.path,
            input: existing.input,
            output: existing.output,
            code: existing.code,
        }];
    }
}
