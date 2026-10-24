# Navigation reserved-slot backdrop — 2026-10-24

Local/unpublished style follow-up to Journey explore redesign. Base main `c668bb2e70c46e85c48c6dfeb4bad448579df2b7` plus preserved accumulated local changes. Existing read-only [backend preflight](journey-explore-redesign-preflight.md) remains applicable: no data/API/auth/permissions/Storage scope introduced.

## Actual target and change

Native Create screenshot `dist/journey-explore-redesign/nav-create-before.png` identified the extra full-width white rectangle behind the intended rounded navigation pill. MainNavigationFrame reserves bottom space for the floating pill; its outer root had no page backdrop. The fix paints only that shared outer root with existing `theme.background` and `theme.backgroundGradient`. The inner frame retains its existing flex layout and measured bottom reservation. The rounded pill, border, shadow, item labels, selected blue highlight, profile behavior, responder/touch geometry and safe insets remain unchanged. No page-specific edits or duplicate gradients added to the nested frame.

An initial interpretation removing the pill surface was manually reverted completely before this fix; no such change remains.

## Verification

- Existing Home/navigation suite31/31 passed,0 skipped. No new mirror style tests added for this low-impact change.
- TypeScript passed. Full zero-warning lint and whitespace checks passed.
- Actual application change only `src/components/floating-navigation.tsx`; documentation `PROJECT_STATUS.md`, `ROADMAP.md`, this report.
- Frozen source SHA256 `64bb5efb6a3ec47608a4ff2eefabdf7453076bc44563e4ca4d48c7abd88349e3`.
- No dependencies/environment/native-build/backend/hosted writes/Git operations/publication. Prior dirty work preserved; `.env.example` never read.

Native acceptance supplied by Architect: CPH2813 / Android16 existing Expo dev client/Metro8082, `dist/journey-explore-redesign/nav-create-after.png` confirms Create white band gone and intended pill intact. Journey uses the same shared frame by source inspection; no separate Journey device acceptance claimed. No permissions, GPS or data actions performed. Physical iOS/TalkBack/large-font acceptance pending; this change introduces no navigation/lifecycle/data behavior.
