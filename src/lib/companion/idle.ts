import { AnimationMixer, Euler, Quaternion, type AnimationClip, type Group, type Object3D } from 'three';
import { createCompanionWave } from './wave';

/** Add only upper-body motion; authored hip/leg/foot tracks keep ownership of the stance. */
export function createCompanionIdle(scene: Group, animations: AnimationClip[]) {
  const mixer = new AnimationMixer(scene);
  const clip = animations.find(animation => animation.name === 'Idle');
  const chest = scene.getObjectByName('chest');
  const head = scene.getObjectByName('head');
  const wave = createCompanionWave(scene);
  const joints = [chest, head, ...wave.joints].filter((joint): joint is Object3D => joint !== undefined).map(joint => ({
    joint, rotation: joint.quaternion.clone(), position: joint.position.clone(),
  }));
  const offset = new Quaternion();
  const angles = new Euler();
  let elapsed = 0;
  const restore = () => joints.forEach(({ joint, rotation, position }) => { joint.quaternion.copy(rotation); joint.position.copy(position); });
  const capture = () => joints.forEach(pose => { pose.rotation.copy(pose.joint.quaternion); pose.position.copy(pose.joint.position); });
  return {
    reset() {
      wave.reset();
      restore();
      mixer.stopAllAction();
      if (clip) { const action = mixer.clipAction(clip); action.reset().play(); action.timeScale = 0.4; }
      mixer.setTime(0);
      elapsed = 0;
      capture();
    },
    startWave: (reduceMotion = false) => wave.start(reduceMotion),
    startGreeting: (reduceMotion = false) => wave.start(reduceMotion, true),
    isPointing: wave.pointing,
    isWaving: wave.active,
    cancelWave() { restore(); wave.cancel(); },
    advance(seconds: number) {
      const delta = Number.isFinite(seconds) ? Math.max(0, Math.min(seconds, 0.1)) : 0;
      // Constant animation tracks may skip reassigning a joint. Restore the last authored
      // pose BEFORE sampling so procedural quaternions/translations never accumulate.
      restore();
      mixer.update(delta);
      capture();
      elapsed += delta;
      const waveWeight = wave.apply(delta);
      const bodyWeight = 1 - waveWeight * 0.65;
      if (chest) {
        const breath = Math.sin(elapsed * 2 * Math.PI / 3.8);
        angles.set(breath * 0.035, 0, Math.sin(elapsed * 2 * Math.PI / 6.4) * 0.022);
        angles.x *= bodyWeight; angles.z *= bodyWeight;
        chest.quaternion.multiply(offset.setFromEuler(angles));
        chest.position.y += breath * 0.018 * bodyWeight;
      }
      if (head) {
        angles.set(Math.sin(elapsed * 2 * Math.PI / 4.8) * 0.035, Math.sin(elapsed * 2 * Math.PI / 6.8) * 0.065, 0);
        angles.x *= bodyWeight; angles.y *= bodyWeight;
        head.quaternion.multiply(offset.setFromEuler(angles));
      }
    },
    dispose() { restore(); wave.dispose(); mixer.stopAllAction(); mixer.uncacheRoot(scene); },
  };
}
