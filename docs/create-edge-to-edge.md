# Create edge-to-edge globe — 2026-10-24

Local presentation update after the no-backend-change preflight in `create-edge-to-edge-preflight.md`. New Create's globe extends to the screen top behind the system status bar, removing the former rectangular inset and upper rounded corners; lower corners remain curved. The hero adds the top safe inset to its adaptive height. Native globe legal/compass and preview camera padding reserve that inset.

The new Create route excludes the top SafeArea edge and owns light status icons with native Stack.Screen options. A fixed, noninteractive dark gradient covers the status region even during globe loading/fallback/auth loading. Existing draft editor routes retain top SafeArea and dark status icons; their separate draft map/editor logic is untouched.

Create's available World reset uses the same34dp painted globe disc/44dp button as Home. It remains visible without a selected destination, below legal branding. The keyboard hero retains72dp usable height plus safe inset and omits World to prevent legal/control overlap; regular hero has at least112dp usable height. Existing Home placement and24dp icon geometry are unchanged.

Checks passed: focused Create/discovery/globe98/98, TypeScript, full zero-warning lint and whitespace check. React checklist applied to hooks, decorative status overlay, semantic button labels, native focus ownership and unchanged editor callbacks. Independent QA113/113 and review reported no actionable findings. The focused tests exercise editor regressions with mocks; physical QA makes no saves or live writes.

Native CPH2813 Android16 existing Expo SDK57 client: Reload+**12-second wait**, navigate Create+**10-second wait**, inspect `dist/create-edge-ready.png`. Globe renders to top behind readable light status icons, legal branding remains clear and initial globe reset visible. Keyboard/return evidence recorded below. No draft opened, title/destination/traveler edited, Create/save/upload/publish action activated, permission requested or live write performed.

- `dist/create-edge-keyboard.png`: empty destination search focused; keyboard open, compressed globe legal row remains below status icons, World hidden, form/CTA visible above keyboard.
- `dist/create-edge-return-home.png`: keyboard dismissed and Home selected, after10-second settling wait. No form data edited or saved. Focused new/draft native status-option tests passed; anonymous/loading/map-failure behavior remains source-reviewed, not physically forced.

Local/unpublished. No dependencies/native configuration/build/server restart/publication. Preserve all previous local Home/fallback/labels work and unrelated .github/, cd and eas. Physical iOS, auth-loading/map-failure transitions, extreme cutouts, TalkBack/large fonts and broad GPS/background regression remain pending. Publication requires human approval of action/target.
