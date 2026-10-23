// Shared presentation tokens for non-auth Mobile screens. Map guidance keeps its blue palette.
export const theme = {
  background: '#EDF1F8', surface: '#F7F8FC', inset: '#F1F3F8', lavender: '#EBEEFF',
  text: '#101B2E', muted: '#505D73', accent: '#4B46A2', border: '#D1D8EE',
  white: '#FFFFFF', navigation: '#246BE0',
  primaryGradient: 'linear-gradient(110deg, #9344C8 0%, #6546CD 38%, #2460CE 100%)',
  backgroundGradient: 'linear-gradient(135deg, #F8F7FF 0%, #EDF1F8 55%, #E2EAF6 100%)',
  shadow: '0 3px 7px rgba(39, 54, 85, 0.12)',
} as const;
export const primaryControl = {
  backgroundColor: '#6546CD', experimental_backgroundImage: theme.primaryGradient,
  borderWidth: 1, borderColor: '#DCD6FF', borderRadius: 24,
  boxShadow: '0 4px 9px rgba(81, 76, 181, 0.22)',
} as const;
export const raisedSurface = {
  backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.white,
  borderRadius: 22, boxShadow: theme.shadow,
} as const;
