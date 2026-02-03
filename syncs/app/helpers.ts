import { z } from "npm:zod";

export type InputRecord = Record<string, unknown>;

const InputRecordSchema = z.record(z.string(), z.unknown());
const NonEmptyStringSchema = z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0);
const OptionalStringSchema = z.string();
const StringArraySchema = z.array(z.string());

export function asRecord(value: unknown): InputRecord {
    const result = InputRecordSchema.safeParse(value);
    return result.success ? result.data : {};
}

export function hasKey(input: InputRecord, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(input, key);
}

export function getString(input: InputRecord, key: string): string | undefined {
    const result = NonEmptyStringSchema.safeParse(input[key]);
    return result.success ? result.data : undefined;
}

export function getOptionalString(
    input: InputRecord,
    key: string,
): string | undefined {
    const result = OptionalStringSchema.safeParse(input[key]);
    return result.success ? result.data : undefined;
}

export function getStringArray(
    input: InputRecord,
    key: string,
): string[] | undefined {
    const result = StringArraySchema.safeParse(input[key]);
    if (!result.success) return undefined;
    return result.data
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
    return StringArraySchema.safeParse(value).success;
}
