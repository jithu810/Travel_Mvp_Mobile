# Journey map and stop deck QA / independent review

QA Tester and independent Code Reviewer, separate from implementation writer. 2026-10-23 08:49 IST (03:19 UTC). Local/unpublished. Backend preflight: docs/journey-deck-preflight.md.

## Stable snapshot

Repository D:/Travel_Mvp_Mobile; branch codex/home-photo-fit; HEAD aba76832ce967503caf5d8692faf019ed3f583ca plus listed changes. Architect released stable snapshot before checks. Existing Home work, status/roadmap and untracked baseline preserved. SHA256 inspected after automated checks:

| Path | SHA256 |
| --- | --- |
| src/app/journey/[id].tsx | 095BCA2690F355A6E3A4FC5EC5D000CF1FB0BEFC0501EC9A7A06A12B515A53AE |
| src/components/journey/stop-timeline.tsx | 826C463DC5520E93E32727F6DFCC8D1FC32A1D364D53C9422B7C2A0A6A36EF82 |
| src/components/journey/stop-card-deck.tsx | F5C136712DF503A2929B973FAEA2104F80E980D8C4D52E47562DDD9578874E67 |
| src/components/discovery/home-journey-card.tsx | 049F1508900BD0BF37AAE94FF5B566CACFB935D99A765B4BBF7B66219956A664 |
| src/components/discovery/travel-photo-placeholder.tsx | E6401ADEC1C3D8083D0573F02E5B4331D6B8AEC4D808DFFA7A934306501C6B91 |
| tests/stop-card-deck.test.mjs | 5B5B8A2B96E88CBDDBF97AB0A76B9B8EA358AA2733FC2C95F56D6B5AE3D99E7C |
| tests/home-polish.test.mjs | FF8D09E4059422CE1622BF0F9701C2C7497C5695D38ED451020532C4109DF0DB |
| tests/story-interaction.test.mjs | 10B43BB795C6C5B0206517E0B7C5FEB6854DB9309E78BC8BF94A93C41E1400F3 |
| tests/map.test.mjs | 8ACE5BA29F8C6231C33808A024BA2A8CE610C0CAB769A204E400B5A858A2A00C |

## Checks actually run

- npm test: **562/562 passed**, zero failed/skipped/cancelled.
- Focused stop-card-deck, home-polish, story-interaction and map tests: **74/74 passed**.
- npm run typecheck: passed.
- npm run lint: passed, max-warnings=0.
- git diff --check: passed; existing status/roadmap LF-to-CRLF warnings only.
- Offline npx expo install --check: dependencies up to date; CLI explicitly warns validation unreliable offline. No packages installed/upgraded.
- Offline Android export to ignored dist/journey-deck-qa/export: passed, 1617 modules, 4.4 MB Hermes bundle. No native app build/deployment; running development server not restarted/stopped by QA.

## Independent review

**No actionable findings** in the recorded snapshot. Inspected page layout/options, StopTimeline routing, complete new StopCardDeck lifecycle/gestures and shared fallback/Home extraction, plus changed tests and surrounding selection/data contracts.

Deck tests execute component lifecycle with mocked native primitives: forward/back horizontal dominance, first/last and zero/one stop boundaries, immediate reduced motion and stale animation rejection after map selection, background, termination, inactive presentation and unmount. Selection is still callback-based over loaded stops; no reordering/persistence, backend access or write behavior added. Animated completion generation invalidation prevents stale changes. Accessible previous/next alternatives remain; decorative rear cards exclude accessibility/pointer events. Vertical gesture dominance remains for parent scrolling; physical arbitration requires device evidence.

By inspection, StopPhoto uses cover in 16:9, missing/failed URI uses local art, changed URI recovers without original-object mutation. Shared art behavior remains covered by Home tests. The actual StopPhoto image decode/error lifecycle is not separately device-verified. Existing private vertical timeline and nonstacked horizontal path retained. Options still expose About; full map/story/social/Travel entry remain available. Page removes visible header/back control as requested; platform navigation/bottom tabs provide exit. No schema, auth, permission, map renderer or upload implementation changes.

## Native evidence and limits

Architect/root controls connected CPH2813 Android 16; QA specialist did not operate the device. Root reports existing development client, before/after captures under ignored dist/journey-deck-qa. Root observed map-first layout, rounded lower map corners, visible Mapbox attribution, full-map/options controls, full-bleed real photos, shared no-photo art and actual image-backed rear cards. Root also reports concurrent owner navigation, so not all inter-capture selection changes can be attributed to its own swipe.

Specialist independently viewed previous-settled.png: confirms new curved map, attribution and layered photo card, but visible development Refreshing banner means this is **not** clean settled-screen acceptance. Other screenshots were reported by root, not independently inspected here. Artifact files can contain private journey/location details and remain local/ignored.

