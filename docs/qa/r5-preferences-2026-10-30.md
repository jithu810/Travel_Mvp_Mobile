# R5 preferences usability slice — 2026-10-30

Scope: large text, scrolling and touch targets in Account's travel preferences. Focused tier; Architect implementation and self-review. Broader R5 remains open.

## Baseline and backend assessment

- Mobile: `feature/backlog-phase1`, HEAD `ca2ce8d490ec1716e6ed9676ca71ab85fc21e4e1`. Existing modified files: IMPROVEMENT_BACKLOG.md, PROJECT_STATUS.md, ROADMAP.md, account/create/discover/search screens, buddy-intro/journey-buddy-host, use-journey-buddy, help-actions/model, and create-flow/home-polish/journey-buddy/profile-ui/search-explore tests. Existing untracked B2/B3/U8 reports, preferences component/hook/model/store/tests and first-outcome component/model/tests are preserved.
- Web: `codex/mobile-backlog-guidance`; three untracked Supabase `.temp` directories. No Web writes.
- Inspected `src/components/buddy/travel-preferences-settings.tsx`, `src/app/account.tsx`, `src/components/profile/profile-styles.ts`, and `src/hooks/use-travel-preferences.ts`.
- UI-only gate released: change preference control dimensions and wrapping only. Existing callbacks, storage, account masking, authentication, data contracts, RPC/API and Storage access remain unchanged. No live Supabase preflight required; no live writes authorized.
- Checks: existing preference behavior tests, scoped lint and diff review. Physical check at normal and enlarged text, scroll to editor and final actions, cancel edits. No saving or forgetting needed.

## Findings and verification

- Preference controls had a 44-point minimum height. Increase to 48 points in both dimensions; constrain flexible row children to available width so enlarged labels wrap within their control.
- Seven existing preference behavior tests pass; scoped ESLint and tracked diff whitespace checks pass. No new static-style tests or full suite/typecheck: no contracts changed. Self-review found no callback/state changes; no independent specialist review required for this isolated style change.
- Physical device: owner handed phone to Codex; CPH2813, Android 16, 1080×2344, override density 480 (360dp width), native development client, laptop Metro 8081 confirmed serving `D:/Travel_Mvp_Mobile`. Wi-Fi adb connected at the owner-supplied endpoint. No GPS/permission changes or emulator checks.
- Normal text 1.0: neutral state and disclosures readable; editor shows all interests, pace choices, Save and Cancel; sheet scroll reaches Sign out. Controls visually have separate non-overlapping bounds. Minimum 48dp height/width established by source; native accessibility bounds unavailable because UIAutomator could not reach idle state.
- Text 2.0: Android configuration change restarted the app; reopened Account settings. Heading/close and disclosures readable; all interests fit, pace choices wrap onto a second row, Save and Cancel remain fully readable/reachable. Selected temporary Nature/Relaxed choices and cancelled; neutral summary returned. No preference save/forget or hosted write performed. Scroll to bottom and back to heading succeeded; close button responded.
- Restored original font scale 1.0 and verified the setting. Temporary screenshot on phone removed. Evidence images in `C:/Users/sreej/AppData/Local/Temp/journey-r5`: normal.png, edit-normal.png, large-settings.png, large-edit.png, large-cancel.png, large-top.png. Screenshots include account information; kept outside the repository.
- Preferences slice complete. Broader R5 remains unchecked: TalkBack, performance/resource measurement, reduced motion, other supported screens and device matrix were not tested. Existing bottom-navigation labels split across lines at 2.0 (also recorded previously); no scope expansion into shared navigation.
