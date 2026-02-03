import { DEFAULT_API_BASE_URL } from "@/lib/articles";

type Fetcher = typeof fetch;

export type GitlessBranchStatus = "MAIN" | "IN_PROGRESS" | "COMMITTED";

export type GitlessBranch = {
  id: string;
  name: string;
  status: GitlessBranchStatus;
  head?: string | null;
  isCurrent?: boolean;
};

export type BranchChange = {
  slug: string;
  title: string;
  changeType: "added" | "modified" | "deleted";
  fieldsChanged: string[];
  updatedAt: string | null;
};

export type BranchListResponse = {
  branches: GitlessBranch[];
};

export type BranchChangesResponse = {
  branch: GitlessBranch;
  baseCommit: string | null;
  changes: BranchChange[];
};

export type CurrentBranchResponse = {
  branch: GitlessBranch;
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
  const url = new URL("/gitless/branches", baseUrl).toString();
  return fetchJson<BranchListResponse>(url, fetcher, requestInit);
}

export async function fetchCurrentBranch(
  { baseUrl = DEFAULT_API_BASE_URL, fetcher = fetch, requestInit }: FetchOptions = {},
): Promise<CurrentBranchResponse> {
  const url = new URL("/gitless/branches/current", baseUrl).toString();
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
  const url = new URL(`/gitless/branches/${encodeURIComponent(name)}/changes`, baseUrl).toString();
  return fetchJson<BranchChangesResponse>(url, fetcher, requestInit);
}

export async function createBranch(
  {
    baseUrl = DEFAULT_API_BASE_URL,
    fetcher = fetch,
    requestInit,
    name,
  }: FetchOptions & { name: string },
): Promise<{ ok: boolean; branch: { id: string; name: string } }> {
  const url = new URL("/gitless/branches", baseUrl).toString();
  return fetchJson(url, fetcher, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
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
  const url = new URL("/gitless/branches/current", baseUrl).toString();
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
): Promise<{ ok: boolean; commit: string }> {
  const url = new URL("/gitless/commits", baseUrl).toString();
  return fetchJson(url, fetcher, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    ...requestInit,
  });
}
