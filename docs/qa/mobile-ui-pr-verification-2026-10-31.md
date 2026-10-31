# Mobile UI PR verification - 2026-10-31

Owner authorized publication with "create a PR" after verifying and approving the pages. Scope is one PR containing the existing app-wide dark-theme commit `0c5743b` plus the subsequent layout, Buddy loop, regression checks and approved-design documentation. Current base `origin/main` is `f772f23`; earlier backlog/auth changes were already merged through PR29. No merge, production deployment or live Supabase change is authorized.

## Implementation and preservation

- Dark presentation throughout existing Mobile screens, from the earlier independently checked dark-theme work.
- Equal-height fixed Journey/edit/selected-preview cards, measured map/footer/nav spacing, edge-to-edge maps behind status icons, compact guidance and remix credit. Public fitted cards are300dp; edit and selected-preview cards remain328dp.
- Transparent vertical editor action column, restored selected-preview bottom navigation, and no vertical scrolling in the approved normal portrait composition.
- Last-card forward browse loops to first with existing Buddy jump art and direct gentle camera/Buddy return. Cancellation, reduced-motion and Travel camera guards retained.
- Owner design baseline and explicit approval rule in `docs/approved-mobile-ui.md`, linked from `AGENTS.md` and startup status. Button/icon/image/copy/animation requests do not authorize layout or scrolling changes.
- Read-only repository backend assessment: presentation/local animation only; auth/persistence/query/API/RPC/Storage/GPS contracts unchanged. No live preflight or backend changes needed for these UI changes. Existing disposable PostgreSQL tests were run locally; no live project used.

All pre-existing dirty work was preserved. The checkout was clean at the start of this UI task on `codex/app-wide-dark-theme`; current changed files belong to the requested UI work and reports. No unrelated Web work is included.

## Automated checks on final application snapshot

Full `npm test`:1005 tests,1002 pass,3 initial failures. Each initial failure has been resolved and rerun:

1. Home fallback harness lacked the mobile-theme dependency introduced by the earlier dark-theme commit. The fixture now supplies `appMobileTheme` from the existing helper; assertions and application code are unchanged. All28 tests in `journey-buddy-floating.test.mjs` pass.
2. Two existing disposable PostgreSQL checks could not create a restricted Windows process token inside the sandbox. Both passed outside the sandbox using fresh checkout-local clusters, loopback-only random ports and synthetic fixtures. `email-registration-backend.test.mjs` plus `thumbnail-policy.test.mjs`:6/6 pass, including both formerly failing cases. Clusters are stopped by the test cleanup.

All1005 full-suite cases are therefore covered by passing results across the full run and targeted reruns; no single clean full-suite rerun is claimed. The app snapshot did not change after the full run; only the missing test-harness dependency was corrected.

`npm run typecheck`:pass. `npm run lint` initially included stale ignored `.local-tests` copies and failed on those old artifacts. `npx eslint . --ignore-pattern '.local-tests/**' --max-warnings=0`:pass for the actual repository. No files were deleted and lint configuration was not changed. `git diff --check`:pass; Git reports legacy line-ending normalization warnings only.

No new dependency, native build or package installation. A native rebuild was not needed for the scoped JS/style changes. No deployment used as a substitute for local checks.

## Review and device evidence

Independent Code Reviewer reviewed the stable application diff and final fixture correction with no remaining actionable findings. Three earlier animation findings were corrected and re-reviewed: interrupting a loop must not disable later Buddy walks, Reduce Motion must stop an active native camera animation, and Fit must cancel pending loops.

Owner reports checking and approving the current pages. Architect device checks used CPH2813 / Android16 /1080x2344 and the expected Mobile checkout through Metro8081. Original/remixed Story, saved-draft editor and selected-preview states were inspected during the task; vertical card drags remained fixed, required controls stayed visible, and native frame captures showed last card ->jump ->first card and map return. Full-story text remains accessible from Read story. Evidence paths and detailed checks are in the individual QA reports; scratch captures are local files and are not public evidence URLs.

Physical evidence is limited to one phone. Broad multi-phone/orientation/font compatibility is not claimed. Existing short-screen/enlarged-text/error fallback scope was preserved; any future new/broadened scrolling or redesign requires owner approval.

## Publication boundary

This report is prepared before the single authorized branch push and PR creation. Local/unpublished notes in earlier task reports are historical checkpoints; the resulting PR and its head revision are the canonical publication record. No automatic merge is enabled. Merge into main and any production deployment still require separate owner approval naming the PR/branch.
