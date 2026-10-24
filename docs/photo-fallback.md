# Supplied fallback photo — 2026-10-24

Implemented locally after the completed no-change backend preflight in `photo-fallback-preflight.md`. Missing or failed Home covers and Journey stop photos share the supplied travel photograph, bundled as `assets/images/journey-photo-fallback.png`. Original bytes preserved: SHA256 `6DCE0FCE690E529BA8C1F810C73CBCC2A3895CD9AB15C7D7848766A7E5B4AF17` (3,510,090 bytes). No generated imagery or image edits.

Home displays **Explore journey**; Journey displays **See this stop**, as native white text over a dark scrim. Compact Home uses a smaller caption; expanded Home avoids repeating the destination over the image. Real titles remain in card content, and actual photo URLs, rendering and recovery branches stay unchanged. Accessibility explicitly identifies this as a default travel photo when the user's cover/stop photo is unavailable. Decorative image content is hidden from assistive technology under that label. The image/caption does not add another control: existing card tap/Read story behavior remains.

Checks passed: TypeScript, full zero-warning lint, focused Home/deck tests18/18, full suite569/569 and whitespace check. Independent focused18/18 and review reported no actionable findings. React checklist applied to semantic image labels, native text, no new hooks, direct imports and existing component/callback ownership.

Connected CPH2813, Android16, existing Expo SDK57 development client. Full Reload followed by **12 seconds** before `dist/photo-fallback-home.png`; compact Home image/caption inspected settled. Other native captures wait **10 seconds** beyond interaction/loading before inspection; expanded Home and Journey observations recorded below. Evidence remains ignored/local.

- `dist/photo-fallback-expanded.png`: expanded Home photo with readable Explore journey strip, destination/title remain below; capture shows existing list scroll clipping the image top. Frame and scroll geometry unchanged.
- `dist/photo-fallback-story.png`: supplied photo and See this stop strip in the native Journey deck; title/Read story, social rail and native map remain visible. No social action was activated.
- Phone returned to Home after Story verification; `dist/photo-fallback-final.png`. Broader existing-photo behavior is covered by automated regressions; physical QA focused on the requested default imagery.

No dependencies, native configuration, map/camera logic, auth, queries, storage, permissions or lifecycle changes. No live writes, native builds, server restart, commits, pushes or deployments. Prior compact-controls changes and unrelated untracked work preserved. Local/unpublished; publication needs explicit human action/target approval. iOS, TalkBack, large text, broader permissions/background/GPS regression and performance/memory profiling remain pending.
