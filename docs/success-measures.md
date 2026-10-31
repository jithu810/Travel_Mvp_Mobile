# Pilot success measures

Agreed by the product owner, 2026-10-30. E3 documentation slice; no analytics added. Use these definitions in E2's approximately five-person pilot. No pilot results have been collected.

## What counts as success

| Area | Observable success | Does not count | Record manually |
| --- | --- | --- | --- |
| Discovery / first useful action | Participant opens a journey they would consider exploring and can identify its destination and one stop. | Opening a random tile, viewing Home, or receiving a Buddy greeting alone. | Time from task start to useful journey; chosen route through Explore/Search/Story; what made it relevant. |
| Save and return | Participant bookmarks a journey, finds it through Saved and reopens the intended story. | Tapping the bookmark without confirmed state, or finding a different journey. | Completion, assistance, hesitation and unavailable-content behavior. |
| Temporary customization | Participant selects the intended stops and understands that the selection is for this trip and is not a saved editable draft. | Assuming a temporary selection was saved, or starting GPS merely to finish the task. | Selected stops, explanation in their own words, any confusion with Remix. |
| Creation / first useful action | Participant saves a private journey, adds one meaningful stop or memory, then reopens it and recognizes their contribution. | Typing without saving, a loading indicator, an unsaved recovery copy, or a success assumption after an uncertain request. | Confirmed save and reopen, assistance, where the participant understood privacy. |
| Creation recovery | After an agreed interruption, useful unsaved edits can be restored and completed without duplicate confirmed drafts. Participant understands whether work is local or saved. | Assuming the recovery prompt proves a hosted save, or accepting loss of the test edits. | Edits before/after, interruption used, restore result and final save certainty. |
| Trip recovery | An interrupted active/paused trip restores the intended stops and confirmed progress in a paused state; guidance resumes only after explicit Resume. | Treating GPS as proof of visiting a stop, or automatic GPS restart. | Restored state/progress, explicit Resume, any privacy or safety issue. Physical GPS verification remains R4. |
| Useful Buddy help | Participant voluntarily uses a relevant Buddy action and it helps them finish the task or understand the next step, confirmed by observation and their explanation. | Opening/tapping Buddy alone, accepting an irrelevant tip, or completing only after facilitator coaching. | Whether help was offered/seen/used; next action and outcome; participant's explanation. |
| Buddy control | Participant can dismiss/quiet/hide Buddy when desired and continue their task. | Counting dismissal as failure, or interpreting no use as dissatisfaction. | Dismissal reason if volunteered; interference, repetition or obstruction. |
| Return for a real need | At an optional follow-up, participant reports returning for a specific planning, travelling or remembering need and describes the useful outcome. | Intent to return, a research reminder response alone, or reopening without a purpose. | Need and outcome in their own words; whether return was self-initiated. No follow-up means unknown. |

The first useful action can be discovery **or** creation, according to the participant's chosen goal. Report them separately; finding a journey does not establish successful creation. A confirmed private save with a useful contribution may occur later than the first discovery outcome.

## Scoring and proposed pilot targets

For each assigned task record one outcome: **independent**, **assisted**, **not completed**, or **not tested**. App-provided Buddy help is allowed for independent completion; facilitator hints make completion assisted. Log Buddy's contribution separately. Start the clock after reading the task; stop when its observable outcome is reached. Record elapsed time and pauses without inventing a speed pass/fail threshold before observing users. If a participant stops or declines, respect that and record the reason only if offered.

- Initial usability target: at least 4 of 5 participants independently complete each core pilot task (discovery, save/revisit, customization and private memory creation). These are proposed decision thresholds, not forecasts or statistical evidence.
- Report exact counts and denominators for each task, for example 3 independent / 4 attempted, 1 not tested. Report assisted completions separately. Do not claim 4 of 5 if only four attempted.
- Safety/integrity target: zero observed loss of useful test work, duplicate saves, accidental publication, cross-account exposure or unrequested GPS restart. Any occurrence requires investigation before broader testing, even if completion targets pass.
- Buddy has no minimum-use target. Assess usefulness only among participants who encountered and used help; report that denominator and negative/interference observations. Do not force use to increase a metric.
- Recovery is a separate controlled check with exact scenario and denominator. If omitted from the five-person pilot, mark it not tested there and reference existing QA; do not count developer QA as new-user pilot success.
- Return evidence is exploratory. Agree an optional follow-up around 7–14 days after the pilot; report respondents and self-initiated useful returns. No retention target or improvement claim from this small sample.

Repeated confusion from two or more participants is a candidate for E4 prioritization. A single safety/privacy issue takes priority over frequency. Passing these targets supports the next iteration; it does not establish market fit, reliability across devices or a retention gain.

## Minimal observation record

| Participant alias | Task / scenario | Outcome | Elapsed time | Hesitation / wrong turn | Buddy seen / used / outcome | Save or recovery evidence | Follow-up fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P01 | | | | | | | |

Use participant aliases P01–P05. For each incomplete task record whether the cause was comprehension, usability, content availability, network/app failure or an authorization limitation. This prevents a missing example journey from being reported as a navigation failure. E2 supplies the final five task prompts and observation checklist; this document defines the scoring.

## Privacy and implementation boundary

Manual notes only. Explain observation and obtain participant consent before sessions; recordings/screenshots require separate consent. Avoid collecting email addresses, account identifiers, precise location, personal photos, credentials or private journey text. Use synthetic travel examples and record outcomes rather than raw content. Keep notes in owner-controlled private storage; never commit participant records or recordings to GitHub. Share only de-identified findings approved by the owner.

Proposed note retention: delete raw notes/recordings within 30 days after findings are agreed; retain a de-identified issue summary. Owner must confirm the storage location, access and retention before collecting data. Participants may decline observation or request deletion through the facilitator.

This document authorizes no live test writes. Saving/bookmarking/remixing/creating/uploading/deleting in the connected app requires product-owner approval naming the actions and target accounts/project before the pilot. Without that approval use an isolated test setup or mark the affected tasks not tested; opening Create alone is not a completed memory task. GPS task participation is optional and requires a suitable safe test setting.

No event collection, identifiers, tracking SDKs, backend changes or dashboards are proposed for implementation now. Any future analytics proposal must separately specify purpose, event definitions, minimum fields, consent/notice, access, retention and deletion, and undergo the repository's backend/privacy assessment before implementation.

## Agreement and task record

- Small/documentation-only tier; Architect authors and self-reviews. No phone, application tests or independent specialist review needed.
- Baseline: Mobile `feature/backlog-phase1` at `ca2ce8d490ec1716e6ed9676ca71ab85fc21e4e1`, with existing unpublished B2/B3/U8/R5/R6 and recovery work preserved. Inspected IMPROVEMENT_BACKLOG.md, `src/lib/first-outcome.ts` and `src/lib/buddy/help-actions.ts`, plus existing session QA context.
- Backend impact: none; this defines manual assessment only. No runtime, persistence, auth, query, RPC/API, schema, Storage or analytics change. UI/backend implementation gate not applicable; live changes not authorized.
- Checked definitions against existing private-save, temporary-customization and explicit-resume semantics; distinguished proposed targets from actual results and observation from telemetry.
- Owner agreed to the success definitions and proposed pilot target on 2026-10-30 ("Yup"). E3 complete. Optional follow-up and note retention remain the documented plan; confirm the private storage location and access before collecting participant data. E2 pilot and E4 decisions remain separate. Local/unpublished.
