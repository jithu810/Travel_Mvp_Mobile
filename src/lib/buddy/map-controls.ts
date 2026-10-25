import type { BuddyRect } from './model';
import { globeAttributionPosition, globeLogoPosition } from '../discovery/globe-style';
type Anchor = { top?: number; bottom?: number; left?: number; right?: number };
// SDK controls are native descendants, not RN refs. Project each bounded footprint from the measured map view.
export function anchoredMapControl(frame: BuddyRect, anchor: Anchor, width = 48, height = 48): BuddyRect {
  return { x: frame.x + (anchor.left ?? frame.width - (anchor.right ?? 0) - width),
    y: frame.y + (anchor.top ?? frame.height - (anchor.bottom ?? 0) - height), width, height };
}
export function globeBuddyControls(frame: BuddyRect, header: number, compass: boolean) {
  return [anchoredMapControl(frame, { ...globeLogoPosition, top: header + globeLogoPosition.top }, 96, 32),
    anchoredMapControl(frame, { ...globeAttributionPosition, top: header + globeAttributionPosition.top }, 40, 40),
    ...(compass ? [anchoredMapControl(frame, { top: header + 12, right: 12 })] : [])];
}
export function journeyBuddyControls(frame: BuddyRect, navigation: boolean, bottom: number, top: number, compass: boolean) {
  return [anchoredMapControl(frame, { bottom: navigation ? bottom + 8 : 8, left: 12 }, 96, 32),
    anchoredMapControl(frame, { bottom: navigation ? bottom + 8 : 8, right: 12 }, 40, 40),
    ...(compass ? [anchoredMapControl(frame, navigation ? { bottom: bottom + 36, right: 12 } : { top: top + 12, right: 12 })] : [])];
}
