import type { BuddyPoint } from './model';
type Scalar = { stopAnimation(callback?: (value: number) => void): void };
// ValueXY.stopAnimation reads its JS cache. Read the native scalar values instead.
export function createBuddyPositionCapture(value: { x: Scalar; y: Scalar }) {
  let generation = 0;
  return {
    read(callback: (point: BuddyPoint) => void) {
      const epoch = ++generation; let x: number | undefined, y: number | undefined, delivered = false;
      const complete = () => {
        if (generation === epoch && !delivered && x !== undefined && y !== undefined && Number.isFinite(x) && Number.isFinite(y)) {
          delivered = true; callback({ x, y });
        }
      };
      value.x.stopAnimation(next => { x = next; complete(); });
      value.y.stopAnimation(next => { y = next; complete(); });
      return () => { if (generation === epoch) generation++; };
    },
    cancel() { generation++; value.x.stopAnimation(); value.y.stopAnimation(); },
  };
}
