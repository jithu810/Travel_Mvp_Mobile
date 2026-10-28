import type { ImageSourcePropType } from 'react-native';
export type BuddyAnimationName = 'idle' | 'walk' | 'wave' | 'jump' | 'run' | 'sleep' | 'curious';
export type BuddyAnimation = Readonly<{
  source: ImageSourcePropType; sheetWidth: number; sheetHeight: number;
  frameWidth: number; frameHeight: number; frames: number; columns: number; fps: number;
  anchor: Readonly<{ x: number; y: number }>; loop: boolean; facing: 'left' | 'right';
}>;
const base = { sheetWidth: 1024, sheetHeight: 128, frameWidth: 128, frameHeight: 128, frames: 8, columns: 8,
  anchor: { x: 0.5, y: 1 }, loop: true, facing: 'left' as const };
export const buddyReference: ImageSourcePropType = require('../../../assets/journey-buddy/reference.png');
export const buddyAnimations: Partial<Record<BuddyAnimationName, BuddyAnimation>> = {
  idle: { ...base, source: require('../../../assets/journey-buddy/idle-curious.png'), sheetWidth: 512, sheetHeight: 512, frames: 16, columns: 4, fps: 4 },
  walk: { ...base, source: require('../../../assets/journey-buddy/walk.png'), fps: 10 },
  jump: { ...base, source: require('../../../assets/journey-buddy/jump.png'), sheetWidth: 1440, sheetHeight: 189, frameWidth: 180, frameHeight: 189, fps: 4, loop: false },
  run: { ...base, source: require('../../../assets/journey-buddy/run.png'), fps: 12 },
  wave: { ...base, source: require('../../../assets/journey-buddy/wave.png'), sheetWidth: 512, sheetHeight: 256, columns: 4, fps: 4, loop: false },
  curious: { ...base, source: require('../../../assets/journey-buddy/curious.png'), sheetWidth: 512, sheetHeight: 256, columns: 4, fps: 4, loop: false },
  sleep: { ...base, source: require('../../../assets/journey-buddy/sleep.png'), fps: 4 },
};
export function resolveBuddyAnimation(name: BuddyAnimationName): BuddyAnimation | undefined { return buddyAnimations[name] ?? buddyAnimations.idle; }
export function buddyCelebrationDuration(name: 'jump' | 'run') {
  const clip = resolveBuddyAnimation(name)!;
  return name === 'jump' ? 1000 * clip.frames / clip.fps : 3000;
}
export function spriteFrame(animation: BuddyAnimation, index: number, size = 64) {
  const frame = Math.max(0, Math.min(animation.frames - 1, Math.floor(index))), scale = size / animation.frameHeight;
  return { width: animation.sheetWidth * scale, height: animation.sheetHeight * scale,
    left: -(frame % animation.columns) * animation.frameWidth * scale,
    top: -Math.floor(frame / animation.columns) * animation.frameHeight * scale };
}
