# Adaptive Create globe height QA and independent review

2026-10-24, QA Tester / independent Code Reviewer. Mobile main 65ae609057af6e44649b7374c776b92a6114a2f0 plus preserved earlier local UI work. Backend scope-delta preflight completed before implementation. Only this QA report written by reviewer; no application edits, hosted writes, publication or deployment.

## Independent verification

- `node --test tests/create-flow.test.mjs tests/home-polish.test.mjs`: 66 passed, zero failures/skips. Save/auth fixtures are mocked.
- `git diff --check`: passed, existing LF/CRLF notices only.
- Independent review: no actionable findings. Closed-keyboard hero flexGrow consumes spare space, keyboard state turns growth off. Quick-start wrapper/page use natural height and flexShrink instead of filling remaining space. Existing minimum hero, internal form ScrollView, fixed create action and horizontal draft rail remain.
- No measurement feedback loop introduced: onLayout only updates renderer viewport when dimensions change; header growth does not derive from viewport state. Existing draft/editor branch, saves, uploads, data contracts and Home behavior unchanged.
- Small-screen and larger-content fallback is existing shrinkable setup with internal scroll; extreme dimensions/large fonts remain device-unverified, and mocks do not execute native Yoga layout.

## Snapshot SHA256

| Path | SHA256 |
| --- | --- |
| src/app/create.tsx | E36584895F3AB39B210620D1F8D57A37975251883D6233FE4AE099AB2D7B999E |
| src/components/create/create-journey-header.tsx | 5280E79A5BEC0835A39DBDBDA164A732F134D5E46A47E93AA4A0198531AE382D |
| tests/create-flow.test.mjs | BE6E1D4562F81DD29184303DC4F2D3A8DFEA33CE7C6DB919F127C48F2A9A993D |

## Native evidence and limitations

Independently reviewed `dist/create-globe-height-ready.png`: taller globe uses prior blank space, form and draft rail remain entirely visible above navigation. Edge/status/World/legal presentation remains intact. Writer reports approximately 110 screenshot pixels transferred from blank space to globe. Existing CPH2813 Android 16 Expo development client; writer-operated capture after loading delay. Exact build ID, permissions and GPS state not independently collected.

Independently reviewed `dist/create-globe-height-keyboard.png`: empty destination field focused; hero returns to compact height, World hides, form and fixed action remain above keyboard. Draft rail is hidden during keyboard use as before. Home-return media pending; Home regressions passed.

Reviewer inspects supplied screenshots and does not operate phone. Large text, short landscape screens, iOS, TalkBack, offline state and native draft editor remain unverified. No live saves needed or performed for QA.
