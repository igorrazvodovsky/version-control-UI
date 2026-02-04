const BRANCH_PLACEHOLDER_PHRASES = [
  "Polish questionable gadgets",
  "Wrangle sleepy dragons",
  "Tidy chaotic doodads",
  "Fix wobbly contraptions",
  "Nudge stubborn pixels",
  "Herd unruly kittens",
  "Soothe grumpy servers",
  "Untangle spaghetti thoughts",
  "Refactor mischievous gremlins",
  "Stabilize jittery widgets",
  "Calibrate dramatic levers",
  "Patch leaky buckets",
  "Clarify mysterious vibes",
  "Smooth jagged edges",
  "Rename suspicious things",
  "Rewire confused pipes",
  "Simplify noisy machinery",
  "Sweep dusty corners",
  "Trim wild hedges",
  "Align wandering arrows",
  "Massage reluctant data",
  "Coax polite behavior",
  "Mend brittle threads",
  "Tame overexcited alarms",
  "Reconcile awkward truths",
  "Widen narrow paths",
  "Defuse spicy surprises",
  "Chase runaway gnomes",
  "Shave yak-shaped problems",
  "Unclog philosophical drains",
  "De-jank the universe",
  "Appease capricious spirits",
] as const;

export const BRANCH_NAME_PLACEHOLDERS = [...BRANCH_PLACEHOLDER_PHRASES];

const BRANCH_SEQUENCE_PREFIX = "T-";
const BRANCH_SEQUENCE_PAD = 6;
const BRANCH_SEQUENCE_PATTERN = /^T-(\d{6})$/;

function cryptoRandomInt(maxExclusive: number): number {
  if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) return 0;
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.getRandomValues) {
    return Math.floor(Math.random() * maxExclusive);
  }

  const random = new Uint32Array(1);
  cryptoObj.getRandomValues(random);
  return random[0] % maxExclusive;
}

export function formatBranchSequence(sequence: number): string {
  const normalized = Math.max(1, Math.floor(sequence));
  return `${BRANCH_SEQUENCE_PREFIX}${String(normalized).padStart(BRANCH_SEQUENCE_PAD, "0")}`;
}

export function getNextBranchSequence(names: string[]): number {
  let max = 0;
  for (const rawName of names) {
    const match = BRANCH_SEQUENCE_PATTERN.exec(rawName.trim());
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > max) {
      max = value;
    }
  }
  return max + 1;
}

export function generateDefaultBranch(sequence = 1): { name: string; label: string } {
  const phrase = BRANCH_PLACEHOLDER_PHRASES[cryptoRandomInt(BRANCH_PLACEHOLDER_PHRASES.length)];
  const name = formatBranchSequence(sequence);
  const label = phrase;

  return { name, label };
}
