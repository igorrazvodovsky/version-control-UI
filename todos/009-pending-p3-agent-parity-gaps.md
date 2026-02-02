---
status: pending
priority: p3
issue_id: "009"
tags: [code-review, architecture]
dependencies: []
---

# Agent parity gaps for UI actions

The UI exposes multiple user actions but there is no agent tool parity or documented context, which blocks agent-native workflows if this app is expected to support them.

## Problem Statement

The page includes interactive actions (export, share, duplicate, delete, command palette items), but there is no agent-accessible API or tool mapping in the repo. If agents are expected to operate on the same data as users, this creates an orphaned feature set.

## Findings

- `apps/web/src/app/page.tsx` defines UI actions in the right sidebar and command palette (Export Data, Share Link, Duplicate, Delete, etc.).
- No agent tooling, system prompt context, or API endpoints are defined in this app to mirror these actions.
- This breaks action parity for agent-native workflows.

## Proposed Solutions

### Option 1: Add agent tools for these actions

**Approach:** Provide backend endpoints and agent tools that can invoke the same actions and expose them in the agent prompt.

**Pros:**
- Enables agent-native parity
- Improves automation potential

**Cons:**
- Requires backend API/tooling work

**Effort:** Medium (varies by backend)

**Risk:** Medium

---

### Option 2: Mark actions as UI-only

**Approach:** Document that these UI actions are not agent-accessible and ensure this is acceptable for the product.

**Pros:**
- Low effort
- Avoids unnecessary tooling

**Cons:**
- Agents cannot assist with these workflows

**Effort:** Low

**Risk:** Low

## Recommended Action


## Technical Details

**Affected files:**
- `apps/web/src/app/page.tsx` (UI actions)

## Resources

- **PR:** N/A (local review)

## Acceptance Criteria

- [ ] Agent tooling exists for each user-facing action, or
- [ ] The product decision to keep these UI-only is documented

## Work Log

### 2026-02-02 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed UI actions for agent parity
- Confirmed no agent tool surface in repo

**Learnings:**
- UI actions are currently orphaned from any agent workflow

## Notes

- If agent parity is out of scope, consider removing this todo during triage.
