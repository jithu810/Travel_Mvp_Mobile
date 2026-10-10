# Prompt 27 — Mobile Journey Story

Implemented in `D:\Travel_Mvp_Mobile` on 2026-10-08. The web project, existing Supabase schema/RLS, public-read transport, and persistent authentication/session foundation are unchanged.

## UI

The public detail route is now a Journey Story: cover-first hero, strong title, destination, creator initial/name/username, traveler tag and compact days/stops/likes metadata. A description section appears only when a public description is present.

Stops follow the creator's stored sequence in a slim connected timeline. Each stop conditionally shows day, photo, description and valid creator rating. Photos precede notes. The rating is explicitly a creator rating out of five, including valid zero/fractional values; it is not an invented aggregate review score. Missing fields leave no empty subsection. A missing cover is omitted; failed/unavailable photos gracefully fall back, and loading uses fixed-ratio frames with progress indicators to avoid image layout jumps.

The Journey Map placeholder is a compact informational row, with no fake map/geographic data or Mapbox dependency. Six future actions (Like, Save, Share, Use This Journey, Remix This Journey, Start Journey) are genuinely disabled and explicitly labeled as future functionality. No mutation or sharing action is performed.

## Deterministic snapshot parity

The small mobile snapshot reuses the exact supported rules from the web's `journey-intelligence.ts`:

- Filter invalid/duplicate stop identities.
- Derive active days from distinct positive day assignments only if every valid stop has one. Advertised journey duration does not infer active days or pace.
- Average stops per active day: at most 2 = Relaxed; at most 4 = Balanced; above 4 = Packed.
- Photo-rich / Detailed stops signals each require at least two qualifying stops and at least 50% itinerary coverage.
- Omit the snapshot when neither pace nor richness signals add useful context.

Geographic spread is intentionally omitted: the current mobile public model does not retain coordinates. No private GPS/travel-session data or road distance/time is inferred. No web files were moved, no shared package/monorepo was created, and no recommendation engine was added.

## File changes

Created:

- `src/components/journey/story-header.tsx`
- `src/components/journey/stop-timeline.tsx`
- `src/components/journey/story-extras.tsx`
- `src/lib/journey/snapshot.ts`
- `tests/story.test.mjs`
- `docs/journey-story.md`

Modified:

- `src/app/journey/[id].tsx` — Story composition; loading/error handling retained.
- `src/components/discovery/journey-photo.tsx` — Fixed-frame loading indicator and existing graceful fallback.
- `src/lib/discovery/model.ts` — Whitelisted public rating and stable sequence sorting.
- `src/types/journey.ts` — Nullable public stop rating.
- `README.md` and `AGENTS.md` — Current scope and verification documentation.

No new dependencies, package/lockfile changes, backend migrations, or new permissions.

## Verification

- TypeScript and ESLint pass.
- All 20 tests pass: 12 existing discovery checks plus 8 focused Story tests covering rating boundaries, privacy, stable stop order, partial-day omission, exact pace thresholds, photo/note richness thresholds, invalid/duplicate stops, and blank story/empty itinerary behavior.
- Expo Doctor: 21/21 checks passed. Expo dependency compatibility passed.
- Android and iOS Hermes bundles and the web bundle exported successfully. These are bundle checks, not signed native binaries.
- Six real, public, non-demo journeys were read anonymously using the existing RPCs; all selected detail responses were published. No writes/test records were created.
- Live browser flow verified Welcome → Discover → Search → Story, Discover → Story, and back navigation restoring the previous Search query.
- Real cover photos, stop photos, descriptions and ratings were verified. The public “1 day in Trivandrum” journey shows three ordered stops, ratings 4/5, 5/5 and 5/5, and the correct Balanced pace / 1 active day / Photo-rich / Detailed stops snapshot.
- The public Thenmala journey has incomplete day assignments; pace/snapshot is omitted appropriately instead of inferred from its advertised one-day duration. Its empty stop fields are omitted.
- Story layout checked at 390 × 844 and 412 × 915: document width equals viewport width, with no horizontal overflow. All six future action controls were verified disabled.
- Existing public-only gates still reject drafts/demo entries and discard private/session/GPS fields. Only the already-public stop rating was added to the model.

## Limits and field test

A physical iPhone/Expo Go field test was not performed in this environment; no native device test setup is available. Browser phone dimensions do not prove native safe-area, image-network, gesture, or scroll behavior. Please field-test: open from Discover and Search, go back, inspect cover/stop photos, descriptions/ratings, pull to refresh, and scroll to the disabled future actions. Sparse data was checked through real partial-day journeys and focused tests; production records were not edited to manufacture missing data.

Geographic spread and all map/travel/camera/offline/notification capabilities remain deferred. Existing dependency advisories from the foundation remain unchanged and should be reviewed before release. Nothing was committed or pushed; the mobile Git repository remains empty of commits.

Run:

```powershell
Set-Location D:\Travel_Mvp_Mobile
npm start -- --port 8083
```

The current browser verification preview is at `http://localhost:8083`.
