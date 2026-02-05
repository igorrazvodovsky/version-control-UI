import {
    parsePersistedAppState,
    snapshotAppState,
    type PersistableApp,
    type PersistedAppState,
} from "./app_state.ts";

const DEFAULT_APP_STATE_KEY = ["ticket-less-4-1", "app_state", 1] as const;

export async function loadAppStateFromKv(
    kv: Deno.Kv,
    key: Deno.KvKey = DEFAULT_APP_STATE_KEY,
): Promise<PersistedAppState | null> {
    const result = await kv.get(key);
    if (result.value === null) return null;
    return parsePersistedAppState(result.value);
}

export async function saveAppStateToKv(
    kv: Deno.Kv,
    app: PersistableApp,
    key: Deno.KvKey = DEFAULT_APP_STATE_KEY,
): Promise<void> {
    const state = snapshotAppState(app);
    await kv.set(key, state);
}

