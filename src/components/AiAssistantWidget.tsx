import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, useProgress } from '@react-three/drei';
import DigitalAvatar from './DigitalAvatar';

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{ color: '#0046ff', fontWeight: '600', whiteSpace: 'nowrap', fontFamily: 'Outfit', background: 'rgba(255,255,255,0.8)', padding: '8px 16px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        Loading 3D Model Data: {progress.toFixed(0)}%
      </div>
    </Html>
  );
}

function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 1.35, 1.8); // Cao lên 1.35m, lùi ra xa 1.8m
    camera.lookAt(0, 1.0, 0); // Nhìn bao quát từ thân trên
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

export default function AiAssistantWidget({ textToSpeak, onAudioEnd, onTextInput }: { textToSpeak: string, onAudioEnd?: () => void, onTextInput?: (t: string) => void }) {
  const [triggerCount, setTriggerCount] = useState(0);
  const [isActuallyTalking, setIsActuallyTalking] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.onended = () => {
        setIsActuallyTalking(false);
        if (onAudioEnd) onAudioEnd();
    };
    audio.onpause = () => {
        setIsActuallyTalking(false);
    };
    audioRef.current = audio;

    const handlePlay = () => {
        setIsActuallyTalking(true);
        if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 1024;
            analyserRef.current.smoothingTimeConstant = 0.8;
            sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
            sourceRef.current.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);
        }
    };
    audio.addEventListener('playing', handlePlay);
    return () => { 
        audio.removeEventListener('playing', handlePlay); 
        audio.pause();
        setIsActuallyTalking(false);
    }
  }, []);

  useEffect(() => {
    if (textToSpeak && audioRef.current) {
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        
        const dashscopeKey = import.meta.env.VITE_DASHSCOPE_API_KEY;
        if (dashscopeKey) {
            // Use the Python Proxy Server running locally on port 5000
            audioRef.current.src = `/api/cosyvoice?q=${encodeURIComponent(textToSpeak)}`;
            audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
        } else {
            // Fallback to Google Translate TTS
            audioRef.current.src = `/tts?client=gtx&ie=UTF-8&tl=en&q=${encodeURIComponent(textToSpeak)}`;
            audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
        }
    } else if (!textToSpeak && audioRef.current) {
        audioRef.current.pause();
    }
  }, [textToSpeak]);

  const handleAvatarClick = () => {
    setTriggerCount(c => c + 1);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div style={{ flex: 1, position: 'relative', background: '#ffffff', borderRadius: '12px', overflow: 'hidden', minHeight: '300px' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Canvas 
            onClick={handleAvatarClick} 
            gl={{ alpha: true, antialias: true }}
            camera={{ position: [0, 1.45, 1.0], fov: 35, near: 0.1, far: 10 }}
          >
            <CameraSetup />
            <color attach="background" args={['#ffffff']} />
            <fog attach="fog" args={['#ffffff', 5, 15]} />
            
            <directionalLight position={[2, 3, 3]} intensity={1.2} />
            <ambientLight intensity={1.0} color="#ffffff" />
            <pointLight position={[0, 1.2, 1]} intensity={0.5} color="#00E5D1" distance={3} />

            <Suspense fallback={<Loader />}>
              <DigitalAvatar 
                url="/Test.vrm" 
                textToSpeak={textToSpeak}
                isSpeaking={isActuallyTalking}
                triggerCount={triggerCount}
                analyserRef={analyserRef}
                disableTracking={true}
              />
            </Suspense>
          </Canvas>
        </div>

        {textToSpeak && (
          <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontWeight: 500, fontSize: '0.95rem', lineHeight: 1.5, textAlign: 'center', border: '1px solid #eee' }}>
            {textToSpeak}
          </div>
        )}
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '8px', zIndex: 10 }}>
        <input 
          type="text" 
          placeholder="Type to ask Shinhan AI Advisor..." 
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onTextInput) {
              onTextInput(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
          style={{ flex: 1, padding: '14px 20px', borderRadius: '24px', border: '1px solid #ddd', fontSize: '0.95rem', outline: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
        />
        <button 
          onClick={(e) => {
            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
            if (input && input.value && onTextInput) {
              onTextInput(input.value);
              input.value = '';
            }
          }}
          style={{ background: 'var(--shinhan-blue)', color: 'white', border: 'none', borderRadius: '50%', width: '46px', height: '46px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>
    </div>
  );
}
