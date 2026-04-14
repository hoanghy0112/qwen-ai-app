import { useState, useEffect, useRef } from 'react';
import { VRMExpressionManager } from '@pixiv/three-vrm';

type LipFrame = {
  shape: string;
  duration: number;
  weight: number;
};

// Simplified translation rules from Vietnamese basic vowels
const textToLipQueue = (text: string): LipFrame[] => {
  const words = text.toLowerCase().split(/\s+/);
  const queue: LipFrame[] = [];
  
  words.forEach(word => {
    if (word.includes('a')) queue.push({ shape: 'aa', duration: 0.15, weight: 1.0 });
    else if (word.includes('e')) queue.push({ shape: 'ee', duration: 0.15, weight: 1.0 });
    else if (word.includes('i')) queue.push({ shape: 'ih', duration: 0.1, weight: 0.8 });
    else if (word.includes('o')) queue.push({ shape: 'oh', duration: 0.15, weight: 1.0 });
    else if (word.includes('u')) queue.push({ shape: 'ou', duration: 0.15, weight: 1.0 });
    else queue.push({ shape: 'nn', duration: 0.1, weight: 0.5 }); // default
  });
  
  if (queue.length === 0) queue.push({ shape: 'nn', duration: 0.1, weight: 0.1 });
  return queue;
};

export function useLipSync(expressionManager: VRMExpressionManager | undefined, textToSpeak: string) {
  const queueRef = useRef<LipFrame[]>([]);
  const indexRef = useRef(0);
  const timerRef = useRef(0);
  
  const currentShapeRef = useRef<Record<string, number>>({
    aa: 0, ee: 0, ih: 0, oh: 0, ou: 0, nn: 0
  });

  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (textToSpeak) {
      queueRef.current = textToLipQueue(textToSpeak);
      indexRef.current = 0;
      timerRef.current = 0;
      setIsSpeaking(true);
    } else {
      setIsSpeaking(false);
    }
  }, [textToSpeak]);

  const updateLipSync = (delta: number) => {
    if (!expressionManager) return;
    
    // Determine target weights
    const targets: Record<string, number> = { aa: 0, ee: 0, ih: 0, oh: 0, ou: 0, nn: 0 };
    
    if (isSpeaking && indexRef.current < queueRef.current.length) {
      const currentFrame = queueRef.current[indexRef.current];
      targets[currentFrame.shape] = currentFrame.weight;
      
      timerRef.current += delta;
      if (timerRef.current >= currentFrame.duration) {
        timerRef.current = 0;
        indexRef.current++;
        if (indexRef.current >= queueRef.current.length) {
          setIsSpeaking(false);
        }
      }
    }

    // Smoothly interpolate current shapes towards targets
    Object.keys(currentShapeRef.current).forEach(shape => {
      // Lerp logic
      currentShapeRef.current[shape] += (targets[shape] - currentShapeRef.current[shape]) * 0.25;
      expressionManager.setValue(shape, currentShapeRef.current[shape]);
    });
  };

  return { updateLipSync, isSpeaking };
}
