# Create globe fills available space — 2026-10-24

Local layout follow-up after `create-globe-height-preflight.md` released the no-backend-change gate. The header retains its responsive base/minimum height and grows into actual native flex space when the keyboard is closed. New Quick Start's keyboard wrapper/page use natural height with shrinking enabled, so blank space formerly below Your drafts goes to the globe. This uses no measurement state or feedback loop. The renderer still measures its final viewport.

Short screens keep the existing minimum globe and shrinkable setup controls ScrollView; fixed Create CTA/draft siblings remain outside the controls scroller. The keyboard header disables flex growth and retains72dp usable height plus safe inset. Saved draft editor and data/save logic are unchanged. React checklist applied to unchanged hooks/callbacks and native flexible layout.

Checks passed: targeted Create51/51, TypeScript, full zero-warning lint and whitespace check. No broad full-suite rerun for this small presentation adjustment. Independent QA66/66 and review reported no actionable findings, including ready/keyboard screenshots; see task QA document.

Native CPH2813 Android16 existing Expo SDK57 client: Reload+**12 seconds**, navigate Create+**10 seconds**, inspect `dist/create-globe-height-ready.png`. Globe bottom increased from about502 to610 display pixels versus previous `create-edge-ready.png`; blank below drafts reduced correspondingly. Form, Create CTA, Your drafts and draft card remain visible above navigation. No title/destination/traveler data changed, existing draft opened or Create/save/upload/publish action activated.

Keyboard focus/return evidence recorded below. Local/unpublished. No dependencies/native config/build/server restart/live writes/publication; prior local work and unrelated untracked entries preserved. Physical iOS/short screens/large fonts/TalkBack and broader permission/lifecycle/GPS QA remain pending; layout/source tests do not replace physical coverage. Publication requires human action/target approval.

`dist/create-globe-height-keyboard.png`, captured10 seconds after focusing empty search:72dp usable keyboard hero, legal/status clear, full form/Create CTA visible above keyboard. Keyboard dismissed and phone returned Home afterward; no form input or save action.
