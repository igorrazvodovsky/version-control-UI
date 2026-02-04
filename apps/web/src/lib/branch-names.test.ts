import { assert, assertEquals, assertMatch } from "jsr:@std/assert";
import {
  BRANCH_NAME_PLACEHOLDERS,
  formatBranchSequence,
  generateDefaultBranch,
  getNextBranchSequence,
} from "./branch-names.ts";

Deno.test("BRANCH_NAME_PLACEHOLDERS is non-empty", () => {
  assert(BRANCH_NAME_PLACEHOLDERS.length > 0);
});

Deno.test("generateDefaultBranch returns a technical name + human-friendly label", () => {
  const branch = generateDefaultBranch(42);
  const { name, label } = branch;
  const suffix = name.split("-").pop() ?? "";

  assertEquals(typeof name, "string");
  assert(name.length > 0);
  assert(name.length <= 64);

  // Technical branch name: T-000042.
  assertMatch(name, /^T-\d{6}$/);
  assertEquals(name, "T-000042");

  assertEquals(typeof label, "string");
  assert(label.length > 0);
  assertMatch(label, /^[A-Za-z0-9][A-Za-z0-9 ]+[A-Za-z0-9]$/);
  assert(label.includes("-") === false);
  assert(suffix.length === 6);
  assert(label.includes(suffix) === false);
});

Deno.test("formatBranchSequence pads sequence numbers", () => {
  assertEquals(formatBranchSequence(1), "T-000001");
  assertEquals(formatBranchSequence(12), "T-000012");
  assertEquals(formatBranchSequence(123456), "T-123456");
});

Deno.test("getNextBranchSequence skips non-sequential names", () => {
  const next = getNextBranchSequence(["main", "T-000004", "feature", "T-000010"]);
  assertEquals(next, 11);
});
