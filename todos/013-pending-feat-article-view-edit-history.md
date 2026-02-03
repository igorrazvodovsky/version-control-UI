# Todo: feat article view/edit history

- [x] Review existing version control syncs, branch/commit concepts, and web article UI patterns
- [x] Backend: extend Branch metadata (base commit + status) and update specs/tests
- [x] Backend: enforce branches-from-main creation + store base commit; hide merged branches
- [x] Backend: update /version-control/commits to merge branch into main; mark branch committed/hidden
- [x] Backend: add new API endpoints for branch list/current/changes
- [x] Backend: add history endpoint /articles/:slug/history (main history on edit branches)
- [x] Frontend: add article detail route + fetch/view article
- [x] Frontend: edit form with autosave to working copy (debounce/blur) + saving status
- [x] Frontend: branch tab with branch selection + change list + branch status
- [x] Frontend: history tab (main history, unmerged empty state if needed) + errors
- [x] Frontend: autosave flush on branch switch + branch switching behavior
- [x] Tests: update version control sync tests + add history/change list tests
- [x] Tests: update web data-fetch tests (if any) and run relevant suites
- [x] Update plan checkboxes for completed items
