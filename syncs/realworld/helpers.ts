export type InputRecord = Record<string, unknown>;

export function asRecord(value: unknown): InputRecord {
    if (value && typeof value === "object") {
        return value as InputRecord;
    }
    return {};
}

export function hasKey(input: InputRecord, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(input, key);
}

export function getString(input: InputRecord, key: string): string | undefined {
    const value = input[key];
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

export function getOptionalString(
    input: InputRecord,
    key: string,
): string | undefined {
    const value = input[key];
    if (typeof value !== "string") return undefined;
    return value;
}

export function getStringArray(
    input: InputRecord,
    key: string,
): string[] | undefined {
    const value = input[key];
    if (!Array.isArray(value)) return undefined;
    return value
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
}

export function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values));
}

export function randomSuffix(): string {
    return crypto.randomUUID().slice(0, 6);
}

export function slugifyTitle(title: string): string {
    const trimmed = title.trim().toLowerCase();
    const collapsed = trimmed.replace(/[^a-z0-9]+/g, "-");
    const stripped = collapsed.replace(/^-+/, "").replace(/-+$/, "");
    return stripped;
}

export function makeSlug(
    title: string,
    isTaken: (slug: string) => boolean,
): string {
    const base = slugifyTitle(title);
    let slug = base.length > 0 ? base : `article-${randomSuffix()}`;
    if (!isTaken(slug)) return slug;
    return `${slug}-${randomSuffix()}`;
}

export function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
}
