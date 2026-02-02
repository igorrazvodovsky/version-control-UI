---
date: 2026-02-02
topic: system-settings-gitless
---

# System Settings with Gitless Versioning

## What We're Building
A global, system-wide settings capability that influences application behavior. Everyone can view the settings; admins are the primary editors (no auth enforcement yet). Settings are grouped into three pages in the frontend, and all values are simple scalars (String, Number, Flag, Date). Each save produces a Gitless commit on the current branch, and the commit history is what powers the settings version timeline. For version visibility, each commit captures a full settings snapshot (the entire bundle), and diffs are computed by comparing snapshots so users can see who changed what and when.

Settings groups and examples (inspired by ontology files, but focused on circular manufacturing):
- Circularity Strategy: default strategy "reuse", minimum recycled content %, repairability index target, take-back window days, material passport required, default end-of-life route.
- Asset Tracking & Identifiers: asset identifier scheme (GIAI), product identifier scheme (SGTIN), location identifier scheme (GLN), default EPCIS event ID prefix, require EPCIS eventID, default readPoint prefix.
- Remanufacturing & Quality: max refurbishment cycles, core return acceptance threshold %, inspection standard, certification scheme, scrap categorization scheme, quarantine hold days.

## Why This Approach
Gitless treats commits as complete snapshots, so a single settings snapshot per commit aligns with the existing version-control philosophy and mirrors the existing snapshot pattern (e.g., ArticleSnapshot). Anchoring settings history to Gitless commits keeps settings changes in the same history as other domain changes, enabling coherent timelines and cross-domain diffs when a single commit includes multiple updates. This keeps the design simple and avoids introducing a separate versioning system just for settings. We also avoid complex schema/version management for now; the focus is on a minimal global settings model with clear history, matching YAGNI while leaving room to add richer schema management later.

## Key Decisions
- System-wide settings (single global set), viewable by everyone; admins are the intended editors.
- Values are scalar-only (String/Number/Flag/Date); no structured JSON yet.
- Settings history uses Gitless: a save creates one commit on the current branch.
- Commits will include an author reference (Users) to show "edited by".
- One settings snapshot per commit (full bundle), with diffs computed between snapshots.
- Three settings pages: Circularity Strategy, Asset Tracking & Identifiers, Remanufacturing & Quality.

## Open Questions
- How will a commit author be chosen before authentication exists (default admin user vs explicit selection)?
- Do we want a standard commit message format for settings changes?
- Should settings always follow the current branch, or be pinned to a specific branch (e.g., main)?
- Do we need an explicit settings schema concept later, or is metadata kept with values?

## Next Steps
-> /workflows:plan for implementation details
