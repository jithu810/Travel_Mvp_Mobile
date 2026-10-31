import { readFileSync } from 'node:fs';
import ts from 'typescript';
const mobileTheme = {};
new Function('exports', ts.transpileModule(readFileSync('src/theme/mobile-theme.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mobileTheme);
export function loadPilotTheme(path = '/search') {
  const exports = {};
  new Function('require', 'exports', ts.transpileModule(readFileSync('src/theme/dark-pilot.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(name => {
    if (name === 'expo-router') return { usePathname: () => typeof path === 'function' ? path() : path };
    if (name === 'react-native') return { StyleSheet: { flatten: value => value } };
    if (name === './mobile-theme') return mobileTheme;
    throw Error(name);
  }, exports);
  return exports;
}
export const lightPilotTheme = loadPilotTheme();
export const appMobileTheme = mobileTheme;
