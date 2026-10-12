// Allocate decoration only after measured controls and the fixed action area.
export function storyLayout(height: number, controls: number, footer: number) {
  const available = Math.max(0, height - controls - footer - 40);
  const compact = available < 510;
  const cover = Math.min(210, Math.max(112, available * 0.28));
  const map = Math.min(150, Math.max(64, available * 0.19));
  return { cover, map, compact };
}
export function selectedStopId(stops: { id: string }[], requested: string | null) {
  return stops.some(stop => stop.id === requested) ? requested : stops[0]?.id ?? null;
}
export function stopIndexAtOffset(offset: number, stride: number, count: number) {
  if (!count || !Number.isFinite(offset) || stride <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(offset / stride)));
}
