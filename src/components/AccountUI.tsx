import React, { useState } from 'react';

interface AccountUIProps {
  onBack: () => void;
  balance: number;
}

export default function AccountUI({ onBack, balance }: AccountUIProps) {
  const [activeTab, setActiveTab] = useState<'payment' | 'savings'>('payment');

  return (
    <div className="absolute inset-0 bg-surface text-on-surface z-50 flex flex-col font-body bg-gray-50 max-h-[100dvh]">
      {/* Header */}
      <div className="bg-[#2f66ee] text-white px-4 py-4 flex items-center justify-between shadow-sm shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined font-bold text-xl">arrow_back_ios_new</span>
        </button>
        <h1 className="font-bold text-[17px] font-headline flex-1 text-center pr-8 whitespace-nowrap">Accounts</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-200 shrink-0 shadow-sm relative z-10">
        <button 
            className={`flex-1 py-3 text-[14px] font-bold border-b-[3px] font-headline transition-colors ${activeTab === 'payment' ? 'border-[#2f66ee] text-gray-800' : 'border-transparent text-gray-400'}`}
            onClick={() => setActiveTab('payment')}
        >
          Payment Accounts
        </button>
        <button 
            className={`flex-1 py-3 text-[14px] font-bold border-b-[3px] font-headline transition-colors ${activeTab === 'savings' ? 'border-[#2f66ee] text-gray-800' : 'border-transparent text-gray-400'}`}
            onClick={() => setActiveTab('savings')}
        >
          Savings Accounts
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        {activeTab === 'payment' && (
          <div className="animate-fade-in flex flex-col w-full h-full pb-20">
            {/* Total Balance block */}
            <div className="bg-[#f4f5f7] px-5 py-4 flex flex-col gap-1 w-full">
              <span className="text-gray-700 text-[14px] font-bold tracking-wide">Total Balance</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-[#eef3ff] text-[#2f66ee] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">VND</span>
                <span className="text-gray-800 text-[18px] font-extrabold">{balance.toLocaleString('vi-VN')}</span>
              </div>
            </div>

            {/* Account List Item */}
            <div className="bg-white border-y border-gray-200 px-5 py-5 active:bg-gray-50 transition-colors cursor-pointer w-full">
              <div className="flex justify-between items-start mb-0.5">
                <h3 className="font-bold text-gray-800 text-[14px]">Online Demand Deposit Account (VND)</h3>
                <span className="material-symbols-outlined text-gray-800 text-[20px] font-bold">chevron_right</span>
              </div>
              <p className="text-gray-400 text-[13px] mb-3">700-031-586225</p>
              
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-2">
                  <span className="bg-[#eef3ff] text-[#2f66ee] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">VND</span>
                  <span className="text-gray-800 text-[16px] font-extrabold">{balance.toLocaleString('vi-VN')}</span>
                </div>
                <button className="text-[#2f66ee] hover:bg-blue-50 p-1.5 -mr-1.5 rounded-lg transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white"></div>
          </div>
        )}
        
        {activeTab === 'savings' && (
          <div className="animate-fade-in p-8 h-full bg-white text-center text-gray-400 flex flex-col items-center pt-16 gap-3">
             <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-2">
                 <span className="material-symbols-outlined text-3xl">savings</span>
             </div>
             <p className="text-[14px] font-medium max-w-[200px] leading-tight">You don't have any savings accounts yet.</p>
          </div>
        )}
      </div>

      {/* FAB (Floating Action Button) */}
      <button className="fixed bottom-6 right-5 w-14 h-14 bg-[#ff9800] rounded-[16px] shadow-xl hover:bg-orange-500 active:scale-[0.92] transition-transform flex items-center justify-center z-50 overflow-hidden group" style={{boxShadow: '0 8px 24px rgba(255,152,0,0.3)', maxWidth: '480px'}}>
        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center transition-transform group-active:scale-95">
            <span className="material-symbols-outlined text-[#ff9800] font-black pointer-events-none" style={{fontSize: '18px', fontVariationSettings: "'wght' 900"}}>add</span>
        </div>
      </button>

      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
