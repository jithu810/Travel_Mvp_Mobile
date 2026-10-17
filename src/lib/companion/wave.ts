import { Quaternion, Vector3, type Group } from 'three';

const DURATION = 2.6;
const POINT_DURATION = 2.4;
const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

/** Calibrated for the bundled KayKit arm: +Y follows each bone, in chest space.
 * No IK/control bones, joint translations, scale or finger/facial rig are changed. */
export function createCompanionWave(scene: Group) {
  const upper = scene.getObjectByName('upperarmr');
  const lower = scene.getObjectByName('lowerarmr');
  const wrist = scene.getObjectByName('wristr');
  const hand = scene.getObjectByName('handr');
  const supported = !!upper && upper.parent?.name === 'chest' && lower?.parent === upper
    && wrist?.parent === lower && hand?.parent === wrist
    && [upper, lower, wrist, hand].every(joint => joint?.type === 'Bone');
  const joints = supported ? [upper!, lower!, wrist!] : [];
  const y = new Vector3(0, 1, 0);
  const direction = new Vector3();
  const correction = new Quaternion();
  const upperTarget = new Quaternion();
  const lowerTarget = new Quaternion();
  const inverseUpper = new Quaternion();
  const wristOffset = new Quaternion();
  let elapsed: number | null = null;
  let disposed = false;
  let includePoint = false;
  // Correct direction while retaining the authored twist about the bone.
  const aim = (authored: Quaternion, target: Vector3, result: Quaternion) => {
    direction.copy(y).applyQuaternion(authored).normalize();
    correction.setFromUnitVectors(direction, target.normalize());
    return result.copy(authored).premultiply(correction);
  };
  const upperDirection = new Vector3(-0.72, -0.60, 0.24);
  const lowerDirection = new Vector3();
  return {
    joints,
    reset() { elapsed = null; disposed = false; },
    start(reduceMotion = false, point = false) {
      if (!supported || disposed || reduceMotion || elapsed !== null) return false;
      elapsed = 0;
      includePoint = point;
      return true;
    },
    active: () => elapsed !== null,
    pointing: () => elapsed !== null && includePoint && elapsed >= DURATION,
    cancel() { elapsed = null; },
    apply(delta: number) {
      if (elapsed === null) return 0;
      elapsed += Number.isFinite(delta) ? Math.max(0, Math.min(delta, 0.1)) : 0;
      if (elapsed >= DURATION + (includePoint ? POINT_DURATION : 0)) { elapsed = null; return 0; }
      if (includePoint && elapsed >= DURATION) {
        const time = elapsed - DURATION;
        const weight = smooth(time / 0.6) * smooth((POINT_DURATION - time) / 0.6);
        // Downward directional arm cue, slightly forward to clear the hip/backpack.
        // The mitten hand has no index-finger rig; the actual button is highlighted.
        aim(upper!.quaternion, upperDirection.set(-0.85, -0.45, 0.22), upperTarget);
        inverseUpper.copy(upperTarget).invert();
        lowerDirection.set(0.18, -1, 0.42).normalize().applyQuaternion(inverseUpper);
        aim(lower!.quaternion, lowerDirection, lowerTarget);
        upper!.quaternion.slerp(upperTarget, weight);
        lower!.quaternion.slerp(lowerTarget, weight);
        return weight;
      }
      const weight = smooth(elapsed / 0.6) * smooth((DURATION - elapsed) / 0.6);
      const phase = Math.max(0, Math.min(1, (elapsed - 0.6) / 1.4));
      const swing = Math.sin(phase * Math.PI * 4);
      aim(upper!.quaternion, upperDirection.set(-0.72, -0.60, 0.24), upperTarget);
      // Aim the forearm upward and slightly forward, relative to the raised shoulder.
      inverseUpper.copy(upperTarget).invert();
      lowerDirection.set(-0.10 + swing * 0.18, 1, 0.18).normalize().applyQuaternion(inverseUpper);
      aim(lower!.quaternion, lowerDirection, lowerTarget);
      upper!.quaternion.slerp(upperTarget, weight);
      lower!.quaternion.slerp(lowerTarget, weight);
      wristOffset.setFromAxisAngle(y, swing * 0.12 * weight);
      wrist!.quaternion.multiply(wristOffset);
      return weight;
    },
    dispose() { elapsed = null; disposed = true; },
  };
}
