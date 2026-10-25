export type GlobeStyle = 'satellite' | 'outdoors' | 'failed';
export function nextGlobeStyle(style: GlobeStyle): GlobeStyle {
  return style === 'satellite' ? 'outdoors' : 'failed';
}
// Fixed in the exposed top band, away from World and the compass. The wrapper
// offers positioning, not logo scaling; keep SDK branding intact at native size.
export const globeLogoPosition = { top: 12, left: 12 };
export const globeAttributionPosition = { top: 12, left: 116 };

// Streets' zoom-0 tile has no place_label points. Keep the symbol layer
// parseable on the globe's zoom-1+ tiles; paint opacity handles the zoom-1
// handoff to the style's original country-label without duplicate text.
export const worldCountryLabels = {
  id: 'discovery-world-countries', sourceID: 'composite', sourceLayerID: 'place_label',
  minZoomLevel: 0, maxZoomLevel: 10,
};
