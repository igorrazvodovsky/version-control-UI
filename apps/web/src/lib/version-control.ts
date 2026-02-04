import { DEFAULT_API_BASE_URL } from "@/lib/articles";

type Fetcher = typeof fetch;

export type VersionControlBranchStatus = "MAIN" | "IN_PROGRESS" | "COMMITTED";

export type VersionControlBranch = {
  id: string;
  name: string;
  label?: string | null;
  status: VersionControlBranchStatus;
  head?: string | null;
  isCurrent?: boolean;
  baseVersion?: number | null;
  version?: number | null;
};

export type BranchChange = {
  slug: string;
  title: string;
  changeType: "A" | "M" | "D";
  fieldsChanged: string[];
  updatedAt: string | null;
};

export type BranchListResponse = {
  branches: VersionControlBranch[];
};

export type BranchChangesResponse = {
  branch: VersionControlBranch;
  baseCommit: string | null;
  changes: BranchChange[];
};

export type CurrentBranchResponse = {
  branch: VersionControlBranch;
};

type FetchOptions = {
  baseUrl?: string;
  fetcher?: Fetcher;
  requestInit?: RequestInit;
};

async function fetchJson<T>(url: string, fetcher: Fetcher, requestInit?: RequestInit): Promise<T> {
  const response = await fetcher(url, requestInit);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error ?? `Request failed (status ${response.status})`;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function fetchBranches(
  { baseUrl = DEFAULT_API_BASE_URL, fetcher = fetch, requestInit }: FetchOptions = {},
): Promise<BranchListResponse> {
  const url = new URL("/version-control/branches", baseUrl).toString();
  return fetchJson<BranchListResponse>(url, fetcher, requestInit);
}

export async function fetchCurrentBranch(
  { baseUrl = DEFAULT_API_BASE_URL, fetcher = fetch, requestInit }: FetchOptions = {},
): Promise<CurrentBranchResponse> {
  const url = new URL("/version-control/branches/current", baseUrl).toString();
  return fetchJson<CurrentBranchResponse>(url, fetcher, requestInit);
}

export async function fetchBranchChanges(
  {
    baseUrl = DEFAULT_API_BASE_URL,
    fetcher = fetch,
    requestInit,
    name,
  }: FetchOptions & { name: string },
): Promise<BranchChangesResponse> {
  const url = new URL(`/version-control/branches/${encodeURIComponent(name)}/changes`, baseUrl).toString();
  return fetchJson<BranchChangesResponse>(url, fetcher, requestInit);
}

export async function createBranch(
  {
    baseUrl = DEFAULT_API_BASE_URL,
    fetcher = fetch,
    requestInit,
    name,
    label,
  }: FetchOptions & { name: string; label?: string },
): Promise<{ ok: boolean; branch: { id: string; name: string; label?: string | null } }> {
  const url = new URL("/version-control/branches", baseUrl).toString();
  const payload: Record<string, string> = { name };
  if (typeof label === "string" && label.trim().length > 0) {
    payload.label = label;
  }
  return fetchJson(url, fetcher, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    ...requestInit,
  });
}

export async function renameBranchLabel(
  {
    baseUrl = DEFAULT_API_BASE_URL,
    fetcher = fetch,
    requestInit,
    name,
    label,
  }: FetchOptions & { name: string; label: string },
): Promise<{ ok: boolean; branch: { id: string; name: string; label: string } }> {
  const url = new URL(`/version-control/branches/${encodeURIComponent(name)}`, baseUrl).toString();
  return fetchJson(url, fetcher, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
    ...requestInit,
  });
}

export async function switchBranch(
  {
    baseUrl = DEFAULT_API_BASE_URL,
    fetcher = fetch,
    requestInit,
    name,
  }: FetchOptions & { name: string },
): Promise<{ ok: boolean; branch: string }> {
  const url = new URL("/version-control/branches/current", baseUrl).toString();
  return fetchJson(url, fetcher, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
    ...requestInit,
  });
}

export async function commitBranch(
  {
    baseUrl = DEFAULT_API_BASE_URL,
    fetcher = fetch,
    requestInit,
    message,
  }: FetchOptions & { message: string },
): Promise<{ ok: boolean; commit: string; version: number | null }> {
  const url = new URL("/version-control/commits", baseUrl).toString();
  return fetchJson(url, fetcher, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    ...requestInit,
  });
}
