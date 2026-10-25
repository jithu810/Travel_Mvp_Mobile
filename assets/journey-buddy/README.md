# Journey Buddy sprites

Original character artwork supplied by the product owner (Pixler AI). The PNGs are copied without modifying pixels, alpha, palette or frame alignment.

| Asset | Geometry | Playback |
| --- | --- | --- |
| idle.png | 1024 × 128, eight horizontal 128 × 128 frames | 6 fps, loop |
| walk.png | 1024 × 128, eight horizontal 128 × 128 frames | 10 fps, loop |
| reference.png | 128 × 128 | Static reduced-motion/error fallback |

The app renders a 64dp canvas with a fixed bottom-center anchor. Transparent padding belongs to each frame; do not trim individual frames or recenter the character per frame. These sheets do not contain a closed-eye blink pose. No artificial blinking, Wave, Jump or Sleep pose is implied.

To add an animation, put its PNG in this folder and add a static `require` entry in `src/lib/buddy/animations.ts` with frame dimensions/count/columns, sheet dimensions, fps, anchor, loop and facing. Keep the same 128px square canvas and bottom-center anchor for consistent alignment. Missing optional animations resolve to Idle. Keep frame rates low, sheets compact and transparency intact. Native image scaling/sharpness needs a physical-device check.

Journey Buddy runs only inside the foreground app. Android floating overlays, additional native permissions, conversational AI, cloud preferences and new location tracking are outside this version.
