import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

// Interfaces for API response
interface Flow3Response {
  stock_code: string;
  action: string;
  allocation_vnd: number;
  reasoning: string;
  script: string;
  latency_ms: number;
}

export default function InvestmentUI({ balance, onBack }: { balance: number; onBack: () => void }) {
  const [showSecuritiesMenu, setShowSecuritiesMenu] = useState(false);
  const [showAIForm, setShowAIForm] = useState(false);
  
  // Form state
  const [stockCode, setStockCode] = useState('');
  const [amount, setAmount] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Custom stock suggestions
  const POPULAR_STOCKS = [
    'FPT - FPT Corporation', 
    'HPG - Hoa Phat Group', 
    'VNM - Vinamilk', 
    'VIC - Vingroup', 
    'VHM - Vinhomes', 
    'TCB - Techcombank', 
    'MBB - MB Bank', 
    'VPB - VPBank', 
    'SSI - SSI Securities', 
    'VND - VNDIRECT',
    'MWG - Mobile World',
    'PNJ - Phu Nhuan Jewelry',
    'VCB - Vietcombank',
    'BID - BIDV',
    'CTG - VietinBank'
  ];
  
  const filteredStocks = POPULAR_STOCKS.filter(s => s.toLowerCase().includes(stockCode.toLowerCase()));

  const numericAmount = parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const isAmountExceeded = numericAmount > balance;
  
  // API state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<Flow3Response | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) return;
    setLoadingStep(0);
    const timer1 = setTimeout(() => setLoadingStep(1), 600);
    const timer2 = setTimeout(() => setLoadingStep(2), 1500);
    const timer3 = setTimeout(() => setLoadingStep(3), 2500);
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockCode || !amount) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.post('/api/flows/invest', {
        session_id: `session_${Date.now()}`,
        user_token: localStorage.getItem('token') || 'user_123_mock',
        stock_code: stockCode.toUpperCase(),
        investment_amount: parseInt(amount.replace(/\D/g, ''), 10)
      });

      if (!response.ok) {
        throw new Error('Failed to get investment advice.');
      }

      const data: Flow3Response = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Format number as VND
  const formatVND = (val: string) => {
    const num = parseInt(val.replace(/\D/g, ''), 10);
    return isNaN(num) ? '' : num.toLocaleString('vi-VN');
  };

  // AI FORM VIEW
  if (showAIForm) {
    return (
      <div className="absolute inset-0 bg-surface text-on-surface z-[100] flex flex-col font-body bg-[#f4f5f7] max-h-[100dvh]">
        {/* Header */}
        <div className="bg-[#2f66ee] text-white px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 shrink-0">
          <button onClick={() => setShowAIForm(false)} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined font-bold text-xl">arrow_back_ios_new</span>
          </button>
          <h1 className="font-bold text-lg font-headline flex-1 text-center pr-8 whitespace-nowrap">AI Advisor</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 pb-32">
          {isLoading ? (
             <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-12 gap-8 animate-fade-in relative overflow-hidden">
                 {/* Background subtle gradient pulse */}
                 <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent animate-pulse opacity-50"></div>
                 
                 <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center relative z-10 shadow-inner">
                     <svg className="animate-spin h-14 w-14 text-[#2f66ee] absolute inset-0 m-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle><path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     <span className="material-symbols-outlined text-[#2f66ee] text-3xl relative z-10">smart_toy</span>
                 </div>
                 
                 <div className="w-full max-w-[260px] flex flex-col gap-5 relative z-10">
                     {[
                        { text: "Reading risk profile...", icon: "assignment_ind" },
                        { text: "Gathering market news...", icon: "newspaper" },
                        { text: "Running technical analysis...", icon: "query_stats" },
                        { text: "AI making final decision...", icon: "psychology" }
                     ].map((step, idx) => (
                        <div key={idx} className={`flex items-center gap-3 transition-all duration-500 ease-out ${loadingStep >= idx ? 'opacity-100 translate-x-0' : 'opacity-30 -translate-x-4'}`}>
                            {loadingStep > idx ? (
                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                   <span className="material-symbols-outlined text-green-600 text-[16px] drop-shadow-sm font-bold">check</span>
                                </div>
                            ) : loadingStep === idx ? (
                                <span className="material-symbols-outlined text-[#2f66ee] text-2xl animate-spin shrink-0">data_usage</span>
                            ) : (
                                <span className="material-symbols-outlined text-gray-300 text-2xl shrink-0">radio_button_unchecked</span>
                            )}
                            <span className={`text-[14px] font-medium ${loadingStep === idx ? 'text-[#2f66ee] font-bold tracking-tight' : loadingStep > idx ? 'text-gray-800' : 'text-gray-400'}`}>
                                {step.text}
                            </span>
                        </div>
                     ))}
                 </div>
             </div>
          ) : !result ? (
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#2f66ee]">smart_toy</span>
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-800">AI Stock Analysis</h2>
                        <p className="text-xs text-gray-500">Get personalized investment advice</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="relative">
                        <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Stock Code</label>
                        <input 
                            type="text" 
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 font-bold focus:border-[#2f66ee] focus:ring-2 focus:ring-blue-100 outline-none uppercase transition-all placeholder:font-normal placeholder:lowercase"
                            placeholder="e.g. FPT, HPG, VNM"
                            value={stockCode}
                            onChange={e => setStockCode(e.target.value)}
                            onFocus={() => setShowDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                            maxLength={10}
                            required
                        />
                        {showDropdown && stockCode && filteredStocks.length > 0 && (
                            <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] max-h-48 overflow-y-auto overflow-x-hidden top-full left-0">
                                {filteredStocks.map((stock, i) => (
                                    <li 
                                      key={i} 
                                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-center justify-between" 
                                      onClick={() => {
                                        setStockCode(stock.split(' - ')[0]);
                                        setShowDropdown(false);
                                      }}
                                      onMouseDown={(e) => {
                                        // prevent blur from firing before click
                                        e.preventDefault();
                                      }}
                                    >
                                        <span className="font-extrabold text-[#2f66ee] text-[15px]">{stock.split(' - ')[0]}</span>
                                        <span className="text-gray-500 font-medium truncate ml-3 text-right text-[13px]">{stock.split(' - ')[1]}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-1.5 ml-1 mr-1">
                            <label className="block text-sm font-bold text-gray-700">Investment Amount (VND)</label>
                            <span className="text-xs font-medium text-gray-500">Available: <strong className="text-[#2f66ee]">{balance.toLocaleString('vi-VN')}</strong></span>
                        </div>
                        <input 
                            type="text" 
                            className={`w-full bg-gray-50 border ${isAmountExceeded ? 'border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-[#2f66ee] focus:ring-blue-100'} rounded-xl px-4 py-3.5 text-gray-800 font-bold focus:ring-2 outline-none transition-all`}
                            placeholder="50,000,000"
                            value={formatVND(amount)}
                            onChange={e => setAmount(e.target.value)}
                            required
                        />
                        {isAmountExceeded && (
                            <p className="text-red-500 text-[12px] font-bold mt-1.5 ml-1 flex items-center gap-1 animate-fade-in">
                               <span className="material-symbols-outlined text-[14px]">error</span>
                               Amount exceeds available balance
                            </p>
                        )}
                        <div className="flex gap-2 mt-2">
                            {[10000000, 50000000, 100000000].map(val => (
                                <button type="button" key={val} onClick={() => setAmount(val.toString())} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold">
                                    +{val / 1000000}M
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-2">
                            <span className="material-symbols-outlined text-base">error</span>
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={!stockCode || !amount || isAmountExceeded}
                        className="w-full mt-4 bg-[#2f66ee] text-white font-bold py-4 rounded-xl shadow-[0_8px_20px_rgba(47,102,238,0.25)] hover:bg-[#1a55d4] active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                    >
                       <span className="material-symbols-outlined text-xl">psychology</span>
                       Get AI Recommendation
                    </button>
                </form>
             </div>
          ) : (
             <div className="animate-fade-in flex flex-col gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50 to-transparent -mr-10 -mt-10 rounded-full opacity-50"></div>
                    
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 relative z-10">
                        <div>
                            <p className="text-gray-500 text-sm font-semibold mb-1">Target Stock</p>
                            <h3 className="text-2xl font-black text-gray-900">{result.stock_code}</h3>
                        </div>
                        <div className={`px-4 py-2 rounded-xl border-2 flex items-center gap-1 shadow-sm ${
                            result.action === 'BUY' ? 'border-green-100 bg-green-50 text-green-700' :
                            result.action === 'SELL' ? 'border-red-100 bg-red-50 text-red-700' :
                            'border-yellow-100 bg-yellow-50 text-yellow-700'
                        }`}>
                            <span className="material-symbols-outlined text-lg leading-none">
                                {result.action === 'BUY' ? 'trending_up' : result.action === 'SELL' ? 'trending_down' : 'remove'}
                            </span>
                            <span className="font-bold tracking-wide">{result.action}</span>
                        </div>
                    </div>

                    <div className="mb-6 relative z-10">
                        <p className="text-gray-500 text-sm font-semibold mb-1">Recommended Allocation</p>
                        <div className="flex items-end gap-1">
                            <span className="text-3xl font-extrabold text-[#2f66ee]">{result.allocation_vnd.toLocaleString('vi-VN')}</span>
                            <span className="text-gray-500 font-bold pb-1 bg-gray-100 px-2 py-0.5 rounded-md ml-1 text-xs">VND</span>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100/50 relative z-10 shadow-inner">
                        <div className="absolute -top-3 -left-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2f66ee] to-[#1a8cff] flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <span className="material-symbols-outlined text-white text-[16px]">tips_and_updates</span>
                            </div>
                        </div>
                        <div className="pl-3">
                            <p className="text-[#1a365d] text-[13.5px] italic font-semibold leading-relaxed mt-1">"{result.script}"</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-3 relative z-10">
                        <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-gray-500 text-xs">analytics</span>
                        </div>
                        <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wide">AI Reasoning</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed font-medium relative z-10 bg-gray-50 p-3 rounded-xl">{result.reasoning}</p>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => setResult(null)} className="flex-1 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm">
                        Check Another
                    </button>
                    <button className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#2f66ee] to-[#1a55d4] text-white font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-transform flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                        Place Order
                    </button>
                </div>
             </div>
          )}
        </div>
      </div>
    );
  }

  // MAIN INVESTMENTS LIST VIEW
  return (
    <div className="absolute inset-0 bg-surface text-on-surface z-[100] flex flex-col font-body bg-[#f4f5f7] max-h-[100dvh]">
      {/* Header */}
      <div className="bg-[#2f66ee] text-white px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined font-bold text-xl">arrow_back_ios_new</span>
        </button>
        <h1 className="font-bold text-lg font-headline flex-1 text-center pr-8 whitespace-nowrap">Investments</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Card 1: Chứng khoán */}
        <div 
          onClick={() => setShowSecuritiesMenu(true)}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform hover:shadow-md"
        >
          <div className="flex-1 pr-4">
            <h2 className="text-[18px] font-bold text-gray-900 mb-1">Securities</h2>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              Trade stocks conveniently and catch market opportunities quickly.
            </p>
          </div>
          <div className="shrink-0 w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center shadow-inner border border-blue-200/50">
             <span className="material-symbols-outlined text-[#2f66ee] text-3xl drop-shadow-sm" style={{fontVariationSettings: "'FILL' 1"}}>candlestick_chart</span>
          </div>
        </div>

        {/* Card 2: Dịch vụ quỹ */}
        <div 
          className="bg-gradient-to-br from-[#f8faff] to-[#f0f4ff] rounded-2xl p-5 shadow-sm border border-[#e0e8ff] flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform hover:shadow-md"
        >
          <div className="flex-1 pr-4">
            <h2 className="text-[18px] font-bold text-[#1a365d] mb-1">Fund Services</h2>
            <p className="text-[13px] text-gray-600/90 leading-relaxed">
              Invest easily with a diversified portfolio of funds.
            </p>
          </div>
          <div className="shrink-0 w-16 h-16 bg-white/80 rounded-2xl flex items-center justify-center shadow-inner border border-purple-100">
             <span className="material-symbols-outlined text-purple-600 text-3xl drop-shadow-sm" style={{fontVariationSettings: "'FILL' 1"}}>savings</span>
          </div>
        </div>
      </div>

      {/* Bottom Sheet for Securities */}
      {showSecuritiesMenu && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end pointer-events-auto">
          <style>{`
            @keyframes sheetSlide {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            @keyframes backFade {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>
          
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" style={{ animation: 'backFade 0.3s ease forwards' }}
            onClick={() => setShowSecuritiesMenu(false)}
          ></div>
          
          <div className="bg-white w-full rounded-t-3xl relative z-10 flex flex-col max-h-[85vh] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]" style={{ maxWidth: '480px', margin: '0 auto', animation: 'sheetSlide 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-green-50 p-2 rounded-xl flex items-center justify-center border border-green-100">
                  <span className="material-symbols-outlined text-green-600 font-bold" style={{fontSize: '24px'}}>finance</span>
                </div>
                <h2 className="text-[20px] font-black text-gray-800 tracking-tight">Securities</h2>
              </div>
              <button 
                onClick={() => setShowSecuritiesMenu(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-500 p-1.5 rounded-full transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined font-bold text-xl">close</span>
              </button>
            </div>

            {/* Menu List */}
            <div className="overflow-y-auto pb-6">
              {[
                { title: 'Open securities account', icon: 'person_add', type: 'normal' },
                { title: 'Deposit', icon: 'payments', type: 'normal' },
                { title: 'AI Investment Advisor', icon: 'psychology', type: 'primary', description: 'Smart stock analysis' },
                { title: 'Securities trading', icon: 'show_chart', type: 'normal' },
              ].map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    if (item.title === 'AI Investment Advisor') {
                        setShowSecuritiesMenu(false);
                        setShowAIForm(true);
                    }
                  }}
                  className={`flex items-center justify-between px-6 py-4.5 cursor-pointer active:bg-gray-50 transition-colors border-b border-gray-100/50 ${item.type === 'primary' ? 'bg-gradient-to-r from-blue-50/50 to-transparent hover:bg-blue-50/80' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'primary' ? 'bg-gradient-to-br from-[#2f66ee] to-[#1a8cff] shadow-md shadow-blue-200' : 'bg-gray-100 border border-gray-200/60'}`}>
                        <span className={`material-symbols-outlined text-[20px] ${item.type === 'primary' ? 'text-white' : 'text-[#5c6f8a]'}`} style={{fontVariationSettings: "'FILL' 1"}}>{item.icon}</span>
                    </div>
                    <div>
                        <span className={`text-[16px] font-bold block ${item.type === 'primary' ? 'text-[#2f66ee]' : 'text-gray-800'}`}>{item.title}</span>
                        {item.description && <span className="text-[11px] uppercase tracking-wider text-[#2f66ee] font-bold opacity-80">{item.description}</span>}
                    </div>
                  </div>
                  <span className={`material-symbols-outlined font-bold text-lg ${item.type === 'primary' ? 'text-[#2f66ee]' : 'text-gray-300'}`}>chevron_right</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
