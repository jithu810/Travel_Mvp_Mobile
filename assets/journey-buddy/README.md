# Journey Buddy sprites

Original character artwork supplied by the product owner (Pixler AI). Original sheets are preserved. Sleep and curious idle are new matching artwork generated from the reference character.

| Asset | Geometry | Playback |
| --- | --- | --- |
| idle-curious.png | 512 × 512, sixteen 128 × 128 frames in a 4 × 4 grid | 4 fps, loop: map check, backpack adjustment, curious glances |
| idle.png | 1024 × 128, eight horizontal 128 × 128 frames | Preserved original; no longer the active idle |
| walk.png | 1024 × 128, eight horizontal 128 × 128 frames | 10 fps, loop |
| jump.png | 1440 × 189, eight horizontal 180 × 189 frames | 4 fps, one two-second cycle after confirmed memory save |
| run.png | 1024 × 128, eight horizontal 128 × 128 frames | 12 fps, three seconds after accepted Travel Begin/Resume |
| reference.png | 128 × 128 | Static reduced-motion/error fallback |

The app renders a 64dp touch canvas with a fixed bottom-center anchor. Jump preserves its original non-square cells: its centered crop is180/189 of64dp wide, preventing adjacent-frame leakage. Transparent padding belongs to each frame; do not trim individual frames or recenter the character per frame. These sheets do not contain a closed-eye blink pose. No artificial blinking or Wave pose is implied. Sleep uses its own closed-eye seated artwork.

To add an animation, put its PNG in this folder and add a static `require` entry in `src/lib/buddy/animations.ts` with frame dimensions/count/columns, sheet dimensions, fps, anchor, loop and facing. Preserve original cells and the bottom-center anchor. Missing optional animations resolve to Idle. Keep frame rates low, sheets compact and transparency intact. Native image scaling/sharpness needs a physical-device check.

Jump/Run never move Buddy across the map. Confirmed operation identities prevent duplicate triggers; overlap is dropped. Events start after the initiating touch releases and completion overlays close, without waiting for the normal roaming cooldown. Unplayed events expire after six seconds. A held/new touch, background/navigation, Buddy off, reduced motion, dialog, help or arrival/navigation guidance suppresses or cancels playback. Existing preferences, idle/walk and drag/parking are unchanged.

Journey Buddy runs only inside the foreground app. Android floating overlays, additional native permissions, conversational AI, cloud preferences and new location tracking are outside this version.

## Sleep and wake

sleep.png contains eight128x128 transparent cells in a1024x128 sheet, played at4fps. Generated from reference.png with the same turquoise character/backpack, then prepared with a common crop and nearest-neighbor scaling. Floating Buddy sleeps after60 seconds without user interaction and stops roaming. First tap wakes only; the next tap opens help. Travel screens and contextual prompts keep Buddy alert; route/background cleanup cancels sleep. Reduced motion shows the first sleep frame with no breathing clock. Story map walkers do not sleep.

## Curious idle

The active idle uses idle-curious.png with the existing frame renderer, touch area and bottom-center anchor. Generated from reference.png, prepared as equal cells using nearest-neighbor scaling. Reduced-motion/error fallback still uses reference.png. Walking, running, jumping and sleep keep their own sheets. Native Account captures confirm changing idle poses with the character kept inside the top area.

## Contextual gestures

wave.png and curious.png each contain eight128px cells in a512x256 four-column sheet. Both play once at4fps, return to idle, and use the existing bottom-center touch anchor. Generated together from reference.png and split into two clips with equal cell crops and nearest-neighbor scaling. Wave raises/lowers a hand; Curious glances and tilts its head. Contextual text is preset locally; no audio, AI service or backend call is involved.