Pending exact device evidence: clean settled capture; explicit previous/next and left/right swipe transitions with selection/map agreement; first/last bounds and vertical scroll to controls; options/About/full-map/story close-return; TalkBack, enlarged fonts, reduced motion and background/blur during animation; iOS. Root may append its further exact device results. No permission/GPS state, network quality, native build identity or GPS behavior inferred from screenshots. Travel Mode/navigation field behavior is outside this redesign and not claimed verified.

No live saves/copies/likes/uploads/deletes, hosted schema writes, dependency updates, phone/server actions, commits/pushes/merges, deployments or external publication performed by this assignment. Only this report written; export output generated under owned ignored export subdirectory.

## Social photo rail delta: QA and independent review

2026-10-23 09:01 IST (03:31 UTC). Same branch/HEAD; Architect released stable delta before tests. Final hashes reconfirmed after checks (supersede corresponding rows above):

| Path | SHA256 |
| --- | --- |
| src/app/journey/[id].tsx | E0F0C7620CC0E46EB4B78C9346FE26F27D5D590641DBA0EFC5090FC70996DF90 |
| src/components/journey/stop-timeline.tsx | 4FB56D6A602D306C017E8FE83B4F0D0622DBEB79FA0AC983E6A29DAA598C833F |
| src/components/journey/stop-card-deck.tsx | 3ACA7307C9B61DAB1E4F35D0518811E4F673AD556EC8DAEEF443371FF71F30C5 |
| src/components/journey/social-actions.tsx | D2244F0544E45643C46715C0347ADBAF4724353FFBEE5A4D1E0FE05ADC240C48 |
| tests/stop-card-deck.test.mjs | C43B0EF7FC0FBA519DA61002F8DD722F42FC1F75E02E30CB911700CCB2D72936 |
| tests/share-artwork.test.mjs | 4F605BF2F89407CAF2F15FA48DC97536704C6BE6B23AD21FC3E2EA96F1F37143 |

Checks actually rerun: npm test **563/563 passed**, npm run typecheck passed, full npm run lint passed max-warnings=0, focused stop-deck/share-artwork **8/8 passed**, git diff --check passed (same status/roadmap line-ending warnings). Other listed files retain earlier snapshot hashes. No native export/dependency rerun for this styling/slot delta; earlier successful export/compatibility check refers to preceding deck snapshot.

Independent review **no actionable findings**. Exactly one SocialActions element passes through page -> StopTimeline -> StopCardDeck photoActions slot. It remains mounted once in the active card, not repeated in decorative rear cards; the zero-stop branch retains the slot. Existing auth, deferred intent, social controller/write logic and selectedMemoryId share construction are unchanged; selection updates the current prop without a stop-specific remount key. Share tests confirm selected-memory snapshot and rail retains exactly the three intended actions. Existing error/feedback remains available in StorySheet with status trigger.

Rail wrapper is a sibling of photo swipe/read surface, outside caption swipe/read surface and every read Pressable; buttons therefore are not nested inside a read button or the custom PanResponder surface. Empty-state social access retained.44x44 minimum controls and three-button column use138dp including gaps; font scaling limited to1.2 for these compact labels. Feedback trigger sits to the left instead of adding height. Typical320dp viewport has roughly288dp card width/162dp photo height, enough for rail plus6dp top inset. Narrower/unusual layouts and physical gesture arbitration remain native acceptance, not proven by style mocks. Author relocated below deck in scrolling content; Start Journey remains separate fixed action.

Native device control remains with Architect; specialist did not tap Like/Save/share-send or operate phone. No live social mutation executed as verification. Root's updated native visual evidence may be appended separately; no new device success inferred here. TalkBack, large text, dynamic feedback on real device and iOS remain pending. All application/test files untouched by QA; only this report appended, no server/dependency/backend/publication actions.

## Six icon actions delta: final QA and independent review

2026-10-23 09:12 IST (03:42 UTC), same branch/HEAD. Architect released stable revision before verification; hashes below supersede corresponding earlier rows:

