# Home action labels — 2026-10-24

Local follow-up after `home-action-labels-preflight.md` released the no-backend-change gate. Home card Locate and Read story controls now show 28dp native icons with smaller 11px labels underneath. Each button has at least76dp width/56dp height; its minimum sizing and wrapping text allow growth at larger font sizes. The row uses4dp extra bottom padding, while the existing card measurement updates collapsed panel clearance automatically. No panel geometry was changed.

Locate retains its purple selected background/icon, now with matching text. Accessible labels/state and callbacks remain unchanged. The shared icon defaults to24dp, preserving World reset size. Supplied fallback image, actual photos, card titles and all prior Home refinements are preserved. React checklist applied to decorative icon hiding, semantic controls, native wrapping text, direct imports and unchanged hook/state ownership.

Checks: focused Home/discovery tests28/28, TypeScript, full zero-warning lint and whitespace checks passed. Independent focused66/66 and review reported no actionable findings. The previous full569/569 suite belongs to the preceding photo fallback checkpoint; no full-suite rerun for this scoped presentation follow-up.

Native CPH2813 Android16, existing Expo SDK57 client: Reload +**12-second wait** before `dist/home-action-labels-compact.png`; compact icons/titles readable and unobscured by Start your own journey or navigation. Subsequent action/expanded captures wait **10 seconds** each and are inspected after settling. Results recorded below.

- `dist/home-action-labels-locate.png`: Locate activates the existing real-stop camera fit; selected purple icon, label and card visible, CTA/nav clear.
- `dist/home-action-labels-expanded.png`: expanded card shown, action row under the existing fixed CTA until list scroll. Scroll attempt `expanded-scroll` ended compact; `dist/home-action-labels-expanded-reachable.png` shows expanded scrolling to the next card and icons reachable above CTA, but full label clearance remains unverified. No source defect established; retain this physical QA limitation.
- Story callback verified in focused tests; native Story tap was not repeated in this follow-up. Earlier compact-controls phone verification covers the unchanged callback. Phone left on Home; no further device QA per Architect scope.

No dependencies/native configuration/build/server restart/live writes/publication. Local/unpublished; previous dirty baseline and unrelated .github/, cd and eas preserved. iOS, TalkBack, large-font physical behavior and broad GPS/background/Travel regression remain unverified; permission/lifecycle code unchanged. Publication requires human action/target approval.
