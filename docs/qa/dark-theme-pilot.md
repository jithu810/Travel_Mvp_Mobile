# Dark-theme pilot implementation - 2026-10-31

Local/unpublished. Owner authorized a Home and public Journey Story preview. Baseline: `feature/backlog-phase1`, `87b127a`, clean tracked/untracked Mobile tree before this task. Architect upgraded verification to major shared presentation because the two routes render shared components. Mobile Developer owns implementation; Architect owns phone evidence and status/roadmap; separate QA/review have their own records.

## Backend-impact assessment

Inspected `src/app/discover.tsx`, `src/app/journey/[id].tsx`, `src/components/floating-navigation.tsx`, `src/theme/mobile-theme.ts`, and their presentation components. Only presentation styles/status-icon colors change. Data contracts, auth/authorization, persistence, RPC/API calls, Storage access, navigation targets, GPS/lifecycle logic and dependencies remain unchanged. No live Supabase preflight or writes needed/performed. No native rebuild required.

## Implementation

`src/theme/dark-pilot.ts` restricts the preview to `/`, `/discover` and individual `/journey/:id` routes. Hooks select cached dark variants using an explicit foreground/background/border role table, leaving original shared style objects untouched. Nonpilot routes receive their original style identity. This temporary adapter is intentionally a pilot, not an app-wide preference system; no Light/Dark/System control or persistence is added.

Home panel/cards/search/results/banner/help, its navigation, Story deck/captions/creator/footer/About/stop viewer/options/itinerary and shared loading/error presentations adopt dark navy surfaces and bright readable text. Photos, generated artwork, globe and map styles, primary gradients and white photo-overlay text stay unchanged. Globe reset and native journey-map Fit deliberately retain dark glyphs on existing light map-control faces. Exported share artwork remains light while surrounding share instructions/feedback adapt to dark.

## Checks

- Initial affected component/interaction suites: 208/208 pass.
- Additional affected suites plus pilot and independent QA regressions: 183/183 pass. Combined distinct checks across these two commands: 391/391. Coverage includes route changes/light fallback, cache reuse/no mutation, palette contrast (normal text/muted/accent/link >=4.5:1 across pilot surfaces), image/gradient preservation, Home sheet gestures, Story/map modal lifecycle, sharing and original-photo consumers.
- TypeScript `tsc --noEmit`: pass on final implementation.
- ESLint all changed TS/TSX/MJS plus new implementation/test/helper: pass, zero warnings.
- `git diff --check`: pass. Git's CRLF conversion warnings are not whitespace failures.
- One broadened full run: 989 tests, 964 pass, 25 fail. 23 were missing new adapter harness dependencies or stale assertions and are covered by the final passing affected reruns. Two unrelated isolated PostgreSQL tests could not start under the sandbox (`pg_ctl` restricted token error87): `tests/email-registration-backend.test.mjs`, `tests/thumbnail-policy.test.mjs`. Architect may retry those outside sandbox; this note does not claim a fully passing final full-suite run.
- Existing standalone harnesses now execute the actual adapter in light mode for their unaffected-route checks. Fixed previously stale rail44px assertion to existing48px R5 minimum and supplied existing StorySheet motion hooks to its incomplete harness; no application behavior changes for these fixes.

## Boundaries

### Architect verification, 2026-10-31 19:35 IST

Physical CPH2813/Android16, Codex Metro8081 serving travel-mvp-mobile, existing Journey Google Test client, wireless endpoint192.168.1.2:42501. Observed dark Home panel/cards/banner/navigation, readable search hint, corrected dark Help, public Story with rendered satellite map and dark caption/footer/navigation, readable About sheet. Navigating to Search restores light surfaces/navigation. Photos/art/map palette preserved. Screenshots are local temporary files under C:/Users/sreej/AppData/Local/Temp/dark-pilot-*.png, not published evidence. No saves/likes/remix/uploads/trip activation performed. Share export and full modal/large-text/iOS matrix were not exercised physically.

Independent QA passed8/8 checks after fixing Help and Share contrast. Independent Code Reviewer found no actionable defects in the stable diff (base87b127a). Architect found a loading-only Story status-icon contrast issue; the outer public Story screen now owns light status icons for loading/error/unavailable states. Final Story interaction67/67, TypeScript and scoped lint pass; independent targeted re-review has no actionable findings. Final distinct affected test total392 (391 plus the new loading-state regression). The final loading-only status correction is test/review verified; no separate transient loading screenshot was captured after correction.

Both unrelated PostgreSQL sandbox failures pass on isolated escalated local retries: thumbnail-policy1/1 and email-registration-backend5/5. No hosted database touched. The initial full run and focused correction runs remain separate evidence, not a claimed single final full-suite run.

Physical checks and independent review are reported by Architect/QA separately. This implementation record alone is not device evidence. Other pages stay light, and light/dark transitions are expected while moving out of the pilot. No iOS or full large-text/device matrix claim. No commits, push, merge, deployment, dependency upgrade, account action or hosted write performed by Mobile Developer.
