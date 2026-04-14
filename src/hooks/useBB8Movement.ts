import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

// Interpolation helper
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function useBB8Movement(vrm: any, isEnabled: boolean) {
  const [targetPos, setTargetPos] = useState({ x: 0, y: 0 });
  const [mouseNorm, setMouseNorm] = useState({ x: 0, y: 0 });
  const currentVelRef = useRef(0);
  const headRotYRef = useRef(0);
  const walkCycleTimeRef = useRef(0);

  useEffect(() => {
    if (!isEnabled) return;
    
    const onMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates (-1 to +1)
      setMouseNorm({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1
      });

      // Target world position X based on mouse X mapping to camera view
      const mappedX = (e.clientX / window.innerWidth) * 4 - 2;
      setTargetPos({ x: mappedX, y: 0 });
    };

    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [isEnabled]);

  // We return a function to be called in useFrame
  const updateBB8 = (delta: number, elapsed: number, isWalking: boolean, hasVRMA: boolean, avatarState: 'walking' | 'engaged' | 'talking') => {
    if (!vrm) return;
    const scene = vrm.scene;
    const humanoid = vrm.humanoid;

    // Movement Logic
    if (avatarState === 'walking') {
      const dist = targetPos.x - scene.position.x;
      const willWalk = Math.abs(dist) > 0.05;
      
      let targetVel = 0;
      if (willWalk) {
        targetVel = Math.sign(dist) * Math.min(Math.abs(dist) * 2.0, 1.2);
      }
      
      currentVelRef.current += (targetVel - currentVelRef.current) * (willWalk ? 0.08 : 0.15);
      scene.position.x += currentVelRef.current * delta;

      const anticipationTilt = willWalk ? targetVel * 0.15 : 0;
      const moveTilt = -currentVelRef.current * 8 + anticipationTilt * 0.4;
      scene.rotation.z = lerp(scene.rotation.z, moveTilt * 0.15, 0.08);

      // Body facing mouse
      const dxMouse = targetPos.x - scene.position.x;
      const bodyTargetY = Math.atan2(dxMouse, 3.5);
      scene.rotation.y = lerp(scene.rotation.y, bodyTargetY, 0.06);
    } else {
      // Return to center when engaged/talking
      const lerpT = 1 - Math.exp(-3 * delta);
      scene.position.x = lerp(scene.position.x, 0, lerpT);
      scene.rotation.y = lerp(scene.rotation.y, 0, lerpT);
      scene.rotation.z = lerp(scene.rotation.z, 0, lerpT);
    }

    // Procedural Bones
    if (!hasVRMA && humanoid) {
      if (avatarState === 'walking') {
        walkCycleTimeRef.current += delta;
        const cycle = walkCycleTimeRef.current * 2.0 * Math.PI * 2;
        
        // Leg swing
        const rLeg = humanoid.getNormalizedBoneNode('rightUpperLeg');
        const lLeg = humanoid.getNormalizedBoneNode('leftUpperLeg');
        if (rLeg) rLeg.rotation.x = lerp(rLeg.rotation.x, Math.sin(cycle) * 0.4, 0.18);
        if (lLeg) lLeg.rotation.x = lerp(lLeg.rotation.x, Math.sin(cycle + Math.PI) * 0.4, 0.18);
        
        // Arm swing
        const rArm = humanoid.getNormalizedBoneNode('rightUpperArm');
        const lArm = humanoid.getNormalizedBoneNode('leftUpperArm');
        if (rArm) rArm.rotation.x = lerp(rArm.rotation.x, Math.sin(cycle + Math.PI) * 0.2, 0.18);
        if (lArm) lArm.rotation.x = lerp(lArm.rotation.x, Math.sin(cycle) * 0.2, 0.18);
      } else {
        // Reset to idle pose
        ['rightUpperLeg', 'leftUpperLeg', 'rightUpperArm', 'leftUpperArm'].forEach(bone => {
          const node = humanoid.getNormalizedBoneNode(bone);
          if (node) node.rotation.x = lerp(node.rotation.x, 0, 0.1);
        });
        
        // Idle breathing
        const spine = humanoid.getRawBoneNode('spine');
        const chest = humanoid.getRawBoneNode('chest');
        const breath = Math.sin(elapsed * 1.8) * 0.015;
        if (spine) spine.rotation.x = lerp(spine.rotation.x, breath, 0.1);
        if (chest) chest.rotation.x = lerp(chest.rotation.x, breath * 0.5, 0.1);
      }

      // Head Tracking
      const head = humanoid.getRawBoneNode('head');
      if (head) {
        headRotYRef.current += (mouseNorm.x * 0.8 - headRotYRef.current) * 0.1;
        head.rotation.y = lerp(head.rotation.y, headRotYRef.current, 0.12);
        head.rotation.x = lerp(head.rotation.x, -mouseNorm.y * 0.25, 0.1);
      }
    }
  };

  return { updateBB8 };
}
