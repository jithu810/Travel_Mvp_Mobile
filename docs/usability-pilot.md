# Five-user usability pilot

Prepared 2026-10-30. Preparation complete; pilot not run. Use with the owner-agreed [success measures](success-measures.md). No analytics or application changes. Aim for five people new to the app, one at a time, around 20–30 minutes each; this is qualitative discovery, not a representative study.

## Before the session

- Confirm the app version/build, device, text size, network and whether Buddy starts visible. Use a fresh participant session without another person's private data; never clear a real owner's app data to prepare a session.
- Check that an existing public journey has at least three selectable stops and suitable content. Do not create or alter hosted examples as part of preparation. If no suitable journey exists, record that limitation and arrange approved test content before the affected tasks.
- Use synthetic places, titles and memory text. Avoid personal photos and precise current location. Do not ask participants to reveal credentials or record them during sign-in.
- Before any hosted save/bookmark/copy/memory write, obtain product-owner approval naming the actions, target project/environment and test accounts. Document who owns the test records and any separately approved cleanup. Otherwise use a verified isolated test setup or mark the affected tasks not tested. This guide grants no write approval.
- Confirm owner-controlled private note storage, who can access it and retention before collecting data. Follow the success-measures privacy plan: aliases P01–P05, no participant records in Git, separate consent for screenshots/recordings, delete raw notes within 30 days after findings are agreed.
- Obtain participant consent for observation. Explain that they may stop, decline a task or request deletion through the facilitator. Follow-up is optional and needs permission to contact them; keep contact details outside observation notes.

Read aloud: “We are testing the app, not you. Please tell me what you are looking for and what you expect to happen. Work as you normally would. You may use any help in the app or ignore it. I will mostly watch, and you can stop at any time.”

## Five short tasks

Read only the participant prompt. The other columns are facilitator guidance; do not point to controls or name the correct route before the participant tries.

| Task | Participant prompt | Observe / successful outcome |
| --- | --- | --- |
| 1 — Find something useful | “Imagine a day out somewhere you would like to explore. Find a journey you would consider using. Tell me where it goes and one stop you would like to visit.” | Path through Explore/Search/Story, time to first useful journey, relevance and destination/stop comprehension. A random tile tap alone is not success. |
| 2 — Keep it for later | “Keep that journey so you can find it later. Go back to the starting screen, then find and open it again.” | Confirm bookmark state and return through Saved to the intended story. Requires approved hosted bookmark writes or isolated setup. |
| 3 — Make a shorter trip | “You only have time for two stops. Make a version of this trip with those two stops, without starting navigation. Tell me whether you could edit it later from your drafts.” | Intended temporary selection, no GPS start, and understanding that this is not a saved editable draft. Record confusion between Customize/Remix. Do not tell them that distinction until scoring. |
| 4 — Keep a memory | “Using a made-up outing, start your own private journey and add one stop or memory. Leave it, then come back and show me what you kept.” | Confirmed private save, meaningful contribution and reopen; distinguish local unsaved work from confirmed saved data. Use synthetic text; no photos needed. Requires approved hosted journey/memory writes or isolated setup. |
| 5 — Help on your terms | “Continue with something you still want to do. If the app's helper would be useful, try it. If you would rather continue without it, show me how you would do that.” | Voluntary Buddy use or dismissal/hide and continued task. Ask afterward what, if anything, helped. Do not force Buddy use or count choosing no help as failure. This task is descriptive; there is no minimum-use target. |

Task dependencies: if task 1 fails, score it first, then offer a preselected suitable journey as a recorded setup assist for tasks 2–3. If task 4 lacks authorization, mark it not tested rather than treating an open Create screen as success. Task 5 may revisit unfinished work without another write, or ask the participant to find a different journey. Do not replace a failed core task with Buddy engagement.

## Observation checklist

For each task:

- [ ] Read the prompt without coaching; record start time and prior setup assistance.
- [ ] Record the first action, pauses, wrong turns and labels that caused confusion, especially Explore/Search/Story, Saved and Customize/Remix.
- [ ] Record whether the participant understood the next action, private/public state, temporary/saved state and any empty/error message.
- [ ] Note Buddy offered/seen/used/dismissed separately; what happened next, whether it helped, and any obstruction or repetition. Unknown is acceptable.
- [ ] Record confirmed outcome and elapsed time, including interruptions; ask “What do you think happened?” without supplying the answer.
- [ ] Score **independent**, **assisted**, **not completed** or **not tested**. App-provided Buddy help may still be independent; facilitator hints are assisted. Record the exact hint.
- [ ] Tag the main barrier: comprehension, usability, content availability, network/app failure or authorization limitation. Stop for data loss, accidental publication, privacy exposure or unrequested GPS; report the incident without copying private content.

If a participant asks for help, first ask neutrally “What would you try next?” If they remain stuck or want to stop, record the outcome and offer to move on. Any hint that reveals the route/action counts as assistance. Do not silently restart the timer after coaching. No arbitrary speed pass/fail threshold.

## Blank session sheet

Participant alias: ___  Date: ___  App build: ___  Device/OS: ___  Text size/network: ___

Consent recorded privately: ___  Isolated setup or approved write scope reference: ___

| Task | Outcome | Time / interruptions | Wrong turn / hesitation | Buddy seen, action and effect | Confirmed result / barrier / assistance |
| --- | --- | --- | --- | --- | --- |
| 1 Find | | | | | |
| 2 Save/revisit | | | | | |
| 3 Customize | | | | | |
| 4 Private memory | | | | | |
| 5 Optional help/control | | | | | |

Afterward ask: “What was hardest?”, “What did you expect to be saved or private?”, “Did Buddy help, get in the way, or neither?”, and “What real situation would bring you back?” An intention to return is not evidence of an actual useful return.

## After the five sessions

Use exact per-task denominators and separate assisted/not-tested results. Target at least 4 of 5 independent completions for tasks 1–4; task 5 has no use quota. Zero observed integrity/privacy failures remains the safety target. Summarize recurring confusion (two or more participants), single serious incidents, and the next bounded fix for E4. Do not infer retention gains from this pilot.

Recovery is not tested by these five tasks: no force-stop, GPS, failed-save injection or network interruption is planned. Reference existing R2/R3 QA separately and schedule an explicitly scoped recovery observation if needed. At an optional 7–14 day follow-up ask whether they returned for a real planning/travelling/remembering need and what they accomplished; report nonresponse as unknown and prompted versus self-initiated return separately.

E2's preparation slice is complete when this guide is available. E2 remains open until actual participant sessions and findings are recorded. The current backlog remains 16/24 complete, 8 open.

## Local task record

Small documentation-only task. Baseline: `feature/backlog-phase1`, HEAD `ca2ce8d490ec1716e6ed9676ca71ab85fc21e4e1`, with existing unpublished code/tests/reports/status work preserved. Inspected the backlog and agreed success measures. No backend impact: no runtime, auth, persistence, API/RPC, Storage or analytics change; no live preflight or device check required. Architect self-review checked five prompts, scoring consistency, consent and write boundaries; no independent specialist review/application tests needed. Publication is not authorized by this preparation guide.
