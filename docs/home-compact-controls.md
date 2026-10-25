# Home compact controls — 2026-10-24

Local presentation update, following the completed no-backend-change preflight in `home-compact-controls-preflight.md`.

- Home World reset is a native globe icon in a 34dp white disc within a 44dp button, positioned 16dp above the measured discovery panel. Mapbox legal branding stays in its existing top position. Other globe previews retain their previous control placement.
- Search uses a 34dp minimum painted surface in its existing 44dp focus target. Notification uses a 34dp painted disc and 18dp bell inside its existing 44dp presentation area; it remains a coming-soon image.
- Card Locate (Ionicons locate-outline) and Explore journey (MaterialCommunityIcons closed book-outline) actions use 28dp size-reserved @expo/vector-icons glyphs in 44dp targets. Labels, callbacks and selected accessibility state remain; Locate has a purple selected background/icon.
- No dependencies, native configuration, data contracts, permissions, GPS watches or lifecycle logic changed. Existing Journey/map routing and search behavior are retained. React quality checklist applied to stable hooks, direct imports, decorative accessibility hiding and semantic controls.

## Verification

- TypeScript passed, full zero-warning lint passed, focused Home/Create/discovery checks 92/92 passed, full suite 568/568 passed, `git diff --check` passed.
- Native connected CPH2813, Android 16, existing Journey Creator Expo SDK 57 dev client. Full client Reload then **12 seconds** before `dist/home-controls-ready.png`; inspected settled map/cards and compact header/controls. Subsequent interaction captures wait **10 seconds** each, beyond map flight duration, and are inspected for settled content.
- `dist/home-controls-locate.png`: crosshair activated the existing public journey map fit; selected purple control and selected card visible, real stops/route displayed, globe reset remains accessible above panel.
- `dist/home-controls-world.png`: globe button returns the camera to world scale while retaining the existing selected journey state. `dist/home-controls-story.png`: book icon opens the existing Journey Story screen. `dist/home-controls-expanded.png`: expanded panel leaves the globe button above cards and below the Mapbox legal row, with clear separation.
- `dist/home-controls-search.png`: thinner field focuses with keyboard and returns Kochi place suggestions. Screenshots/logs remain ignored local evidence. No Like/Save/Remix/Travel action was activated.
- `dist/home-controls-destination.png`: choosing Kochi dismisses search/keyboard and focuses its actual destination marker. Phone returned to collapsed Home/world scale afterward.
- Independent QA/review reported 65/65 focused checks and no actionable findings, including inspection of the settled captures; see `qa/home-compact-controls.md`.

## Limitations and approval

Physical iOS, TalkBack, larger fonts, extreme insets, keyboard on very small displays and broad background/GPS/Travel regression remain unverified. No location permission request, background tracking, live database writes, dependency installation, dev-server restart, native build or publication performed. Work is local/unpublished; commits, pushes, merges and deployments require explicit human authorization for the action and target.
