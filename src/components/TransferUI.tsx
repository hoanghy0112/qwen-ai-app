import React, { useState, useEffect } from 'react';

// Chuyển số VND sang dạng tiếng Anh đọc được cho TTS
function amountToSpeakable(formattedAmount: string): string {
  const num = parseFloat(formattedAmount.replace(/[^\d]/g, '')) || 0;
  if (num === 0) return 'zero dong';

  const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  function convertChunk(n: number): string {
    if (n === 0) return '';
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + units[n % 10] : '');
    return units[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + convertChunk(n % 100) : '');
  }

  const scales = [
    { value: 1_000_000_000, label: 'billion' },
    { value: 1_000_000, label: 'million' },
    { value: 1_000, label: 'thousand' },
  ];

  let result = '';
  let remaining = num;
  for (const scale of scales) {
    if (remaining >= scale.value) {
      const count = Math.floor(remaining / scale.value);
      result += (result ? ' ' : '') + convertChunk(count) + ' ' + scale.label;
      remaining %= scale.value;
    }
  }
  if (remaining > 0) {
    result += (result ? ' ' : '') + convertChunk(remaining);
  }

  return result.trim() + ' dong';
}

interface TransferUIProps {
  onBack: () => void;
  onSuccessReturnHome: () => void;
  onOpenAdvisor: (message: string) => void;
  onTransactionComplete: (amount: string) => void;
  onAdvisorReady: (audioUrl: string | null, script: string) => void;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
}

// Fix 2: Danh sách ngân hàng có thể chọn
const BANKS = [
  { code: 'SHBVN', name: 'Shinhan Bank Vietnam', abbr: 'S', color: '#2f66ee' },
  { code: 'VCB',   name: 'Vietcombank',           abbr: 'V', color: '#00703c' },
  { code: 'TCB',   name: 'Techcombank',            abbr: 'T', color: '#e2001a' },
  { code: 'MB',    name: 'MB Bank',                abbr: 'M', color: '#6b21a8' },
  { code: 'ACB',   name: 'ACB Bank',               abbr: 'A', color: '#0d7dff' },
  { code: 'VPB',   name: 'VPBank',                 abbr: 'VP', color: '#ff6b00' },
  { code: 'BIDV',  name: 'BIDV',                   abbr: 'B', color: '#005aab' },
  { code: 'VTB',   name: 'Vietinbank',             abbr: 'Vi', color: '#e30613' },
];