| Path | SHA256 |
| --- | --- |
| src/app/journey/[id].tsx | B41B58EF86C892D1214587B479BD3E9D455A4027936D25E47F4B57055D5EBFCE |
| src/components/journey/journey-action-icon.tsx | 4DA924F7A0B537BAB9DFAA5F25DC5E4D5BD88BAA5BAE1BB6922FD052E2D28297 |
| src/components/journey/journey-options.tsx | C75F6769C65FEAEED78D8D188D9AC3DCD482A76A95915B741863DDBF22C6448D |
| src/components/journey/social-actions.tsx | 5A4303466F5EBAE421111E77091947AEB77FE30E77A952399235C8CFC029A3D4 |
| src/components/journey/stop-card-deck.tsx | A3A152C0E20C69C1B19F3F4F43EC043A7457F1790BD01195A78B197AE3D99B6A |
| src/components/journey/stop-timeline.tsx | 2594008F45D2DAC2F3CFC004DFF0CB0E94BC39989F9750E472C4F496F73945EA |
| tests/stop-card-deck.test.mjs | 58A13AFD98E0910E97F799C06F42D7FA76E277908A2B48236A7638F5728C023C |
| tests/share-artwork.test.mjs | 6DD10B7DA212402782816A00B3924D45D4292CDEA08EF2AE3DEC7DBE4C8E0CF5 |
| tests/story-interaction.test.mjs | 9207F9C916CB08A224E37108460B63D3E6B9FF51553145E7E5CBB326E33E7FDD |

Actual checks: full npm test **565/565 passed**; focused deck/share/story **62/62 passed**; TypeScript and full zero-warning lint passed; whitespace check passed with prior status/roadmap warnings. Offline Android Hermes export at dist/journey-deck-qa/icon-export passed,1618 modules,4.4MB. No native dependency change; earlier offline compatibility evidence retains its warning.

Independent review: **no actionable findings**. Native-View icon primitives have no text/font glyph dependency; decorative geometry excluded from accessibility. Buttons retain semantic labels, selected/disabled states and44dp targets; rail has no visible action words (like count remains). Single SocialActions in photo slot and single JourneyOptions in caption slot preserve mounted controller ownership. Page removed its separate options instance and map three-dot control. Nonrail JourneyOptions presentation remains intact.

The JourneyOptions rail branch runs after existing hooks and calls the same copy callback/store, preserving anonymous sign-in intent, deferred consume, copy reuse and blocked/ambiguous recovery. Mock tests cover anonymous/authenticated/existing-copy/blocked modes, feedback and Customize/About routing; prior domain tests cover intent/store locks and ambiguous transport behavior. No live Remix, draft creation, Like/Save or share send used. About retains existing details; Customize navigation retains existing selection flow.

Deck routes both slots once, including empty itinerary; lower actions occupy separate56dp caption gutter with150dp minimum caption row. Both action groups are siblings of read/gesture surfaces, not nested buttons; decorative rear cards contain no action controllers. Typical narrow viewport and feedback placement assessed by style inspection; native hit arbitration, exact icon appearance, TalkBack/large text and iOS remain root/device acceptance. Native export proves bundling, not physical interaction. Architect owns current phone captures and any exact About/Customize/navigation evidence. QA changed only this report and ignored export output; running server and phone untouched.

## Edge-to-edge status bar delta: QA and independent review

2026-10-23 09:23 IST (03:53 UTC), same branch/HEAD. Stable delta released before checks. Current SHA256 for changed paths (supersede prior corresponding rows):

| Path | SHA256 |
| --- | --- |
| src/app/journey/[id].tsx | 578F9D94818C5E02B28B826B1ECD50FBBB3404621E4B3B3A3F5B5CCD9A308C1C |
| src/components/journey/map/map-frame.tsx | 19CB8687A892EE32564EAA5298E695D23C3AEEFA1E277187F1FE46FD9FC1F340 |
| src/components/journey/map/journey-map.native.tsx | 15536DDFF24F0917B462D1A63FFC7CFEFCF336B80817136FF91DE8443EEEE910 |
| src/components/journey/map/native-map.tsx | E5B9F218FE0C9D540AA983A2C6A30BABB0C140C6ECBEDB3E9034732802B2DA70 |
| src/components/journey/story-sheet.tsx | 87363693451285E7601520584844642A1B3DA1B60B89282CB52085DF2E35963C |
| tests/story-interaction.test.mjs | 582A5CD7468FBB81542489727C751B4DA3404CA179542B82DCAE1A089AD74DCA |

Actual verification: full npm test **567/567 passed**, focused story-interaction **55/55 passed**, TypeScript passed, full max-warnings=0 lint passed, whitespace passed (same existing status/roadmap line-ending warnings). Offline Android export at dist/journey-deck-qa/status-export passed,1618 modules,4.4MB Hermes. No dependency/config/native build change or server restart.

Independent review **no actionable findings**. Loaded Journey excludes only top SafeArea edge; unavailable/loading route retains all safe edges. Focused main presentation mounts light StatusBar entry; panel/blur removes it. Fixed pointerEvents=none gradient protects top inset plus20px even when scrolling content away from map. This keeps main status contrast through scrolling without a new per-scroll listener. Controls receive top inset through the native loader; Fit and compass offset while navigationMode's bottom placement and absent-prop default0 preserve prior callers. Full-map StorySheet retains its safe area/default map positioning.

