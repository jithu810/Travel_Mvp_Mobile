export const spaceColor = '#080F1E';
export const globeAtmosphere = {
  color: '#669CC4',
  highColor: '#17364F',
  spaceColor,
  horizonBlend: 0.015,
  starIntensity: 0.18,
};
// Leave an exposed band of globe even when the discovery list is expanded.
export function discoveryPanelSize(availableHeight: number, expanded: boolean) {
  const height = Number.isFinite(availableHeight) ? Math.max(0, availableHeight) : 0;
  const collapsed = Math.min(260, height * 0.62);
  return expanded ? Math.max(collapsed, height - 96) : collapsed;
}
export function discoveryCardWidth(availableWidth: number, expanded: boolean) {
  const width = Number.isFinite(availableWidth) ? Math.max(0, availableWidth) : 0;
  return Math.max(0, Math.min(expanded ? 520 : 300, width - (expanded ? 32 : 52)));
}
