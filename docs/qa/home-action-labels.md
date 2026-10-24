# Home action labels QA and independent review

2026-10-24, QA Tester / independent Code Reviewer. Baseline main 65ae609057af6e44649b7374c776b92a6114a2f0 plus preserved local compact-controls and supplied fallback changes. No application edits, publication, deployments or hosted writes by this reviewer. Only this QA report is reviewer-owned.

## Independent verification

- `node --test tests/home-polish.test.mjs tests/create-flow.test.mjs`: 66 passed, zero failures/skips.
- `git diff --check`: passed; existing LF/CRLF notices only.
- Independent review: no actionable findings. Home action icons opt into 28dp visual scaling; default World icon remains 24dp. Visible Locate and Read story labels retain descriptive parent accessibility labels and existing callbacks. Selected Locate retains background/icon/label color and accessibility selected state.
- Action targets have minimum 76dp width and 56dp height, with wrapping 11dp labels and 4dp bottom row padding. Card onLayout still reports measured height, preserving existing panel clearance logic. No fixed card height or panel logic change introduced.
- Existing supplied fallback, valid/failed image recovery, search/globe logic and data calls are unchanged.

## Stable SHA256

| Path | SHA256 |
| --- | --- |
| src/components/discovery/home-journey-card.tsx | E574C896FCDC78D6D49475C717029CA942CF43F59B276A862DC8F430C109203B |
| src/components/discovery/home-control-icon.tsx | 03F4C7FA38C0DFBCD0D0EFB32ED426D6E16C5587658395AD2A0BA0673E105335 |
| tests/home-polish.test.mjs | 6BFA4596C4473A9CFDB9658D861F866D097B0D6947E7E9D7EFE72FC5D8A3B200 |

## Native evidence and limitations

Independently inspected `dist/home-action-labels-compact.png`: larger icons and centered labels are visible, with clear space above fixed CTA/navigation. `dist/home-action-labels-locate.png` shows selected purple icon/label/background and mapped stops. `dist/home-action-labels-expanded.png` shows expanded card and unchanged World/legal/header separation, but its action row is under the fixed CTA at that scroll position; scrolled expanded action visibility needs additional evidence before claiming that device check passed.

`dist/home-action-labels-expanded-scroll.png` actually shows a collapsed panel, so expanded scroll clearance remains pending. Architect ended further device loops because concurrent phone input may interfere. No source defect is established; automated clearance regressions pass.

Native evidence was supplied from the existing CPH2813 Android 16 development client; writer waited 12 seconds after Reload for compact capture. This reviewer inspects supplied media and does not operate the phone. Exact build identifier, permissions and GPS state were not independently collected. TalkBack, large font, iOS, landscape and extreme layout coverage remain pending. No live database writes are needed for these checks.
