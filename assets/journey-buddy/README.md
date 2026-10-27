# Journey Buddy sprites

Original character artwork supplied by the product owner (Pixler AI). The PNGs are copied without modifying pixels, alpha, palette or frame alignment.

| Asset | Geometry | Playback |
| --- | --- | --- |
| idle.png | 1024 × 128, eight horizontal 128 × 128 frames | 6 fps, loop |
| walk.png | 1024 × 128, eight horizontal 128 × 128 frames | 10 fps, loop |
| jump.png | 1440 × 189, eight horizontal 180 × 189 frames | 4 fps, one two-second cycle after confirmed memory save |
| run.png | 1024 × 128, eight horizontal 128 × 128 frames | 12 fps, three seconds after accepted Travel Begin/Resume |
| reference.png | 128 × 128 | Static reduced-motion/error fallback |

The app renders a 64dp touch canvas with a fixed bottom-center anchor. Jump preserves its original non-square cells: its centered crop is180/189 of64dp wide, preventing adjacent-frame leakage. Transparent padding belongs to each frame; do not trim individual frames or recenter the character per frame. These sheets do not contain a closed-eye blink pose. No artificial blinking, Wave or Sleep pose is implied.

To add an animation, put its PNG in this folder and add a static `require` entry in `src/lib/buddy/animations.ts` with frame dimensions/count/columns, sheet dimensions, fps, anchor, loop and facing. Preserve original cells and the bottom-center anchor. Missing optional animations resolve to Idle. Keep frame rates low, sheets compact and transparency intact. Native image scaling/sharpness needs a physical-device check.

Jump/Run never move Buddy across the map. Confirmed operation identities prevent duplicate triggers; overlap is dropped. Events start after the initiating touch releases and completion overlays close, without waiting for the normal roaming cooldown. Unplayed events expire after six seconds. A held/new touch, background/navigation, Buddy off, reduced motion, dialog, help or arrival/navigation guidance suppresses or cancels playback. Existing preferences, idle/walk and drag/parking are unchanged.

Journey Buddy runs only inside the foreground app. Android floating overlays, additional native permissions, conversational AI, cloud preferences and new location tracking are outside this version.
