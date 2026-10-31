import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { lightTheme as theme } from './mobile-theme';

// App-wide extension of the approved palette. Immutable tokens; no stored preference.
// Compatibility names retain existing presentation imports during this extension.
export function isDarkPilotRoute(path: string) {
  return path.startsWith('/');
}
export const darkPilot = {
  background: '#0B1220', surface: '#152238', inset: '#1C2D46',
  text: '#F1F5FC', muted: '#B5C3D8', accent: '#C1ADFF', link: '#91BEFF', border: '#3E526F',
} as const;

// Only explicit UI roles are adapted. Photos, artwork, map styles, shadows,
// primary gradients and white text over imagery remain unchanged.
const backgrounds: Record<string, string> = {
  [theme.background]: darkPilot.background, [theme.surface]: darkPilot.surface,
  [theme.inset]: darkPilot.inset, [theme.lavender]: darkPilot.inset,
  '#F1F5FC': '#263F65', '#FFFFFF': darkPilot.surface,
  '#F5F3EC': darkPilot.background, '#F0EDF7': darkPilot.inset, '#F0F3FA': darkPilot.surface,
  '#F2F0F7': darkPilot.inset, '#F3F5FB': darkPilot.inset, '#F5F6FB': darkPilot.inset,
  '#FAFBFF': darkPilot.surface, '#E4EAF6': darkPilot.inset, '#EAF0F9': darkPilot.surface,
  '#E8ECE3': darkPilot.inset, '#EEEFE5': darkPilot.inset, '#F4E8D5': '#3B2C20',
  '#D6DFF2': darkPilot.inset, '#E7EDF9': darkPilot.inset,
  'rgba(255,255,255,0.86)': darkPilot.surface, '#FFFCF3': darkPilot.surface, '#F0F6FF': darkPilot.inset, '#E6E0FF': '#30264B',
  '#F0F3F9': darkPilot.surface, '#F8F9FD': darkPilot.surface,
  '#DDE5FC': darkPilot.inset, '#283B56': darkPilot.text, '#245DA7': darkPilot.link, '#C9DFFF': '#263F65',
  'rgba(232, 239, 252, 0.97)': 'rgba(17, 29, 48, 0.98)',
  'rgba(242, 246, 255, 0.97)': 'rgba(21, 34, 56, 0.98)',
};
const foregrounds: Record<string, string> = {
  [theme.text]: darkPilot.text, [theme.muted]: darkPilot.muted,
  [theme.accent]: darkPilot.accent, [theme.background]: darkPilot.text,
  '#0B1220': darkPilot.text, '#153E35': darkPilot.text, '#163F57': darkPilot.text,
  '#172239': darkPilot.text, '#202C43': darkPilot.text, '#4A5364': darkPilot.muted,
  '#556176': darkPilot.muted, '#546887': darkPilot.muted, '#536486': darkPilot.muted,
  '#4858AF': darkPilot.accent, '#4D5BC3': darkPilot.accent, '#5360C5': darkPilot.accent,
  '#356147': '#A4E1B6', '#666C61': darkPilot.muted, '#386958': '#A4E1B6',
  '#61776C': darkPilot.muted, '#71877C': darkPilot.muted, '#8B3933': '#FFB7B0',
  '#9A3B32': '#FFB7B0', '#9D493D': '#FFB7B0', '#253F35': darkPilot.muted, '#14243F': darkPilot.text, '#18243B': darkPilot.text, '#243E68': darkPilot.text,
  '#283B56': darkPilot.text, '#48554F': darkPilot.muted, '#596778': darkPilot.muted,
  '#235BB2': darkPilot.link, '#2C63AF': darkPilot.link, '#3873CE': darkPilot.link,
  '#245DA7': darkPilot.link, '#276392': darkPilot.link, '#6555CF': darkPilot.accent,
};
const borders: Record<string, string> = {
  [theme.border]: darkPilot.border, '#FFFFFF': darkPilot.border, '#FFFFFF66': darkPilot.border,
  '#E1E8F4': darkPilot.border, '#DCE6F5': darkPilot.border, '#D6DCEC': darkPilot.border,
  '#283B56': darkPilot.text, '#245DA7': darkPilot.link, '#243E68': darkPilot.text,
  '#153E35': darkPilot.border, '#A9C9BB': darkPilot.border, '#D1D8F8': darkPilot.border,
  '#C8C9D3': darkPilot.border, '#DCD6FF': darkPilot.border, '#E9E5DE': darkPilot.border,
  '#EDEBE5': darkPilot.border, '#326A8C': darkPilot.link, '#356147': '#A4E1B6', '#9A3B32': '#FFB7B0',
};
export function pilotColor(value: string, role: 'foreground' | 'background' | 'border', dark: boolean) {
  if (!dark) return value;
  return (role === 'background' ? backgrounds : role === 'border' ? borders : foregrounds)[value] ?? value;
}
const darkGradients: Record<string, string> = {
  [theme.backgroundGradient]: 'linear-gradient(135deg, #101C30 0%, #0B1220 100%)',
  'linear-gradient(135deg, #FFF8F1 0%, #EDF1F8 55%, #E2EAF6 100%)': 'linear-gradient(135deg, #101C30 0%, #0B1220 100%)',
  'linear-gradient(120deg, #EBEEFF 0%, #E2EAF6 100%)': 'linear-gradient(120deg, #1C2D46 0%, #152238 100%)',
  'linear-gradient(145deg, #DBEEE4 0%, #D9E8F6 100%)': 'linear-gradient(145deg, #193A3A 0%, #172B46 100%)',
  'linear-gradient(135deg, #E1F1E6 0%, #DCE9F2 100%)': 'linear-gradient(135deg, #193A3A 0%, #172B46 100%)',
  'linear-gradient(180deg, rgba(247, 248, 252, 0.90) 0%, rgba(237, 241, 248, 0.82) 30%, rgba(235, 238, 255, 0.96) 100%)': 'linear-gradient(180deg, rgba(11,18,32,0.90) 0%, rgba(21,34,56,0.96) 100%)',
};
type Style = ViewStyle | TextStyle | ImageStyle;
const variants = new WeakMap<object, object>();
export function darkPilotStyles<T extends Record<string, Style>>(light: T): T {
  const existing = variants.get(light);
  if (existing) return existing as T;
  const result = Object.fromEntries(Object.entries(light).map(([name, original]) => {
    const style = { ...StyleSheet.flatten(original) } as Record<string, unknown>;
    for (const key of Object.keys(style)) {
      const value = style[key];
      if (typeof value !== 'string') continue;
      if (key === 'color') style[key] = pilotColor(value, 'foreground', true);
      else if (key === 'backgroundColor') style[key] = pilotColor(value, 'background', true);
      else if (/^border.*Color$/.test(key)) style[key] = pilotColor(value, 'border', true);
      else if (key === 'experimental_backgroundImage') style[key] = darkGradients[value] ?? value;
    }
    return [name, style];
  })) as unknown as T;
  variants.set(light, result);
  return result;
}
export function useDarkPilot() { return true; }
export function usePilotStyles<T extends Record<string, Style>>(light: T): T {
  return useDarkPilot() ? darkPilotStyles(light) : light;
}
export function usePilotColor() {
  const dark = useDarkPilot();
  return (value: string, role: 'foreground' | 'background' | 'border' = 'foreground') => pilotColor(value, role, dark);
}