export default function TransferUI({ onBack, onSuccessReturnHome, onOpenAdvisor, onTransactionComplete, onAdvisorReady, balance, setBalance }: TransferUIProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [amount, setAmount] = useState<string>('');
  const [content, setContent] = useState<string>('NGUYEN XUAN TRUNG TRANSFER');
  const [accountNo, setAccountNo] = useState<string>('');
  const [fastTransfer, setFastTransfer] = useState(true);
  const [transferToCard, setTransferToCard] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showNotification, setShowNotification] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [countdown, setCountdown] = useState(59);
  const [otpTrigger, setOtpTrigger] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [accountNoError, setAccountNoError] = useState('');
  const [showDeductedNotif, setShowDeductedNotif] = useState(false);
  const [showAvatarNotif, setShowAvatarNotif] = useState(false);
  const [showAdvisorToast, setShowAdvisorToast] = useState(false);
  const [allowTransition, setAllowTransition] = useState(false);
  const [recommendScript, setRecommendScript] = useState('');
  // Fix 1: trạng thái ẩn/hiện số dư
  const [balanceVisible, setBalanceVisible] = useState(true);
  // Fix 2: ngân hàng đang chọn
  const [selectedBankCode, setSelectedBankCode] = useState('SHBVN');
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  // Fix 4: timestamp tĩnh — chụp lại 1 lần khi bước vào step 4
  const [successTimestamp, setSuccessTimestamp] = useState('');
  // Loading state khi đang chờ tín hiệu mạng ở bước Confirm
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  // Advisor background pipeline state
  type AdvisorStatus = 'idle' | 'fetching' | 'ready' | 'failed';
  const [advisorStatus, setAdvisorStatus] = useState<AdvisorStatus>('idle');
  const prefetchedAudioUrl = React.useRef<string | null>(null);
  const advisorShownRef = React.useRef(false);

  const selectedBank = BANKS.find(b => b.code === selectedBankCode) ?? BANKS[0];

  // Countdown Timer
  useEffect(() => {
    if (step === 3 && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, countdown]);

  useEffect(() => {
    if (step === 3) {
      setOtp(['', '', '', '', '', '']);
      const initTimer = setTimeout(() => setAllowTransition(true), 50);
      const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const notificationTimer = setTimeout(() => {
        setGeneratedOtp(randomOtp);
        setShowNotification(true);
        const fillTimer = setTimeout(() => {
          setOtp(randomOtp.split(''));
          setTimeout(() => setShowNotification(false), 3000);
        }, 1500);
        return () => clearTimeout(fillTimer);
      }, 1000);
      return () => {
        clearTimeout(initTimer);
        clearTimeout(notificationTimer);
      };
    } else {
      setShowNotification(false);
      setOtp(['', '', '', '', '', '']);
      setGeneratedOtp('');
      setAllowTransition(false);
      return undefined;
    }
  }, [step, otpTrigger]);

  useEffect(() => {
    if (step === 4) {
      advisorShownRef.current = false;
      const initTimer = setTimeout(() => setAllowTransition(true), 50);
      return () => clearTimeout(initTimer);
    } else {
      setShowAvatarNotif(false);
      setShowAdvisorToast(false);
      return undefined;
    }
  }, [step]);

  const addAmount = (val: number) => {
    setErrorMsg('');
    setAmount((prev) => {
      const current = parseFloat(prev.replace(/[^\d]/g, '')) || 0;
      return (current + val).toLocaleString('vi-VN');
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const rawValue = e.target.value.replace(/[^\d]/g, '');
    if (!rawValue) {
      setAmount('');
      return;
    }
    const num = parseInt(rawValue, 10);
    setAmount(num.toLocaleString('vi-VN'));
  };

  // ========== MOCK FLAG ==========
  // Đổi thành false khi backend đã sẵn sàng để gọi API thật
  const USE_MOCK = false;

  const mockRecommendResponse = {
    session_id: 'session_mock_001',
    product_id: 'travel_insurance_premium',
    script: 'We noticed you frequently make transfers. Our Smart Savings account offers 6.5% annual interest with flexible withdrawal. Would you like to learn more?',
    cta: 'Learn More',
    latency_ms: 1200
  };

  const handleContinue = () => {
    // Validate account number
    const trimmedAccount = accountNo.trim();
    if (!trimmedAccount) {
      setAccountNoError('Please enter account number');
      return;
    }
    if (!/^\d+$/.test(trimmedAccount)) {
      setAccountNoError('Account number must contain digits only');
      return;
    }
    setAccountNoError('');

    // Validate amount
    const amountVal = parseFloat(amount.replace(/[^\d]/g, '')) || 0;
    if (amountVal <= 0) {
      setErrorMsg('Please enter a valid amount');
      return;
    }
    if (amountVal > balance) {
      setErrorMsg('Insufficient balance');
      return;
    }

    setErrorMsg('');
    setAllowTransition(false);
    setStep(2);

    // 🔥 Fire-and-forget: chạy pipeline ngầm ngay khi bấm Continue
    prefetchAdvisor(amountVal);
  };

  // ─── Background pipeline: API → script → TTS → blob URL ───────────────────
  const prefetchAdvisor = async (amountVal: number) => {
    setAdvisorStatus('fetching');
    try {
      // Step 1: Get recommend script
      let script = '';
      if (USE_MOCK) {
        await new Promise(r => setTimeout(r, 800));
        script = mockRecommendResponse.script;
      } else {
        const res = await fetch('/api/flows/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: `session_${Date.now()}`,
            user_token: 'user_12345',
            transaction: { amount: amountVal, merchant: 'Transfer', category: 'transfer' }
          })
        });
        const data = await res.json();
        script = data?.script || '';
      }
      if (script) setRecommendScript(script);
      else throw new Error('No script');

      // Step 2: Pre-generate TTS audio
      const ttsRes = await fetch('http://localhost:5000/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: script })
      });
      if (!ttsRes.ok) throw new Error('TTS failed');
      const blob = await ttsRes.blob();
      prefetchedAudioUrl.current = URL.createObjectURL(blob);

      setAdvisorStatus('ready');
      // Thông báo lên BankUI — sẽ hiện toast dù user đang ở tab nào
      onAdvisorReady(prefetchedAudioUrl.current, script);
    } catch (err) {
      console.error('[Advisor prefetch] Error:', err);
      setAdvisorStatus('failed');
      // Vẫn notify với script (không có audio)
      if (recommendScript) onAdvisorReady(null, recommendScript);
    }
  };

  const handleConfirmReview = async () => {
    // Hiện loading 3s (chờ tín hiệu mạng lấy OTP)
    setIsConfirmLoading(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsConfirmLoading(false);
    setAllowTransition(false);
    setCountdown(59);
    setOtpTrigger(prev => prev + 1);
    setStep(3);
  };

  const handleResendOtp = () => {
    if (countdown > 0) return;
    setCountdown(59);
    setOtpTrigger(prev => prev + 1);
  };

  const handleConfirmOtp = () => {
    const amountVal = parseFloat(amount.replace(/[^\d]/g, '')) || 0;
    setSuccessTimestamp(new Date().toLocaleString('en-US'));
    setAllowTransition(false);
    setBalance(prev => prev - amountVal);
    // Thông báo lên BankUI để show global balance toast
    onTransactionComplete(amount);
    setStep(4);
  };

  // Fix 3: chỉ cho confirm khi đã nhập đủ 6 số OTP
  const isOtpComplete = otp.every(d => d !== '');

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  if (step === 1) {
    return (
      <div className="absolute inset-0 bg-surface text-on-surface z-[100] flex flex-col font-body bg-gray-50 max-h-[100dvh]">
        {/* Header */}
        <div className="bg-[#2f66ee] text-white px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 shrink-0">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined font-bold text-xl">arrow_back_ios_new</span>
          </button>
          <h1 className="font-bold text-lg font-headline flex-1 text-center pr-8 whitespace-nowrap">Domestic Transfer</h1>
        </div>

        <div className="flex-1 overflow-y-auto pb-24">
          {/* Source Account Info */}
          <div className="bg-white px-5 py-4 shadow-sm mb-2 rounded-b-xl border-b border-gray-100">
            <h2 className="font-bold text-gray-800 text-[15px]">Online Demand Deposit Account (VND)</h2>
            <div className="flex items-center justify-between mt-1">
              <span className="text-gray-500 text-sm">700-031-586225</span>
              <span className="material-symbols-outlined text-gray-500 text-lg">keyboard_arrow_down</span>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <span className="text-[10px] font-bold bg-blue-50 text-[#2f66ee] px-2 py-0.5 rounded-md uppercase">VND</span>
              {/* Fix 1: hiện số hoặc dấu * tuỳ trạng thái balanceVisible */}
              <span className="font-bold text-gray-800 text-lg">
                {balanceVisible
                  ? balance.toLocaleString('vi-VN')
                  : '•'.repeat(balance.toLocaleString('vi-VN').length)}
              </span>
              <button
                onClick={() => setBalanceVisible(v => !v)}
                className="ml-1 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
                aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}
              >
                <span className="material-symbols-outlined text-gray-600 text-lg">
                  {balanceVisible ? 'visibility' : 'visibility_off'}
                </span>
              </button>
            </div>
          </div>

          <div className="px-4 py-4 max-w-full overflow-hidden">
            {/* Fast Transfer Toggle */}
            <div className="bg-white rounded-xl p-4 flex items-center justify-between border border-gray-100 shadow-sm mb-3">
              <span className="text-[15px] font-medium text-gray-800">Fast Transfer 24/7</span>
              <div 
                onClick={() => setFastTransfer(!fastTransfer)}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors flex ${fastTransfer ? 'bg-[#2f66ee] justify-end' : 'bg-gray-300 justify-start'}`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>

            {/* Warning Text */}
            <div className="flex gap-3 px-1 mb-5 text-gray-500 items-start">
              <span className="material-symbols-outlined text-yellow-500 text-xl font-bold shrink-0">error</span>
              <p className="text-[13px] leading-tight">Turn off Fast Transfer to make a regular transfer</p>
            </div>

            {/* Fix 2: Destination Bank Dropdown — có thể chọn ngân hàng */}
            <div className="relative mb-3">
              <div
                onClick={() => setShowBankDropdown(v => !v)}
                className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-4 border border-gray-100 p-2 rounded-lg bg-gray-50/50 w-full">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{background: selectedBank.color}}>
                    <span className="text-white font-extrabold italic text-lg leading-none tracking-tighter" style={{fontFamily: 'serif'}}>{selectedBank.abbr}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[15px] text-gray-800">{selectedBank.code}</span>
                    <span className="text-[13px] text-gray-500">{selectedBank.name}</span>
                  </div>
                  <div className="ml-auto">
                    <span className="material-symbols-outlined text-gray-400 transition-transform" style={{transform: showBankDropdown ? 'rotate(180deg)' : 'rotate(0deg)'}}>
                      keyboard_arrow_down
                    </span>
                  </div>
                </div>
              </div>

              {/* Dropdown list */}
              {showBankDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-30 overflow-hidden">
                  {BANKS.map(bank => (
                    <div
                      key={bank.code}
                      onClick={() => { setSelectedBankCode(bank.code); setShowBankDropdown(false); }}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                        bank.code === selectedBankCode ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{background: bank.color}}>
                        <span className="text-white font-bold text-xs" style={{fontFamily: 'serif'}}>{bank.abbr}</span>
                      </div>
                      <div>
                        <p className="font-bold text-[13px] text-gray-800">{bank.code}</p>
                        <p className="text-[11px] text-gray-500">{bank.name}</p>
                      </div>
                      {bank.code === selectedBankCode && (
                        <span className="ml-auto material-symbols-outlined text-[#2f66ee] text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Number Input */}
            <div className={`bg-white rounded-xl border ${accountNoError ? 'border-red-400' : 'border-gray-200'} shadow-sm ${accountNoError ? 'mb-1' : 'mb-3'} overflow-hidden flex items-center transition-colors`}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Account Number"
                value={accountNo}
                onChange={e => {
                  // chỉ nhận ký tự số
                  const val = e.target.value.replace(/[^\d]/g, '');
                  setAccountNo(val);
                  if (val) setAccountNoError('');
                }}
                className="w-full py-4 px-4 outline-none text-[15px] text-gray-800 placeholder-gray-500 font-medium"
              />
              <span className="material-symbols-outlined text-gray-400 pr-4 text-2xl shrink-0">receipt_long</span>
            </div>
            {accountNoError && (
              <div className="flex items-center gap-1 px-1 mb-3 text-red-500">
                <span className="material-symbols-outlined text-[14px]">error</span>
                <span className="text-[12px] font-bold">{accountNoError}</span>
              </div>
            )}

            {/* Transfer to Card Toggle */}
            <div className="flex justify-end items-center gap-3 mb-3 pr-1">
              <span className="text-sm font-bold text-gray-600">Transfer to Card</span>
              <div 
                onClick={() => setTransferToCard(!transferToCard)}
                className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors flex items-center ${transferToCard ? 'bg-[#2f66ee] justify-end' : 'bg-gray-300 justify-start'}`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>

            {/* Amount Section */}
            <div className={`bg-white rounded-xl border ${errorMsg ? 'border-red-400' : 'border-gray-200'} shadow-sm ${errorMsg ? 'mb-1' : 'mb-3'} overflow-hidden flex items-center pr-4 transition-colors`}>
              <div className="flex items-center gap-1 font-bold text-gray-800 px-4 py-4 shrink-0">
                VND <span className="material-symbols-outlined text-gray-400 text-lg">keyboard_arrow_down</span>
              </div>
              <div className="h-6 w-px bg-gray-200 mr-3 shrink-0"></div>
              <input 
                type="text" 
                placeholder="Amount" 
                value={amount}
                onChange={handleAmountChange}
                className="w-full py-4 outline-none text-[15px] text-gray-800 placeholder-gray-500 font-medium min-w-0 bg-transparent" 
              />
            </div>
            
            {errorMsg && (
              <div className="flex items-center gap-1 px-1 mb-3 text-red-500 animate-pulse">
                <span className="material-symbols-outlined text-[14px]">error</span>
                <span className="text-[12px] font-bold">{errorMsg}</span>
              </div>
            )}

            {/* Quick Amount Buttons */}
            <div className="flex gap-2 mb-4 w-full justify-between">
              {[100000, 500000, 1000000].map((val) => (
                <button 
                  key={val}
                  onClick={() => addAmount(val)}
                  className="flex-1 py-3 text-[#2f66ee] font-bold text-[13px] border border-gray-200 rounded-xl bg-white hover:bg-gray-50 active:scale-95 transition-all text-center whitespace-nowrap min-w-0"
                >
                  +{val.toLocaleString('vi-VN')}
                </button>
              ))}
            </div>

            {/* Content Textarea */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 px-4 py-3 min-h-[96px] relative flex flex-col">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Memo</label>
              <textarea 
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full resize-none outline-none text-[15px] font-bold text-gray-800 leading-tight bg-transparent"
                rows={2}
              />
            </div>

            {/* Scan QR Link */}
            <div className="flex justify-end pt-1 mb-8">
              <button className="flex items-center gap-1 text-[#2f66ee] font-bold text-sm tracking-wide active:opacity-70 transition-opacity uppercase">
                SCAN QR <span className="material-symbols-outlined text-lg">arrow_forward_ios</span>
              </button>
            </div>
          </div>
        </div>

        {/* Fixed Continue Button */}
        <div className="fixed bottom-0 left-0 w-full p-4 bg-gray-50/90 backdrop-blur-md pb-6 shrink-0 z-20 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] border-t border-gray-100" style={{ maxWidth: '480px', transform: 'translateX(-50%)', left: '50%' }}>
          <button 
            onClick={handleContinue}
            className="w-full bg-[#2f66ee] text-white font-bold py-4 rounded-xl shadow-lg hover:opacity-95 active:scale-[0.98] transition-all uppercase tracking-wide text-sm"
          >
            CONTINUE
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="absolute inset-0 bg-surface text-on-surface z-[100] flex flex-col font-body bg-[#f4f5f7] max-h-[100dvh]">
        {/* Header */}
        <div className="bg-[#2f66ee] text-white px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 shrink-0">
          <button onClick={() => setStep(1)} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined font-bold text-xl">arrow_back_ios_new</span>
          </button>
          <h1 className="font-bold text-lg flex-1 text-center font-headline">Confirm</h1>
          <button onClick={onSuccessReturnHome} className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined font-bold text-xl">home</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto w-full pb-28 px-4 pt-4">
           {/* DEBIT INFORMATION CARD */}
           <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden" style={{boxShadow: '0 2px 8px rgba(0,0,0,0.02)'}}>
             <div className="bg-[#f8f9fc] px-4 py-3">
               <h3 className="text-[12px] font-bold text-gray-700 tracking-wide uppercase">Debit Information</h3>
             </div>
             <div className="p-4 flex flex-col gap-4">
               <div>
                 <p className="text-gray-500 text-[12px] mb-0.5">From Account</p>
                 <p className="font-bold text-gray-800 text-[14px]">700-031-586225</p>
               </div>
               <div>
                 <p className="text-gray-500 text-[12px] mb-0.5">Sender Name</p>
                 <p className="font-bold text-gray-800 text-[14px] uppercase">NGUYEN XUAN TRUNG</p>
               </div>
             </div>
           </div>

           {/* TRANSACTION INFORMATION CARD */}
           <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden" style={{boxShadow: '0 2px 8px rgba(0,0,0,0.02)'}}>
             <div className="bg-[#f8f9fc] px-4 py-3">
               <h3 className="text-[12px] font-bold text-gray-700 tracking-wide uppercase">Transaction Information</h3>
             </div>
             <div className="p-4 flex flex-col gap-4">
               <div className="flex justify-between items-center">
                 <div>
                   <p className="text-gray-500 text-[12px] mb-0.5">To Account</p>
                   <p className="font-bold text-gray-800 text-[14px]">{accountNo || "0785656734"}</p>
                 </div>
                 <button className="flex items-center gap-1 px-3 py-1.5 border border-[#2f66ee] rounded-full text-[#2f66ee] hover:bg-blue-50 transition-all">
                   <span className="material-symbols-outlined text-[14px] font-bold" style={{fontVariationSettings: "'FILL' 1"}}>add_circle</span>
                   <span className="text-[12px] font-bold">Save Account</span>
                 </button>
               </div>

               <div>
                 <p className="text-gray-500 text-[12px] mb-0.5">Bank</p>
                 <p className="font-bold text-gray-800 text-[14px]">Shinhan Bank Vietnam</p>
               </div>

               <div>
                 <p className="text-gray-500 text-[12px] mb-0.5">Recipient Name</p>
                 <p className="font-bold text-gray-800 text-[14px] uppercase">NGUYEN XUAN TRUNG</p>
               </div>

               <div>
                 <p className="text-gray-500 text-[12px] mb-1">Transfer Amount</p>
                 <div className="flex items-center gap-2">
                   <span className="font-bold text-[10px] bg-[#eef3ff] text-[#2f66ee] px-2 py-0.5 rounded-full uppercase">VND</span>
                   <p className="font-bold text-gray-800 text-[15px]">{amount || "100.000"}</p>
                 </div>
               </div>

               <div>
                 <p className="text-gray-500 text-[12px] mb-1">Transaction Fee</p>
                 <div className="flex items-center gap-2">
                   <span className="font-bold text-[10px] bg-[#eef3ff] text-[#2f66ee] px-2 py-0.5 rounded-full uppercase">VND</span>
                   <p className="font-bold text-gray-800 text-[15px]">0</p>
                 </div>
               </div>

               <div>
                 <p className="text-gray-500 text-[12px] mb-0.5">Memo</p>
                 <p className="font-bold text-gray-800 text-[14px] break-words uppercase">{content}</p>
               </div>
             </div>
           </div>
        </div>

        {/* Loading Overlay khi đang gọi API sau Confirm */}
        {isConfirmLoading && (
          <div className="absolute inset-0 z-[300] bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-5">
            <div className="bg-white rounded-2xl px-8 py-8 flex flex-col items-center gap-4 shadow-2xl mx-6">
              {/* Spinner */}
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-4 border-gray-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-[#2f66ee] animate-spin"></div>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-800 text-[16px] mb-1">Waiting for network signal</p>
                <p className="text-gray-500 text-[13px]">Đang chờ tín hiệu mạng để{"\n"}gửi mã OTP xác thực...</p>
              </div>
              {/* Progress dots */}
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 bg-[#2f66ee] rounded-full animate-bounce" style={{animationDelay: `${i * 0.15}s`}}></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Fixed Continue Button */}
        <div className="fixed bottom-0 left-0 w-full p-4 bg-white pb-6 shrink-0 z-20 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)] border-t border-gray-100" style={{ maxWidth: '480px', transform: 'translateX(-50%)', left: '50%' }}>
          <button
            onClick={handleConfirmReview}
            disabled={isConfirmLoading}
            className={`w-full font-bold py-3.5 rounded-xl shadow-md transition-all text-[15px] ${
              isConfirmLoading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#2f66ee] text-white hover:opacity-95 active:scale-[0.98]'
            }`}
          >
            {isConfirmLoading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
        <div className="absolute inset-0 bg-surface text-on-surface z-[100] flex flex-col font-body bg-white pb-6 max-h-[100dvh] overflow-hidden">
          {/* Notification Toast */}
          <div className={`absolute top-4 left-4 right-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 p-4 transform ${allowTransition ? 'transition-all duration-500' : ''} z-[200] ${showNotification ? 'translate-y-0 opacity-100' : '-translate-y-[150%] opacity-0 pointer-events-none'}`}>
             <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#2f66ee] rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                   <span className="text-white font-extrabold text-xl italic leading-none" style={{fontFamily: 'serif'}}>S</span>
                </div>
                <div>
                   <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-bold text-gray-800 text-[14px]">System Message</h3>
                      <span className="text-[11px] text-gray-400 font-medium">Just now</span>
                   </div>
                   <p className="text-gray-600 text-[13px] leading-tight pr-2">
                     Shinhan Bank: Your transaction OTP code is <strong className="text-[#2f66ee] text-[15px]">{generatedOtp}</strong>. Do not share this code.
                   </p>
                </div>
             </div>
          </div>

          {/* Header */}
          <div className="bg-[#2f66ee] text-white px-4 py-4 flex items-center shadow-sm shrink-0">
            <button onClick={() => setStep(2)} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-xl font-bold">arrow_back_ios_new</span>
            </button>
            <h1 className="font-bold text-lg font-headline flex-1 text-center pr-8">Transaction Authentication</h1>
          </div>

          <div className="flex-1 px-6 py-10 flex flex-col items-center overflow-y-auto">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-[#2f66ee]">
               <span className="material-symbols-outlined text-3xl">lock</span>
            </div>
            
            <h2 className="text-xl font-bold text-gray-800 mb-2">Enter OTP code</h2>
            <p className="text-center text-sm text-gray-500 mb-8 max-w-[280px]">
              An OTP has been sent to your registered phone number. Please enter it to complete.
            </p>

            <div className="flex gap-3 mb-8 w-full justify-center max-w-[320px]">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  className="w-12 h-14 bg-gray-50 border-2 border-gray-100 rounded-xl text-center text-2xl font-bold text-gray-800 outline-none focus:border-[#2f66ee] focus:bg-white transition-colors"
                />
              ))}
            </div>

            <button 
                onClick={handleResendOtp}
                disabled={countdown > 0}
                className={`text-sm font-bold transition-opacity ${countdown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-[#2f66ee] active:opacity-70'}`}
            >
                {countdown > 0 ? `Resend OTP (${countdown}s)` : 'Resend OTP'}
            </button>
          </div>

          <div className="px-4 mt-auto mb-4 w-full" style={{ maxWidth: '480px', margin: '0 auto' }}>
            {/* Fix 3: disabled khi chưa đủ 6 số OTP */}
            <button
                onClick={handleConfirmOtp}
                disabled={!isOtpComplete}
                className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all uppercase tracking-wide text-sm ${
                  isOtpComplete
                    ? 'bg-[#2f66ee] text-white hover:opacity-95 active:scale-[0.98]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
              Confirm
            </button>
          </div>
        </div>
    );
  }

  if (step === 4) {
    return (
      <div className="absolute inset-0 z-[100] flex flex-col font-body max-h-[100dvh] overflow-hidden bg-white">

        {/* ── HEADER (Shinhan style) ── */}
        <div className="bg-[#2f66ee] text-white px-4 py-4 flex items-center justify-between shrink-0">
          <div className="w-8" />
          <h1 className="font-bold text-[16px]">Giao dịch thành công</h1>
          <button onClick={onSuccessReturnHome} className="p-1 rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-xl">home</span>
          </button>
        </div>

        {/* ── MAIN SCROLL AREA ── */}
        <div className="flex-1 overflow-y-auto bg-[#f5f6fa]">

          {/* Success card — Shinhan style */}
          <div className="bg-white mx-4 mt-5 mb-3 rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            {/* Top success section */}
            <div className="flex flex-col items-center pt-8 pb-6 px-4">
              {/* Simple green check — exactly like Shinhan */}
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-4 shadow-lg shadow-green-100">
                <span className="material-symbols-outlined text-white" style={{fontSize: '38px', fontVariationSettings: "'FILL' 1, 'wght' 700"}}>check</span>
              </div>
              <h2 className="text-[18px] font-bold text-gray-800 mb-1">Transfer Successful</h2>
              <p className="text-gray-400 text-[12px] mb-5">{successTimestamp}</p>
              {/* Amount — Shinhan blue bold */}
              <p className="text-[32px] font-extrabold text-[#2f66ee] tracking-tight">
                {amount || '0'} <span className="text-[20px] font-bold text-[#2f66ee]">VND</span>
              </p>
            </div>

            {/* Divider with scissor icon (Shinhan-like receipt cut) */}
            <div className="relative flex items-center px-4 py-1">
              <div className="flex-1 border-t border-dashed border-gray-200" />
              <div className="mx-2 w-5 h-5 bg-[#f5f6fa] rounded-full flex items-center justify-center -mx-2.5 border border-gray-100 shrink-0 z-10">
                <span className="material-symbols-outlined text-gray-300 text-[12px]">content_cut</span>
              </div>
              <div className="flex-1 border-t border-dashed border-gray-200" />
            </div>

            {/* Receipt rows */}
            <div className="px-5 py-4 flex flex-col gap-3.5">
              {[
                { label: 'Recipient', value: 'NGUYEN XUAN TRUNG', bold: true },
                { label: 'Bank', value: selectedBank.name, bold: false },
                { label: 'Account No.', value: accountNo || '1983021980823', blue: true, mono: true },
                { label: 'Memo', value: content, bold: false, wrap: true },
                { label: 'Transaction Fee', value: 'FREE', green: true },
              ].map(row => (
                <div key={row.label} className={`flex justify-between ${row.wrap ? 'items-start' : 'items-center'}`}>
                  <span className="text-gray-400 text-[13px]">{row.label}</span>
                  <span className={`text-[13px] text-right max-w-[200px] ${row.wrap ? 'break-words leading-snug' : ''} ${row.bold ? 'font-bold text-gray-800' : ''} ${row.blue ? 'font-bold text-[#2f66ee] font-mono' : ''} ${row.green ? 'font-bold text-green-600' : ''} ${!row.bold && !row.blue && !row.green ? 'text-gray-800 font-medium' : ''}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom action toolbar — Shinhan style */}
          <div className="flex justify-around items-center bg-white mx-4 rounded-2xl py-3 shadow-sm border border-gray-100 mb-5">
            {[
              { icon: 'bookmark', label: 'Lưu mẫu' },
              { icon: 'image', label: 'Tải ảnh' },
              { icon: 'share', label: 'Chia sẻ' },
              { icon: 'info', label: 'Chi tiết' },
            ].map(item => (
              <button key={item.icon} className="flex flex-col items-center gap-1 px-3 py-1 hover:bg-gray-50 rounded-xl transition-colors">
                <span className="material-symbols-outlined text-gray-500 text-[22px]">{item.icon}</span>
                <span className="text-[11px] text-gray-500 font-medium">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Main action button */}
          <div className="px-4 pb-8">
            <button
              onClick={onSuccessReturnHome}
              className="w-full bg-[#2f66ee] text-white font-bold py-4 rounded-xl shadow-md shadow-blue-100 hover:opacity-95 active:scale-[0.98] transition-all text-[15px]"
            >
              Giao dịch khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
