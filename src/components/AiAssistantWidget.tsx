import React, { useState, useEffect, useRef, Suspense } from 'react';
import { api } from '../lib/api';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, useProgress } from '@react-three/drei';
import DigitalAvatar from './DigitalAvatar';

// Chuyển số sang chữ tiếng Anh để TTS đọc đúng
function numberToWords(n: number): string {
  if (n === 0) return 'zero';
  const units = ['','one','two','three','four','five','six','seven','eight','nine',
    'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  function chunk(x: number): string {
    if (x === 0) return '';
    if (x < 20) return units[x];
    if (x < 100) return tens[Math.floor(x/10)] + (x%10 ? ' '+units[x%10] : '');
    return units[Math.floor(x/100)] + ' hundred' + (x%100 ? ' '+chunk(x%100) : '');
  }
  const scales: [number,string][] = [[1e9,'billion'],[1e6,'million'],[1e3,'thousand']];
  let result = '';
  let rem = n;
  for (const [val,label] of scales) {
    if (rem >= val) { result += (result?' ':'') + chunk(Math.floor(rem/val)) + ' ' + label; rem %= val; }
  }
  if (rem > 0) result += (result?' ':'') + chunk(rem);
  return result.trim();
}

// Chuyển text có số VND (vd: "500.000 VND") thành dạng đọc được ("five hundred thousand dong")
function convertForTTS(text: string): string {
  return text.replace(/([\d.]+)\s*VND/gi, (_, numStr) => {
    const num = parseInt(numStr.replace(/\./g, ''), 10);
    if (isNaN(num)) return numStr + ' VND';
    return numberToWords(num) + ' dong';
  });
}

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

interface FAQResponse {
  answer: string;
  disclaimer: string;
  confidence: 'high' | 'medium' | 'low';
  suggested_next_action?: string;
}

export default function AiAssistantWidget({ textToSpeak, preloadedAudioUrl, onAudioEnd, onTextInput }: {
  textToSpeak: string;
  preloadedAudioUrl?: string;
  onAudioEnd?: () => void;
  onTextInput?: (t: string) => void;
}) {
  const [triggerCount, setTriggerCount] = useState(0);
  const [isActuallyTalking, setIsActuallyTalking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [lastSpokenText, setLastSpokenText] = useState('');
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Dừng tất cả audio đang chạy
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    window.speechSynthesis.cancel();
    setIsActuallyTalking(false);
  };

  // Gọi FAQ endpoint, nhận answer và speak
  const handleUserInput = async (userText: string) => {
    if (!userText.trim()) return;

    // Dừng audio đang chạy trước khi xử lý câu hỏi mới
    stopAudio();
    setDisplayedText('');

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/chat', {
        session_id: `session_${Date.now()}`,
        question: userText,
        context: {
          flow_type: 'recommend',
          last_script: null,
          product_id: null,
          allocation: null
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as any).detail || `HTTP error! status: ${response.status}`);
      }

      const data: FAQResponse = await response.json();
      if (onTextInput) onTextInput(data.answer);
    } catch (err) {
      console.error('FAQ API error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response from AI Advisor';
      setError(errorMessage);
      if (onTextInput) onTextInput('Sorry, I encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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

        if (preloadedAudioUrl) {
            // ✅ Dùng audio đã prefetch — không cần gọi TTS
            audioRef.current.src = preloadedAudioUrl;
            audioRef.current.play().catch(e => console.error("Preloaded audio playback failed:", e));
        } else {
            const dashscopeKey = import.meta.env.VITE_DASHSCOPE_API_KEY;
            if (dashscopeKey) {
                audioRef.current.src = `/api/cosyvoice?q=${encodeURIComponent(convertForTTS(textToSpeak))}`;
                audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
            } else {
                const utterance = new SpeechSynthesisUtterance(convertForTTS(textToSpeak));
                utterance.lang = 'en-US';
                utterance.rate = 0.95;
                utterance.pitch = 1.1;
                const voices = window.speechSynthesis.getVoices();
                const femaleVoice = voices.find(v =>
                    v.lang.startsWith('en') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('aria') || v.name.toLowerCase().includes('susan'))
                ) || voices.find(v => v.lang.startsWith('en'));
                if (femaleVoice) utterance.voice = femaleVoice;
                utterance.onstart = () => setIsActuallyTalking(true);
                utterance.onend = () => { setIsActuallyTalking(false); if (onAudioEnd) onAudioEnd(); };
                utterance.onerror = (e) => { setIsActuallyTalking(false); console.error('Web Speech error:', e); };
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utterance);
            }
        }
    } else if (!textToSpeak) {
        if (audioRef.current) audioRef.current.pause();
        window.speechSynthesis.cancel();
        setIsActuallyTalking(false);
    }
  }, [textToSpeak, preloadedAudioUrl]);

  const hasStartedTypingRef = useRef(false);

  // Clear text when textToSpeak changes to wait for audio
  useEffect(() => {
    hasStartedTypingRef.current = false;
    setDisplayedText('');
  }, [textToSpeak]);

  // Typewriter effect: đồng bộ hiển thị text với audio khi bắt đầu nói
  useEffect(() => {
    if (!textToSpeak) return;

    if (isActuallyTalking) {
      hasStartedTypingRef.current = true;
      setDisplayedText('');
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setDisplayedText(textToSpeak.slice(0, i));
        if (i >= textToSpeak.length) clearInterval(interval);
      }, 65); // ~15 ký tự/giây ≈ tốc độ TTS bình thường
      return () => clearInterval(interval);
    } else {
      // Audio đã dừng hoặc chưa bắt đầu
      if (hasStartedTypingRef.current) {
        // Nếu đã bắt đầu nói nhưng giờ ngừng lại (nghĩa là audio đã xong), hiển thị full text
        setDisplayedText(textToSpeak);
        setLastSpokenText(textToSpeak); // Lưu lại để không biến mất
      }
    }
  }, [isActuallyTalking, textToSpeak]);

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
                isThinking={isLoading}
                triggerCount={triggerCount}
                analyserRef={analyserRef}
                disableTracking={true}
              />
            </Suspense>
          </Canvas>
        </div>

        {(displayedText || lastSpokenText) && (
          <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontWeight: 500, fontSize: '0.95rem', lineHeight: 1.5, textAlign: 'center', border: '1px solid #eee' }}>
            {displayedText || lastSpokenText}
          </div>
        )}
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '8px', zIndex: 10 }}>
        <input 
          type="text"
          placeholder={isLoading ? "AI is thinking..." : "Type to ask Shinhan AI Advisor..."}
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value) {
              handleUserInput(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
          style={{ flex: 1, padding: '14px 20px', borderRadius: '24px', border: '1px solid #ddd', fontSize: '0.95rem', outline: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', opacity: isLoading ? 0.5 : 1, cursor: isLoading ? 'not-allowed' : 'auto' }}
        />
        <button 
          onClick={(e) => {
            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
            if (input && input.value && !isLoading) {
              handleUserInput(input.value);
              input.value = '';
            }
          }}
          disabled={isLoading}
          style={{ background: isLoading ? '#ccc' : 'var(--shinhan-blue)', color: 'white', border: 'none', borderRadius: '50%', width: '46px', height: '46px', cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isLoading ? 0.6 : 1 }}
        >
          {isLoading ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          )}
        </button>
      </div>
    </div>
  );
}