StorySheet mounts dark status entry only when visible, preserving pale modal contrast for About/map/share/social/remix feedback; hidden sheets have no status ownership. Existing stop viewer retains its own status behavior. Changes use mounted Expo StatusBar stacking, with no imperative global/translucent/background-color configuration. Native modal dismissal/focus and actual gradients/status icons require physical verification; component tests prove prop/conditional behavior, not native stack rendering.

Tests cover inset24 main controls/shade and native Fit/compass at0/24/48 plus preserved navigation defaults, visible/hidden sheet status ownership, existing map lifecycle and prior Journey interactions. Root owns latest Android captures and panel-close/back evidence; none newly claimed here. Native Android cutout/time/battery contrast and restored other-route styles, plus iOS, remain to be recorded by device owner. No phone actions, live writes, application/test edits or publication by QA; only report and ignored export output generated.

## Architect native acceptance addendum — 2026-10-23 08:49–08:50 IST
Connected CPH2813, Android16, installed development client; native screenshots captured with authorized ADB. No server restarted, no app/user data writes or trip started. Screenshots remain ignored under dist/journey-deck-qa and contain existing personal/public journey/location data; do not publish them.
After export/refresh settled, final.png shows real Mapbox, curved bottom map edge/attribution, options, full-bleed Mall photo and rear photo cards without Refreshing banner. Controlled left swipe from stop3 Lullu mall -> stop4 Shangumugam park verified next-verified.png; controlled right swipe returned to stop3 verified return-verified.png. Title/photo/progress agree after each gesture. Native map camera also updates with selected stops. A vertical swipe revealed readable Previous/Next controls above fixed social/travel footer (controls.png), preserving current stop.
The subsequent coordinate button attempt opened a read-only full stop story; therefore it is not counted as a verified Previous/Next button activation. Story and full-map sheets were observed with correct selected stop and closed; page-handoff.png confirms clean Journey page at stop4 with map/curves/photo deck. Earlier owner browsing concurrent with root captures limits attribution of earlier transitions; after.png/previous.png/previous-settled.png have Refreshing or animation and are not clean acceptance evidence. Home-stop missing-photo native artwork was observed earlier, but final isolated forced image failure/changed URI remains simulated.
Pending: physical button-boundary/zero-one-stop cases, forced load error recovery, reduced-motion toggle, screen reader/large text, orientation, interrupted lifecycle, iOS and broader Travel regression. Automated coverage is not physical evidence. Device control returned to owner on Journey page. No commit/push/merge/deployment.

Architect native social-rail observation 2026-10-23 09:00–09:01 IST: social-rail.png and social-rail-swipe.png inspected directly, connected CPH2813 Android16. Rail fits active 16:9 no-photo art and actual photo with selected heart/count, Save and Share; fixed bottom author/social row removed, title/read-story fully visible. Concurrent owner navigation means screenshot stop changes cannot be fully attributed to root swipe. Attempted vertical scroll capture social-author.png shows Journey options sheet, so author reach/rail action isolation are not counted as device passes. No Architect Like/Save/share-send or production writes; phone returned to owner control. Pending native action/large-font/TalkBack/forced error tests; automated evidence above remains separate. Screenshots stay ignored/local.

Architect final native icon observation 2026-10-23 09:11–09:13 IST: icons.png clean capture shows proper heart/count, notched bookmark, share, paired Remix arrows and Customize route icon; no map three-dot trigger. icons-final.png clean settled capture after export shows all six including Info, reserved title gutter, branded missing-photo art, author attribution and accessible Previous/Next controls above fixed Start footer. Gray floating developer Tools overlay partially covers bookmark; unrelated app rendering. icons-scrolled.png has Refreshing banner so not counted as clean capture. Concurrent owner navigation prevents exact root scroll/selection attribution; visual evidence only for final icon layout, mocked tests establish action contracts separately. No native authenticated Remix/selected-copy/social mutations or external share sends exercised. Large text/TalkBack/iOS and live failure scenarios remain unverified. Phone left with owner, screenshots remain ignored/local; no publication.

Architect Android status acceptance 2026-10-23: connected CPH2813 Android16. Initial edge-top.png showed Home's existing safe area/dark icons. Opened existing public Read story without writes; edge-open.png loading map already extends under system icons. edge-loaded.png clean map imagery extends all the way behind light time/signal/battery; no white top band. Fit/full map inset and map attribution visible. Root opened Full map read-only: edge-sheet.png confirms dark icons on pale SafeArea sheet. Close then edge-return.png confirms light status icons restored over native map. Explore navigation edge-home.png shows Home loader with dark status icons restored; final settled Home/map scroll/background/iOS not established by this capture. Some user browsing concurrent changed Journey stop selection; no claim about exact selected stop transitions here. Screenshots ignored/local. No live copy/social/upload/trip writes, server restart, dependency or native build changes; phone control left to owner.
