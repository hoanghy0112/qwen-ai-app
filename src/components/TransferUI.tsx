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
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
}

export default function TransferUI({ onBack, onSuccessReturnHome, onOpenAdvisor, balance, setBalance }: TransferUIProps) {
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
  const [showDeductedNotif, setShowDeductedNotif] = useState(false);
  const [showAvatarNotif, setShowAvatarNotif] = useState(false);
  const [allowTransition, setAllowTransition] = useState(false);
  // Script từ API recommend - lưu lại để dùng ở step 4
  const [recommendScript, setRecommendScript] = useState('');

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
      const initTimer = setTimeout(() => setAllowTransition(true), 50);
      const showTimer = setTimeout(() => {
        setShowDeductedNotif(true);
        setTimeout(() => {
          setShowDeductedNotif(false);
        }, 5000);
      }, 2500);
      const avatarTimer = setTimeout(() => {
        setShowAvatarNotif(true);
      }, 3500);
      return () => {
        clearTimeout(initTimer);
        clearTimeout(showTimer);
        clearTimeout(avatarTimer);
      };
    } else {
      setShowDeductedNotif(false);
      setShowAvatarNotif(false);
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

  const handleContinue = async () => {
    const amountVal = parseFloat(amount.replace(/[^\d]/g, '')) || 0;
    if (amountVal <= 0) {
      setErrorMsg('Please enter a valid amount');
      return;
    }
    if (amountVal > balance) {
      setErrorMsg('Insufficient balance');
      return;
    }

    try {
      let data;

      if (USE_MOCK) {
        // Giả lập độ trễ của API (1-2 giây)
        await new Promise(resolve => setTimeout(resolve, 1000));
        data = mockRecommendResponse;
        console.log('[MOCK] Recommend Response:', data);
      } else {
        // Gọi API thật - theo đúng schema của backend
        const response = await fetch('/api/flows/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: `session_${Date.now()}`,
            user_token: 'user_12345',
            transaction: {
              amount: amountVal,
              merchant: 'Transfer',
              category: 'transfer'
            }
          })
        });
        data = await response.json();
        console.log('[API] Recommend Response:', data);
      }

      // ✅ Chỉ lưu script vào state, KHÔNG switch tab ngay
      // Avatar toast ở step 4 sẽ dùng script này khi user tap
      if (data?.script) {
        setRecommendScript(data.script);
      }

    } catch (error) {
      console.error('Lỗi khi gọi API recommend:', error);
    }

    setErrorMsg('');
    setAllowTransition(false);
    setStep(2);
  };

  const handleConfirmReview = () => {
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
    setAllowTransition(false);
    setBalance(prev => prev - amountVal);
    setStep(4);
  };

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
              <span className="font-bold text-gray-800 text-lg">{balance.toLocaleString('vi-VN')}</span>
              <span className="material-symbols-outlined text-gray-600 text-lg ml-1">visibility_off</span>
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

            {/* Destination Bank Dropdown */}
            <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm mb-3 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-4 border border-gray-100 p-2 rounded-lg bg-gray-50/50 w-full">
                <div className="bg-[#2f66ee] w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white font-extrabold italic text-lg leading-none tracking-tighter shrink-0" style={{fontFamily: 'serif'}}>S</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[15px] text-gray-800">SHBVN</span>
                  <span className="text-[13px] text-gray-500">Shinhan Bank Vietnam</span>
                </div>
                <div className="ml-auto">
                    <span className="material-symbols-outlined text-gray-400">keyboard_arrow_down</span>
                </div>
              </div>
            </div>

            {/* Account Number Input */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-3 overflow-hidden flex items-center">
              <input 
                type="text" 
                placeholder="Account Number" 
                value={accountNo}
                onChange={e => setAccountNo(e.target.value)}
                className="w-full py-4 px-4 outline-none text-[15px] text-gray-800 placeholder-gray-500 font-medium" 
              />
              <span className="material-symbols-outlined text-gray-400 pr-4 text-2xl shrink-0">receipt_long</span>
            </div>

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

        {/* Fixed Continue Button */}
        <div className="fixed bottom-0 left-0 w-full p-4 bg-white pb-6 shrink-0 z-20 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)] border-t border-gray-100" style={{ maxWidth: '480px', transform: 'translateX(-50%)', left: '50%' }}>
          <button 
            onClick={handleConfirmReview}
            className="w-full bg-[#2f66ee] text-white font-bold py-3.5 rounded-xl shadow-md hover:opacity-95 active:scale-[0.98] transition-all text-[15px]"
          >
            Confirm
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
            <button 
                onClick={handleConfirmOtp}
                className="w-full bg-[#2f66ee] text-white font-bold py-4 rounded-xl shadow-lg hover:opacity-95 active:scale-[0.98] transition-all uppercase tracking-wide text-sm"
            >
              Confirm
            </button>
          </div>
        </div>
    );
  }

  if (step === 4) {
    return (
        <div className="absolute inset-0 bg-surface text-on-surface z-[100] flex flex-col font-body bg-gray-50 pb-6 max-h-[100dvh] overflow-hidden">
          {/* Avatar Notification Toast */}
          <div 
            onClick={() => onOpenAdvisor(
              recommendScript ||
              `I noticed you just successfully transferred ${amount} VND. Do you need any assistance regarding this transaction?`
            )}
            className={`absolute top-[104px] left-4 right-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-blue-50 p-4 transform ${allowTransition ? 'transition-all duration-500' : ''} z-[190] cursor-pointer hover:bg-gray-50 active:scale-[0.98] ${showAvatarNotif ? 'translate-y-0 opacity-100' : '-translate-y-[200%] opacity-0 pointer-events-none'}`}
          >
             <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0 shadow-md mt-0.5 border border-indigo-400">
                   <span className="text-white text-[22px] material-symbols-outlined shrink-0">robot_2</span>
                </div>
                <div className="flex-1">
                   <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 text-[14px]">AI Advisor</h3>
                      <span className="text-[11px] text-gray-400 font-medium">Just now</span>
                   </div>
                   <p className="text-gray-600 text-[13px] leading-tight pr-2">
                     Transfer Successful! Tap here if you need any assistance regarding this transaction.
                   </p>
                </div>
             </div>
          </div>
          {/* Balance Deduction Toast */}
          <div className={`absolute top-4 left-4 right-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-red-50 p-4 transform ${allowTransition ? 'transition-all duration-500' : ''} z-[200] ${showDeductedNotif ? 'translate-y-0 opacity-100' : '-translate-y-[150%] opacity-0 pointer-events-none'}`}>
             <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-100/50 rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5 border border-red-50">
                   <span className="text-red-500 text-[22px] material-symbols-outlined shrink-0">account_balance_wallet</span>
                </div>
                <div className="flex-1">
                   <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-bold text-gray-800 text-[14px]">Balance Changes</h3>
                      <span className="text-[11px] text-gray-400 font-medium">Just now</span>
                   </div>
                   <p className="text-gray-600 text-[13px] leading-tight pr-2">
                     Account <strong className="text-gray-800">700-031-586225</strong>: <span className="text-red-600 font-bold">-{amount} VND</span>. Current Balance: <strong className="text-[#2f66ee] text-[14px]">{balance.toLocaleString('vi-VN')} VND</strong>.
                   </p>
                </div>
             </div>
          </div>

             {/* Header */}
            <div className="bg-[#2f66ee] text-white px-4 py-4 flex items-center justify-between shadow-sm shrink-0">
                <div className="w-8"></div>
                <h1 className="font-bold text-lg font-headline">Transaction Result</h1>
                <div className="w-8"></div>
            </div>

            <div className="flex-1 flex flex-col items-center px-4 pt-12 overflow-y-auto w-full">
                {/* Success Icon Animation */}
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 relative shadow-[0_0_0_10px_rgba(220,252,231,0.5)]">
                    <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-pulse"></div>
                    <span className="material-symbols-outlined text-green-500" style={{fontSize: '56px', fontVariationSettings: "'FILL' 1, 'wght' 700"}}>check_circle</span>
                </div>

                <h2 className="text-2xl font-bold text-gray-800 text-center mb-1 font-headline">Transfer<br/>Successful</h2>
                <div className="text-center font-bold text-gray-400 text-sm mb-8">{new Date().toLocaleString('en-US')}</div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 w-full mb-6">
                    <div className="flex flex-col items-center border-b border-dashed border-gray-200 pb-5 mb-5 w-full">
                        <span className="text-sm font-bold text-gray-500 mb-2 uppercase">Transfer Amount</span>
                        <span className="text-4xl font-extrabold text-[#2f66ee] font-headline">
                             {amount || "100.000"} <span className="text-xl">VND</span>
                        </span>
                    </div>

                    <div className="flex flex-col gap-4 w-full">
                        <div className="flex justify-between items-start">
                            <span className="text-gray-500 text-[13px] w-24 shrink-0 font-medium tracking-wide">Recipient</span>
                            <span className="font-bold text-gray-800 text-right leading-tight max-w-[200px]">NGUYEN XUAN TRUNG</span>
                        </div>
                         <div className="flex justify-between items-start">
                            <span className="text-gray-500 text-[13px] w-24 shrink-0 font-medium tracking-wide">Bank</span>
                            <span className="font-bold text-gray-800 text-right leading-tight max-w-[200px]">Shinhan Bank Vietnam</span>
                        </div>
                        <div className="flex justify-between items-start">
                            <span className="text-gray-500 text-[13px] w-24 shrink-0 font-medium tracking-wide">Account Number</span>
                            <span className="font-bold text-[#2f66ee] text-right font-mono text-[15px]">{accountNo || "1983021980823"}</span>
                        </div>
                         <div className="flex justify-between items-start">
                            <span className="text-gray-500 text-[13px] w-24 shrink-0 font-medium tracking-wide">Memo</span>
                            <span className="font-bold text-gray-800 text-right text-sm leading-tight max-w-[200px] break-words">
                                {content}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 w-full mt-auto mb-4" style={{ maxWidth: '480px', margin: '0 auto' }}>
                   <div className="w-full">
                        <button 
                            onClick={onSuccessReturnHome}
                            className="w-full bg-[#2f66ee] text-white font-bold py-4 rounded-xl shadow-lg hover:opacity-95 active:scale-[0.98] transition-all uppercase tracking-wide text-sm"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  return null;
}
