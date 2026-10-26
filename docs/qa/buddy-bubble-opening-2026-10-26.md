# Buddy opening and zoomed-map correction - 2026-10-26

## Scope and result

Mobile-only bug correction from clean baseline `aeadc1a99ca54e6fdb4af1c1392fdf8e870220ea`, branch `codex/buddy-bubbles-outdoor`. No backend, dependency, native configuration, permission, or environment-file edits. User authorized commit, branch push and PR creation with "can u push the code"; no merge, manual deployment, native build/install or live data write is authorized.

The old placement search sampled only corners and centers of free areas, missing valid gaps. It now checks obstacle-edge candidates after preferred placements fail, retaining Buddy, bubble and tail collision checks. Closed bubbles skip searches; active results are memoized to avoid repeated dense-map scans.

Manual help searches safe above-Buddy placements. If none exists, the same content opens in a dismissible native dialog instead of flipping below or showing an ellipsis. The dialog retains guarded actions, tour, scrolling, close, backdrop dismissal and Android Back. Walking pauses. Automatic reactions remain anchored and cannot open the dialog. No map zoom, selection or pin/control protection is changed. Captured zoom geometry has no safe standalone 128x124dp region, so narrowing alone cannot solve that state.

## Validation and independent review

- Final regression QA: 128/128 pass, zero failures/skips (Buddy36, floating28, Story8, Story interactions56). Independent Code Reviewer separately confirms 64/64 Buddy/floating regressions pass. Includes actual zoom geometry, above-only preference, below-only-space dialog, close/Back, tour, stale callbacks, automatic reaction restrictions and closed-render search avoidance.
- Mobile checkout lacks its TypeScript dependency. Tests run from its current source using an in-memory import pointing to the existing JBuild TypeScript installation; no package installation or on-disk test-import changes.
- Final three application files synced into existing D:/JBuild. Full JBuild `tsc --noEmit` and zero-warning ESLint of these three app files pass. This does not establish full Mobile-checkout type/lint validation.
- Git whitespace check passes. No new native dependencies; existing development client receives the code through Metro.
- Independent final reviewer reports no actionable findings on this exact snapshot:
  - geometry.ts SHA256 `62E317B3AC8698CE3B1F40DD0C553E2F2DA71126D2074670E3F15EA7A7153431`
  - journey-buddy-host.tsx `9A369C7494DD70D2F924E149274B67F33B821DB74162D206E0C9DB748B57AB29`
  - buddy-help-sheet.tsx `532A1AE1ED5FC38389E82EA7D3E35803F0F476F0CD056F569A2670E55CFAEFD0`
  - journey-buddy.test.mjs `802CDCF4B3AC13E4882D25A6F2B0CBE28F2141605B5DAF4D356FCA3313B4248A`

## Physical Android and connection findings

CPH2813, Android 16, 1080x2344, density override480, font scale1.0. Development app: `com.sree8100.journeycreatormobile`; existing Outdoor variant also installed.

Owner reported prior connection to another laptop. Recreated the phone's8081 reverse tunnel from this laptop. Existing Metro subsequently proved down; started a fresh IPv4 Metro from D:/JBuild. Phone visibly downloaded its bundle; local established connections and inspector registration confirmed the active runtime. The prior tunnel target was not independently identified. An empty inspector list alone must not be treated as proof of no app connection.

Initial Metro disabled dotenv under the repository's direct/indirect-read prohibition. Owner later granted a narrow exception for Expo automatic environment loading ("yes please"), without opening files or exposing values. Restarted this session's Metro with normal automatic loading and cleared its bundle cache. Maps and public journeys restored. No environment file was edited or inspected. No rebuild was needed or performed; the initial rebuild proposal was withdrawn.

Before the final zoom correction, native configured Home showed the full bubble with both actions and tour steps1/3 and3/3. Screenshots remain private local evidence (`bubble-home-final.png`, `bubble-map-tour.png`, `bubble-position-final.png`). They are not published or remotely accessible proof.

Final above-only/dialog files are synced into the running Metro copy. The phone was locked at publication verification, so the final dialog/above-only behavior, dismissal/Back, complete tour, geometry transitions, TalkBack, large fonts, iOS and active-GPS behavior remain physically unverified. Automated tests do not substitute for those checks. Publication uses a draft PR with this limitation explicit.

Temporary numeric console/alert diagnostics were removed. Only the seven scoped source/test/status/report files are included. No standalone issue, Notion update, production deployment or live Supabase operation was performed.
