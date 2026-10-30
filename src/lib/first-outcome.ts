export type FirstOutcome = 'find' | 'memory';
export function firstOutcomeRoute(goal: FirstOutcome) {
  return goal === 'find' ? { pathname: '/search' as const, params: { guide: 'find' } } : { pathname: '/create' as const, params: { guide: 'memory' } };
}
