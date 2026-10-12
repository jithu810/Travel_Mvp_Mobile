import { discoveryPanelSize } from './presentation';
export type SheetMode = 'peek' | 'collapsed' | 'expanded';
export function sheetHeight(available: number, mode: SheetMode) {
  const collapsed = discoveryPanelSize(available, false);
  // Keep the entire 44-point accessible handle exposed. Available already
  // excludes Home header/search, bottom actions and system safe areas.
  return mode === 'peek' ? Math.min(44, collapsed) : discoveryPanelSize(available, mode === 'expanded');
}
export function draggedSheetHeight(start: number, dy: number, available: number) {
  return Math.max(sheetHeight(available, 'peek'), Math.min(sheetHeight(available, 'expanded'), start - dy));
}
export function sheetSnapMode(height: number, velocityY: number, available: number): SheetMode {
  const modes: SheetMode[] = ['peek', 'collapsed', 'expanded'];
  // Project a short flick, then choose the nearest real snap. Long downward
  // drags can reach peek; a small downward flick from expanded still collapses.
  const projected = draggedSheetHeight(height, velocityY * 160, available);
  return modes.reduce((nearest, mode) => Math.abs(sheetHeight(available, mode) - projected) <
    Math.abs(sheetHeight(available, nearest) - projected) ? mode : nearest);
}
export function shouldDragSheet(dx: number, dy: number, touches: number, expanded: boolean, startOffset: number, offset: number, handle = false) {
  if (touches !== 1 || Math.abs(dy) < 10 || Math.abs(dy) <= Math.abs(dx) * 1.4) return false;
  if (handle) return true;
  return expanded ? dy > 0 && startOffset <= 1 && offset <= 1 : true;
}
