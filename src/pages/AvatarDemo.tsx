import React, { useState, Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import DigitalAvatar from '../components/DigitalAvatar';
import * as THREE from 'three';

function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 30;
      camera.updateProjectionMatrix();
    }
    camera.position.set(0, 1.1, 2.2);
    camera.lookAt(0, 1.0, 0);
  }, [camera]);
  return null;
}

function Particles() {
  const count = 50;
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 8;
      p[i * 3 + 1] = Math.random() * 4;
      p[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return p;
  }, []);
  
  const speeds = useMemo(() => Array.from({length: count}, () => 0.2 + Math.random() * 0.5), []);
  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const p = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
        p[i * 3 + 1] += delta * speeds[i] * 0.2;
        if (p[i * 3 + 1] > 4) p[i * 3 + 1] = 0;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#00E5D1" size={0.03} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
    </points>
  );
}

export default function AvatarDemo() {
  const [textToSpeak, setTextToSpeak] = useState('');
  const [triggerCount, setTriggerCount] = useState(0);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.onended = () => {
        setTextToSpeak('');
    };
    audioRef.current = audio;

    const handlePlay = () => {
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
    audio.addEventListener('play', handlePlay);
    return () => { audio.removeEventListener('play', handlePlay); audio.pause(); }
  }, []);

  const speakText = (text: string) => {
    setTextToSpeak(text);
    if (audioRef.current) {
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        audioRef.current.src = `/tts?client=gtx&ie=UTF-8&tl=en&q=${encodeURIComponent(text)}`;
        audioRef.current.play();
    }
  };

  const handleSpeakClick = () => {
    speakText('Hello! I detected you just made a transaction at Traveloka. Would you like to activate Shinhan Gold travel insurance?');
    setTriggerCount(c => c + 1);
  };

  const handleWaveClick = () => {
    setTextToSpeak('');
    setTriggerCount(c => c + 1);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div className="logo">SHINHAN <span>SOL</span></div>
      
      <button className="trigger-button" onClick={handleSpeakClick}>Simulate Transaction</button>

      <div id="ui-overlay">
        <div className={`advisor-card ${textToSpeak ? 'visible' : ''}`} id="advisor-card">
          <div className="advisor-header">
            <div className="avatar-indicator"></div>
            <div className="advisor-name">SHINHAN AI ADVISOR</div>
          </div>
          <div className="advisor-text">{textToSpeak || 'Hello. How can I assist you?'}</div>
          <div className="btn-group">
            <button className="btn" onClick={handleWaveClick}>Wave</button>
            <button className="btn btn-outline" onClick={() => { setTextToSpeak(''); audioRef.current?.pause(); }}>Skip</button>
          </div>
        </div>

        <div className="input-bar">
          <input 
            type="text" 
            placeholder="Type text for avatar to speak..." 
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                speakText(e.currentTarget.value);
                setTriggerCount(c => c + 1);
                e.currentTarget.value = '';
              }
            }}
          />
          <button onClick={(e) => {
            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
            if (input && input.value) {
                speakText(input.value);
                setTriggerCount(c => c + 1);
                input.value = '';
            }
          }}>Send</button>
        </div>
      </div>

      <Canvas
        onClick={handleWaveClick}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        gl={{ alpha: true, antialias: true }}
      >
        <CameraSetup />
        
        <color attach="background" args={['#0a0a1a']} />
        <fog attach="fog" args={['#0a0a1a', 5, 15]} />
        
        {/* EXACT LIGHTING FROM MAIN.TS */}
        <directionalLight position={[2, 3, 3]} intensity={0.8} />
        <directionalLight position={[-2.5, 1.5, 2]} intensity={0.4} color="#88aaff" />
        <directionalLight position={[0, 2, -3]} intensity={0.4} color="#00E5D1" />
        <directionalLight position={[0, 4, 1]} intensity={0.2} color="#ffffff" />
        <directionalLight position={[1, -1, 2]} intensity={0.2} color="#ffa500" />
        <ambientLight intensity={0.4} color="#ffffff" />
        <pointLight position={[0, 1.2, 1]} intensity={0.4} color="#00E5D1" distance={3} />
        
        <Particles />

        {/* Glow Ring and Ground */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3, 0.5, 64]} />
            <meshBasicMaterial color="#00E5D1" transparent opacity={0.3} side={2} />
        </mesh>
        
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[20, 10]} />
            <meshStandardMaterial color="#0a0a1a" transparent opacity={0.5} roughness={0.8} metalness={0.2} />
        </mesh>

        <Suspense fallback={null}>
          <DigitalAvatar 
            url="/Test.vrm" 
            textToSpeak={textToSpeak}
            triggerCount={triggerCount}
            analyserRef={analyserRef}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
