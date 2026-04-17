import React, { useState } from 'react';
import { api } from '../lib/api';

interface LoginUIProps {
  onBack: () => void;
  onLoginSuccess: (user: any) => void;
}

export default function LoginUI({ onBack, onLoginSuccess }: LoginUIProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/auth/login/account', { phone, password });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Login failed');
      }

      const data = await response.json();
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/auth/login/demo');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Demo login failed');
      }

      const data = await response.json();
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#00306b] flex flex-col items-center p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="w-full flex justify-between items-center mb-12">
        <button onClick={onBack} className="text-white flex items-center gap-1 active:scale-95 transition-transform">
          <span className="material-symbols-outlined">arrow_back_ios</span>
          <span className="font-bold text-sm">Back</span>
        </button>
        <h2 className="text-white font-bold text-lg tracking-tight">SHINHAN SOL</h2>
        <div className="w-8"></div> {/* Spacer */}
      </div>

      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-8 shadow-xl backdrop-blur-md">
          <span className="material-symbols-outlined text-white text-5xl">lock_person</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 font-headline">Welcome Back</h1>
        <p className="text-white/60 text-sm mb-10">Sign in to your Shinhan account</p>

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-white/40">call</span>
            <input
              type="text"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-colors"
              required
            />
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-white/40">lock</span>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-colors"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-100 text-xs py-2 px-4 rounded-xl text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-[#00306b] py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-white/90 active:scale-[0.98] transition-all mt-4 disabled:opacity-70"
          >
            {loading ? 'Signing in...' : 'LOGIN'}
          </button>
          
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full bg-white/10 border border-white/20 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-white/20 active:scale-[0.98] transition-all mt-2 disabled:opacity-70"
          >
            {loading ? 'Processing...' : 'Login as Demo user'}
          </button>
        </form>

        <div className="mt-12 flex flex-col items-center gap-6">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white/80 active:bg-white/10 transition-colors cursor-pointer">
              <span className="material-symbols-outlined">fingerprint</span>
            </div>
            <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white/80 active:bg-white/10 transition-colors cursor-pointer">
              <span className="material-symbols-outlined">face</span>
            </div>
          </div>
          <button className="text-white/60 text-xs font-medium hover:text-white transition-colors">
            Forgot Password?
          </button>
        </div>
      </div>

      <div className="mt-auto pb-8">
        <p className="text-white/40 text-[10px] text-center">
          SHINHAN BANK VIETNAM © 2026<br />
          Highly secure encryption enabled
        </p>
      </div>
    </div>
  );
}
