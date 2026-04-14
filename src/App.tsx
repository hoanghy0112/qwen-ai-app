import React, { useState, useEffect } from 'react';
import BankUI from './pages/BankUI';
import AvatarDemo from './pages/AvatarDemo';

export default function App() {
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (currentHash === '#demo') {
    return <AvatarDemo />;
  }

  return (
    <div style={{ position: 'relative', width: '100vw', minHeight: '100vh', background: 'var(--shinhan-bg)'}}>
      {/* Màn hình PWA Ngân hàng Chính */}
      <BankUI />
      
      {/* Floating Debug Button to switch between demo and prod */}
      <button 
        onClick={() => window.location.hash = '#demo'} 
        style={{ position: 'fixed', top: 10, left: 10, zIndex: 9999, padding: '4px 8px', fontSize: '10px', background: '#333', color: 'white', borderRadius: '4px', border: 'none', opacity: 0.5 }}>
        Switch Backup Demo
      </button>
    </div>
  );
}
