import React, { useEffect, useState, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm";
import * as THREE from "three";
import { useVRMAnimations } from "three-vrm-utils/use-vrm-animations";

// Mixamo Remapping Removed - Using native useVRMModel

// ===== EXACT BB-8 GLOBALS FROM main.ts =====
let mouseNormX = 0,
  mouseNormY = 0,
  targetX = 0;
let velX = 0,
  anticipationTilt = 0,
  prevTargetX = 0;
let microOffsetX = 0,
  microOffsetTimer = 0,
  hoverProximity = 0,
  headCurrentRotY = 0;
let isWalking = false,
  isPausing = false,
  walkCycleTime = 0;

let lipQueue: { vowel: string; duration: number }[] = [];
let lipIndex = 0,
  lipTimer = 0,
  isSpeaking = false;
let mouthTarget = { aa: 0, ee: 0, ih: 0, oh: 0, ou: 0 };
let mouthCurrent = { aa: 0, ee: 0, ih: 0, oh: 0, ou: 0 };
let currentHappyValue = 0,
  moodTransition = 0;
let avatarState: "walking" | "pausing" | "engaged" | "talking" = "walking";
let currentMood: "neutral" | "happy" | "talking" = "neutral";

if (typeof window !== "undefined") {
  window.addEventListener("mousemove", (event) => {
    mouseNormX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseNormY = -(event.clientY / window.innerHeight) * 2 + 1;
    targetX = mouseNormX * (1.5 + 1.5);
  });
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

import { useVRMModel } from "three-vrm-utils/use-vrm-model";
import { useVRMVowelAnalyser } from "three-vrm-utils/use-vrm-vowel-analyser";
import { useVRMBreathing } from "three-vrm-utils/use-vrm-breathing";
import { useVRMExpressionManager } from "three-vrm-utils/use-vrm-expression-manager";
import { useVRMBlink } from "three-vrm-utils/use-vrm-blink";

function resetMouthTargets() {
  mouthTarget = { aa: 0, ee: 0, ih: 0, oh: 0, ou: 0 };
}

const animationMotions = {
  idle: "/animations/Idle.vrma",
  wave: "/animations/Waving.vrma",
  wave1: "/animations/Waving (1).vrma",
  talk: "/animations/Talking.vrma",
  talk1: "/animations/Talking (1).vrma",
};

// ====== REACT COMPONENT ======
export default function DigitalAvatar({
  url,
  textToSpeak,
  isSpeaking,
  triggerCount,
  analyserRef,
  disableTracking,
}: {
  url: string;
  textToSpeak: string;
  isSpeaking: boolean;
  triggerCount: number;
  analyserRef?: React.RefObject<AnalyserNode | null>;
  disableTracking?: boolean;
}) {
  const [, vrm] = useVRMModel(url);
  if (!vrm) return null;

  return (
    <DigitalAvatarInner
      vrm={vrm}
      textToSpeak={textToSpeak}
      isSpeaking={isSpeaking}
      triggerCount={triggerCount}
      analyserRef={analyserRef}
      disableTracking={disableTracking}
    />
  );
}

function DigitalAvatarInner({
  vrm,
  textToSpeak,
  isSpeaking,
  triggerCount,
  analyserRef,
  disableTracking,
}: {
  vrm: any;
  textToSpeak: string;
  isSpeaking: boolean;
  triggerCount: number;
  analyserRef?: React.RefObject<AnalyserNode | null>;
  disableTracking?: boolean;
}) {
  const activeAnimRef = useRef<THREE.AnimationAction | null>(null);

  useVRMBreathing(vrm, {
    bpm: 18,
    intensity: 0.01,
  });

  useVRMBlink(vrm, {
    minInterval: 2.5,
    maxInterval: 5.5,
    doubleBlinkChance: 0.12,
  });

  const { send } = useVRMExpressionManager(vrm);
  const { actions } = useVRMAnimations(vrm, animationMotions);

  useEffect(() => {
    if (!vrm) return;
    const rUA = vrm.humanoid?.getNormalizedBoneNode("rightUpperArm");
    const lUA = vrm.humanoid?.getNormalizedBoneNode("leftUpperArm");
    const rLA = vrm.humanoid?.getNormalizedBoneNode("rightLowerArm");
    const lLA = vrm.humanoid?.getNormalizedBoneNode("leftLowerArm");
    if (rUA) rUA.rotation.z = 1.2;
    if (lUA) lUA.rotation.z = -1.2;
    if (rLA) rLA.rotation.z = 0.15;
    if (lLA) lLA.rotation.z = -0.15;
  }, [vrm]);

  useVRMVowelAnalyser(analyserRef as any, (vowels) => {
    if (!vrm) return;
    const manager = vrm.expressionManager;
    if (!manager) return;
    manager.setValue("aa", vowels.aa * 0.8);
    manager.setValue("ee", vowels.ee * 0.8);
    manager.setValue("ih", vowels.ih * 0.8);
    manager.setValue("oh", vowels.oh * 0.8);
    manager.setValue("ou", vowels.ou * 0.8);
    manager.update();
  });

  const prevTriggerRef = useRef(triggerCount);

  useEffect(() => {
    if (!vrm || !actions) return;

    let targetAction: THREE.AnimationAction | undefined;

    if (isSpeaking) {
      avatarState = "talking";
      currentMood = "talking";
      moodTransition = 1;
      targetAction =
        actions.talk && actions.talk1
          ? Math.random() > 0.5
            ? actions.talk
            : actions.talk1
          : actions.talk;
      send({ happy: { value: 0.4 } });
    } else if (triggerCount > prevTriggerRef.current) {
      targetAction =
        actions.wave && actions.wave1
          ? Math.random() > 0.5
            ? actions.wave
            : actions.wave1
          : actions.wave;
      if (targetAction) {
        targetAction.setLoop(THREE.LoopOnce, 1).clampWhenFinished = true;
      }
      send({ happy: { value: 1, hold: 2, decay: 0.5 } });
    } else {
      avatarState = "pausing";
      targetAction = actions.idle;
    }

    prevTriggerRef.current = triggerCount;

    if (targetAction && activeAnimRef.current !== targetAction) {
      if (activeAnimRef.current) activeAnimRef.current.fadeOut(0.3);
      targetAction.reset().fadeIn(0.3).play();
      activeAnimRef.current = targetAction;

      if (targetAction === actions.wave || targetAction === actions.wave1) {
        const onFinished = (e: any) => {
          if (e.action === targetAction && actions.idle) {
            targetAction?.fadeOut(0.3);
            actions.idle.reset().fadeIn(0.3).play();
            activeAnimRef.current = actions.idle;
          }
        };
        targetAction.getMixer().addEventListener("finished", onFinished);
        return () =>
          targetAction?.getMixer().removeEventListener("finished", onFinished);
      }
    }
  }, [isSpeaking, triggerCount, vrm, send, actions]);

  useFrame((state, delta) => {
    if (!vrm) return;
    const elapsed = state.clock.elapsedTime;

    const setExpression = (name: string, value: number) => {
      vrm.expressionManager?.setValue(name as any, value);
    };

    const effectiveDisableTracking = disableTracking || false;
    if (effectiveDisableTracking) {
      mouseNormX = 0;
      mouseNormY = 0;
      targetX = 0;
    }

    // --- BB-8 STYLE PHYSICS MOVEMENT ---
    if (avatarState === "walking" || avatarState === "pausing") {
      const rx = vrm.scene.position.x;
      microOffsetTimer += delta;
      if (microOffsetTimer > 1.8 + Math.random() * 1.5) {
        microOffsetX = (Math.random() - 0.5) * 0.3;
        microOffsetTimer = 0;
      }
      const effectiveTargetX = targetX + microOffsetX;
      const targetDelta = effectiveTargetX - prevTargetX;
      prevTargetX += (effectiveTargetX - prevTargetX) * 0.05;
      anticipationTilt += (-targetDelta * 0.3 - anticipationTilt) * 0.15;

      const robotScreenX = rx / (1.5 + 1.5);
      const mouseDist = Math.abs(mouseNormX - robotScreenX);
      const targetProximity = mouseDist < 0.25 ? 1 - mouseDist / 0.25 : 0;
      hoverProximity += (targetProximity - hoverProximity) * 0.06;
      const magnetBoost = 1.0 + hoverProximity * 1.2;

      const dx = effectiveTargetX - rx;
      if (Math.abs(dx) > 0.2) {
        velX += dx * 0.0006 * magnetBoost;
        isWalking = true;
        isPausing = false;
        avatarState = "walking";
      } else {
        isWalking = false;
        isPausing = true;
        avatarState = "pausing";
      }
      velX *= 0.9;
      velX = Math.max(-0.01, Math.min(0.01, velX));
      vrm.scene.position.x += velX;
      vrm.scene.position.x = Math.max(
        -1.5,
        Math.min(1.5, vrm.scene.position.x),
      );

      vrm.scene.rotation.z = lerp(
        vrm.scene.rotation.z,
        -velX * 8 + anticipationTilt * 0.4 * 0.15,
        0.08,
      );
    } else {
      const lerpT = 1 - Math.exp(-3 * delta);
      vrm.scene.position.x = lerp(vrm.scene.position.x, 0, lerpT);
      vrm.scene.rotation.y = lerp(vrm.scene.rotation.y, 0, lerpT);
      vrm.scene.rotation.z = lerp(vrm.scene.rotation.z, 0, lerpT);
      velX = 0;
      isWalking = false;
      isPausing = false;
    }

    // --- PROCEDURAL BONE ANIMATIONS ---
    const activeClipName = activeAnimRef.current?.getClip()?.name || "";
    if (!activeClipName || activeClipName.includes("idle")) {
      const walking = avatarState === "walking" && isWalking;
      const hips = vrm.humanoid?.getRawBoneNode("hips");
      const spine = vrm.humanoid?.getRawBoneNode("spine");
      const chest = vrm.humanoid?.getRawBoneNode("chest");
      const neck = vrm.humanoid?.getRawBoneNode("neck");
      const head = vrm.humanoid?.getRawBoneNode("head");
      const lUpperLeg = vrm.humanoid?.getNormalizedBoneNode("leftUpperLeg");
      const rUpperLeg = vrm.humanoid?.getNormalizedBoneNode("rightUpperLeg");
      const lLowerLeg = vrm.humanoid?.getNormalizedBoneNode("leftLowerLeg");
      const rLowerLeg = vrm.humanoid?.getNormalizedBoneNode("rightLowerLeg");
      const lUpperArm = vrm.humanoid?.getNormalizedBoneNode("leftUpperArm");
      const rUpperArm = vrm.humanoid?.getNormalizedBoneNode("rightUpperArm");
      const lLowerArm = vrm.humanoid?.getNormalizedBoneNode("leftLowerArm");
      const rLowerArm = vrm.humanoid?.getNormalizedBoneNode("rightLowerArm");

      if (walking) {
        walkCycleTime += delta;
        const cycleAngle = walkCycleTime * 2.0 * Math.PI * 2;
        const smooth = 0.18;

        if (lUpperLeg && rUpperLeg) {
          const rLegSwing = Math.sin(cycleAngle) * 0.45;
          rUpperLeg.rotation.x = lerp(rUpperLeg.rotation.x, rLegSwing, smooth);
          if (rLowerLeg)
            rLowerLeg.rotation.x = lerp(
              rLowerLeg.rotation.x,
              rLegSwing > 0 ? rLegSwing * 0.5 : 0.05,
              smooth,
            );
          const lLegSwing = Math.sin(cycleAngle + Math.PI) * 0.45;
          lUpperLeg.rotation.x = lerp(lUpperLeg.rotation.x, lLegSwing, smooth);
          if (lLowerLeg)
            lLowerLeg.rotation.x = lerp(
              lLowerLeg.rotation.x,
              lLegSwing > 0 ? lLegSwing * 0.5 : 0.05,
              smooth,
            );
        }

        if (hips) {
          hips.position.y = lerp(
            hips.position.y,
            Math.abs(Math.sin(cycleAngle)) * 0.025,
            smooth,
          );
          hips.rotation.z = lerp(
            hips.rotation.z,
            Math.sin(cycleAngle) * 0.04,
            smooth,
          );
          hips.rotation.x = lerp(hips.rotation.x, 0.02, smooth);
        }

        if (lUpperArm && rUpperArm) {
          const lAS = Math.sin(cycleAngle) * 0.35;
          lUpperArm.rotation.x = lerp(lUpperArm.rotation.x, lAS, smooth);
          lUpperArm.rotation.z = lerp(lUpperArm.rotation.z, -1.2, smooth);
          if (lLowerArm)
            lLowerArm.rotation.z = lerp(
              lLowerArm.rotation.z,
              -0.15 + Math.abs(lAS) * 0.08,
              smooth,
            );
          const rAS = Math.sin(cycleAngle + Math.PI) * 0.35;
          rUpperArm.rotation.x = lerp(rUpperArm.rotation.x, rAS, smooth);
          rUpperArm.rotation.z = lerp(rUpperArm.rotation.z, 1.2, smooth);
          if (rLowerArm)
            rLowerArm.rotation.z = lerp(
              rLowerArm.rotation.z,
              0.15 - Math.abs(rAS) * 0.08,
              smooth,
            );
        }

        if (spine) {
          spine.rotation.z = lerp(
            spine.rotation.z,
            -Math.sin(cycleAngle) * 0.04 * 0.3,
            smooth,
          );
          spine.rotation.x = lerp(spine.rotation.x, 0.01, smooth);
          spine.rotation.y = lerp(
            spine.rotation.y,
            Math.sin(cycleAngle) * 0.04,
            smooth,
          );
        }
        if (chest) {
          chest.rotation.z = lerp(
            chest.rotation.z,
            -Math.sin(cycleAngle) * 0.04 * 0.2,
            smooth,
          );
          chest.rotation.y = lerp(
            chest.rotation.y,
            Math.sin(cycleAngle) * 0.05,
            smooth,
          );
        }
      } else {
        walkCycleTime = 0;
      }

      if (head) {
        const headTargetY = effectiveDisableTracking
          ? 0
          : mouseNormX * (walking ? 0.4 : 0.8);
        headCurrentRotY +=
          (headTargetY - headCurrentRotY) * (walking ? 0.06 : 0.1);
        head.rotation.y = lerp(
          head.rotation.y,
          headCurrentRotY +
            (!walking && !effectiveDisableTracking
              ? Math.sin(elapsed * 0.9) * 0.01
              : 0),
          0.12,
        );
        head.rotation.x = lerp(
          head.rotation.x,
          (!walking
            ? Math.sin(elapsed * 1.2) * 0.02 + Math.sin(elapsed * 0.7) * 0.008
            : 0) -
            (effectiveDisableTracking
              ? 0
              : mouseNormY * (walking ? 0.15 : 0.25)),
          0.1,
        );
      }
      if (neck && !walking && !effectiveDisableTracking) {
        neck.rotation.y = lerp(
          neck.rotation.y,
          mouseNormX * 0.15 + Math.sin(elapsed * 0.3) * 0.02,
          0.08,
        );
      }

      if (hips && !walking && avatarState === "pausing") {
        hips.rotation.y = Math.sin(elapsed * 0.25) * 0.015;
      }
    }

    if (avatarState === "walking" || avatarState === "pausing") {
      const bodyTargetY = Math.atan2(targetX - vrm.scene.position.x, 3.5);
      vrm.scene.rotation.y = lerp(vrm.scene.rotation.y, bodyTargetY, 0.06);
      if (avatarState === "pausing")
        vrm.scene.rotation.z = lerp(vrm.scene.rotation.z, 0, 0.06);
    }

    vrm.update(delta);
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
}
