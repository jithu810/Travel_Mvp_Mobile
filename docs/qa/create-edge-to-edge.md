# Create edge-to-edge globe QA and independent review

2026-10-24, QA Tester / independent Code Reviewer. Baseline main 65ae609057af6e44649b7374c776b92a6114a2f0 plus preserved local Home controls, labels and photo fallback work. Backend delta preflight completed before implementation. No application edits, saves, uploads, publication, deployment or hosted mutations by this reviewer.

## Independent checks

- Home/create-flow: 66/66 passed; discovery-globe/camera-motion: 47/47 passed. Total 113 passed, zero failures/skips. Save/auth assertions execute mocked fixtures only.
- Whitespace check passed (existing LF/CRLF notices only).
- Independent review: no actionable findings. New Create omits top safe edge and selects light native status icons; draft route retains top safe edge and dark native status icons. Header adds measured top inset to hero height, camera padding and legal/compass positions. Noninteractive dark status shade remains above loading/map background.
- Preview World shares the Home globe icon and 44dp target, lower left. It is hidden below 112dp usable hero height, including the 72dp keyboard state. Home retains its measured panel reset offset; non-preview reset behavior remains scoped.
- Creation payload, save/auth guards, explicit-save semantics, media and query code are unchanged. Native draft-route behavior is covered by mocks/source review, not a live draft edit.

## Snapshot SHA256

| Path | SHA256 |
| --- | --- |
| src/app/create.tsx | 9CABDEA36581F26C850E531FBA119344B4FC54F0E25A7494E555013016B4A3C1 |
| src/components/create/create-journey-header.tsx | 5C9B15557A26638C7A718EEEF69099E47FE55676B40E14AA56CAE8B474BB8479 |
| src/components/discovery/globe/native-globe.tsx | 00193E16B3B7AE812EADBF2824AB514C312D15C2E644C5318FE0992D9DAA2184 |
| tests/create-flow.test.mjs | F79EFD81B844CE2AC3E681F17341F34B46AFD421352D13B742B1E6C4EE5F8188 |

## Native evidence

Independently reviewed `dist/create-edge-ready.png`: globe/space background extends behind light system time/battery, no pale top band; lower-left World globe icon and Mapbox logo/legal visible; form and fixed bottom navigation intact. Writer-operated existing CPH2813 Android 16 Expo development client, full Reload followed by a 12-second loading wait. Exact build ID, permission grants and GPS state were not independently collected.

Independently reviewed `dist/create-edge-keyboard.png`: empty destination field focused with keyboard visible; hero contracts, World hides, status icons remain legible and form controls fit above keyboard. No field changes or saves required. Home-return media pending; Home regression tests passed.

This reviewer inspects screenshots and does not operate the phone. iOS, TalkBack, large text, extreme cutouts, native draft screens and offline/loading failure variants remain unverified. No live saves are authorized for this QA.
