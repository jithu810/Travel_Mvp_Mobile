export type CompanionViewport = { width: number; height: number; bottomInset: number; interacting: boolean };
export const companionEnabled = (value: string | undefined) => value === 'true';
export const COMPANION = { top: 60, right: 12, width: 104, height: 188, fps: 30 } as const;
export function companionFits({ width, height, bottomInset, interacting }: CompanionViewport) {
  return !interacting && [width, height, bottomInset].every(Number.isFinite) && bottomInset >= 0
    && width >= 280 && height - bottomInset >= COMPANION.top + COMPANION.height + 12;
}
export function companionVisible(enabled: boolean, android: boolean, focused: boolean, active: boolean, failed: boolean) {
  return enabled && android && focused && active && !failed;
}
/** No global RAF loop: one cancellable 30 Hz driver per mounted scene. */
export function startCompanionFrames(draw: (seconds: number) => void, onError: () => void,
  schedule: (callback: () => void, delay: number) => ReturnType<typeof setTimeout> = setTimeout,
  cancel: (timer: ReturnType<typeof setTimeout>) => void = clearTimeout,
  now: () => number = () => performance.now()) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => { stopped = true; if (timer !== undefined) cancel(timer); timer = undefined; };
  const tick = () => {
    if (stopped) return;
    try { draw(now() / 1000); } catch { stop(); onError(); return; }
    if (!stopped) timer = schedule(tick, 1000 / COMPANION.fps);
  };
  timer = schedule(tick, 0);
  return stop;
}
