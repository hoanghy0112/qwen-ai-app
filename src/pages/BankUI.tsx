import React, { useState } from "react";
import AiAssistantWidget from "../components/AiAssistantWidget";
import TransferUI from "../components/TransferUI";
import AccountUI from "../components/AccountUI";
import InvestmentUI from "../components/InvestmentUI";
import LoginUI from "../components/LoginUI";
import PaymentHistoryUI from "../components/PaymentHistoryUI";
import { api } from "../lib/api";
import { registerPush, unregisterPush, onPushMessage } from "../lib/push";

export default function BankUI() {
  const [notification, setNotification] = useState("");
  const [activeTab, setActiveTab] = useState("Home");
  const [showPaymentMenu, setShowPaymentMenu] = useState(false);
  const [balance, setBalance] = useState(0);
  const [preloadedAudioUrl, setPreloadedAudioUrl] = useState<string | null>(null);
  const [productContext, setProductContext] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);

  // ── Global persistent notifications ──
  const [globalDeductToast, setGlobalDeductToast] = useState<{ show: boolean; amount: string; remaining: number } | null>(null);
  const [globalAdvisorToast, setGlobalAdvisorToast] = useState<{ show: boolean; audioUrl: string | null; script: string; payload?: any } | null>(null);
  const [simulationAlert, setSimulationAlert] = useState<{ stock_code: string; status: string; message: string } | null>(null);

  // ── Fix 3: Warm Flow 1A ngay khi BankUI mount (trang Home) ──
  // 90% user sẽ vào Transfer → pre-warm sớm giúp Flow 2 luôn hit cache.
  // Backend đã có request coalescing (Fix 3 server) nên dù FE gọi 2 lần cũng chỉ 1 LLM call.
  const flow1aWarmed = React.useRef(false);

  const warmFlow1ACache = () => {
    if (flow1aWarmed.current) return;
    flow1aWarmed.current = true;

    // Fire-and-forget: warm the server-side Flow 1A TTL cache
    api.post('/api/flows/classify-product', { user_token: 'user_12345' })
      .then(res => res.json())
      .then(data => console.log('[Flow 1A warm] Segment cached:', data.spending_segment))
      .catch(err => console.warn('[Flow 1A warm] Failed (non-critical):', err));
  };

  // Gọi warm ngay khi component mount (trang Home load)
  React.useEffect(() => {
    warmFlow1ACache();
    fetchProfile();
  }, []);

  // ── Web-Push (PWA) ──────────────────────────────────────────────
  // Replaces the old `/api/simulation/check` + `/api/notifications/check`
  // polling loops. The backend now dispatches Web-Push via VAPID to the
  // service worker (see FE/src/sw.ts), which:
  //   1) Shows a native OS notification (works when the tab is closed), and
  //   2) Posts an in-app message so we can render the existing toast UI
  //      below without a page reload.
  const accountId: string | undefined = user?.user?.id;

  /*
  // Register / refresh the push subscription whenever the logged-in
  // account changes (including on first mount for anonymous broadcasts).
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await registerPush(accountId ?? null);
        if (cancelled) return;
      } catch (err) {
        console.warn('[push] registration failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId]);
  */

  // ── Notification Polling ───────────────────────────────────────────
  // Replaces Web-Push listeners with a continuous polling mechanism.
  // Polls every 3 seconds for new unread notifications.
  React.useEffect(() => {
    if (!user) return;

    const poll = async () => {
      try {
        const res = await api.get('/api/notifications/check');
        if (res.ok) {
          const { notifications } = await res.json();
          if (notifications && notifications.length > 0) {
            for (const notif of notifications) {
              await handleNotification(notif);
              // Mark as read immediately so we don't show it again in next poll
              api.patch(`/api/notifications/${notif.id}/read`, {}).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn('[polling] check failed:', err);
      }
    };

    const handleNotification = async (notif: any) => {
      if (notif.type === 'alert') {
        const d = notif.payload || {};
        setSimulationAlert({
          stock_code: d.stock_code || 'UNKNOWN',
          status: d.status || 'VOLATILE',
          message: d.message || notif.body || notif.title,
        });
      } else if (notif.type === 'recommendation') {
        await handleAdvisor(notif.payload || {});
      }
    };

    const handleAdvisor = async (payload: any) => {
      const script: string = payload?.script || '';
      if (!script) return;
      let audioUrl: string | null = null;
      try {
        const ttsRes = await fetch('/api/cosyvoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: script }),
        });
        if (ttsRes.ok) {
          const blob = await ttsRes.blob();
          audioUrl = URL.createObjectURL(blob);
        }
      } catch (e) {
        // TTS is best-effort
      }
      setGlobalAdvisorToast({ show: true, audioUrl, script, payload });
    };

    const interval = setInterval(poll, 3000);
    poll(); // Initial check

    return () => clearInterval(interval);
  }, [user]);

  // We keep onPushMessage for now as a fallback or remove if strictly requested
  // but the user said "Migrate from", so I'll comment out the push listener.
  /*
  React.useEffect(() => {
    // ... (old push listener code)
  }, []);
  */

  // On logout — drop the subscription so the device stops receiving
  // push for a signed-out user.
  React.useEffect(() => {
    if (user === null) {
      unregisterPush().catch(() => {});
    }
  }, [user]);

  const handleTransactionComplete = (amount: string) => {
    setGlobalDeductToast({ show: true, amount, remaining: balance });
    const timer = setTimeout(() => setGlobalDeductToast(null), 6000);
    return () => clearTimeout(timer);
  };

  const handleAdvisorReady = (audioUrl: string | null, script: string) => {
    setGlobalAdvisorToast({ show: true, audioUrl, script });
  };

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await api.get('/api/auth/profile');
      if (res.ok) {
        const data = await res.json();
        setUser({ user: data });
        if (data.balance !== undefined) {
          setBalance(data.balance);
        }
      } else {
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setIsLoggingIn(false);
    if (userData.user?.balance !== undefined) {
      setBalance(userData.user.balance);
    }
    // Optionally save token
    if (userData.access_token) {
      localStorage.setItem('token', userData.access_token);
    }
  };

  const handleServiceClick = (serviceName: string) => {
    if (serviceName === "Transfer") {
      warmFlow1ACache(); // Fallback warm nếu useEffect chưa kịp chạy (edge case)
      setActiveTab("Transfer");
      return;
    }
    if (serviceName === "Account") {
      setActiveTab("Account");
      return;
    }
    if (serviceName === "Payments") {
      setShowPaymentMenu(true);
      return;
    }
    if (serviceName === "Investments") {
      setActiveTab("Investments");
      return;
    }
    // Other services are currently disabled per user request
  };

  const DEMO_PAYMENTS = [
    { title: 'Travel', icon: 'flight', sector: 'Travel', mcc: '4722', color: '#3b82f6', amount: 2500000 },
    { title: 'Tuition', icon: 'school', sector: 'Education', mcc: '8211', color: '#a855f7', amount: 15000000 },
    { title: 'Shopping', icon: 'shopping_bag', sector: 'Shopping', mcc: '5311', color: '#ec4899', amount: 850000 },
    { title: 'Dining', icon: 'restaurant', sector: 'F&B', mcc: '5812', color: '#f97316', amount: 350000 },
    { title: 'Utilities', icon: 'bolt', sector: 'Utilities', mcc: '4900', color: '#eab308', amount: 450000 },
  ];

  const handleCreateDemoTransaction = async (demo: typeof DEMO_PAYMENTS[0]) => {
    if (!user) {
      setIsLoggingIn(true);
      setShowPaymentMenu(false);
      return;
    }
    
    setIsCreatingDemo(true);
    try {
      const res = await api.post('/api/transactions', {
        accountId: user.user.id,
        amount: demo.amount,
        merchantName: demo.title,
        merchantMcc: demo.mcc,
        description: `Demo payment for ${demo.sector}`,
        customerName: user.user.username,
        status: 'COMPLETED',
        type: 'PURCHASE',
      });

      if (res.ok) {
        const amountStr = demo.amount.toLocaleString('vi-VN');
        setBalance(prev => prev - demo.amount);
        setGlobalDeductToast({ show: true, amount: amountStr, remaining: balance - demo.amount });
        setTimeout(() => setGlobalDeductToast(null), 6000);
        setShowPaymentMenu(false);
      }
    } catch (err) {
      console.error('Failed to create demo transaction:', err);
    } finally {
      setIsCreatingDemo(false);
    }
  };

  return (
    <div
      className="bg-surface text-on-surface pb-24 min-h-screen relative font-body"
      style={{
        width: "100vw",
        maxWidth: "480px",
        margin: "0 auto",
        overflowX: "hidden",
      }}
    >
      {/* HEADER */}
      <header className="bg-[#00306b] dark:bg-slate-950 flex justify-between items-center w-full px-6 h-16 sticky top-0 z-50 shadow-none">
        <div className="flex items-center gap-4">
          <span
            className="material-symbols-outlined text-white hover:bg-white/10 p-2 rounded-full transition-transform active:scale-95 duration-150 cursor-pointer"
            data-icon="notifications"
          >
            notifications
          </span>
          <span
            className="material-symbols-outlined text-white hover:bg-white/10 p-2 rounded-full transition-transform active:scale-95 duration-150 cursor-pointer"
            data-icon="search"
          >
            search
          </span>
        </div>
        <h1 className="text-lg font-bold tracking-tight text-white font-headline">
          SHINHAN BANK
        </h1>
        <div className="flex items-center gap-4">
          <span
            className="material-symbols-outlined text-white hover:bg-white/10 p-2 rounded-full transition-transform active:scale-95 duration-150 cursor-pointer"
            data-icon="phone"
          >
            phone
          </span>
          <div className="w-6 h-4 bg-red-600 relative overflow-hidden rounded-sm flex items-center justify-center">
            <span className="text-[8px] text-yellow-400">★</span>
          </div>
        </div>
      </header>

      {/* DYNAMIC TAB CONTENT */}
      <main className="w-full">
        {/* MAIN: TRANSFER UI */}
        {activeTab === "Transfer" && (
          <TransferUI 
            onBack={() => setActiveTab("Home")}
            onSuccessReturnHome={() => setActiveTab("Home")}
            onOpenAdvisor={(msg) => {
              if (msg.startsWith('__AUDIO__')) {
                const rest = msg.slice('__AUDIO__'.length);
                const sepIdx = rest.indexOf('||');
                if (sepIdx !== -1) {
                  const audioUrl = rest.slice(0, sepIdx);
                  const script = rest.slice(sepIdx + 2);
                  setNotification(script);
                  setPreloadedAudioUrl(audioUrl);
                } else {
                  setNotification(rest);
                }
              } else {
                setNotification(msg);
                setPreloadedAudioUrl(null);
              }
              setProductContext(null);
              setActiveTab("AI Advisor");
            }}
            onTransactionComplete={handleTransactionComplete}
            onAdvisorReady={handleAdvisorReady}
            balance={balance}
            setBalance={setBalance}
          />
        )}

        {/* MAIN: ACCOUNT UI */}
        {activeTab === "Account" && (
          <AccountUI 
            onBack={() => setActiveTab("Home")} 
            balance={balance}
          />
        )}

        {/* MAIN: INVESTMENT UI */}
        {activeTab === "Investments" && (
          <InvestmentUI 
            balance={balance}
            onBack={() => setActiveTab("Home")}
          />
        )}

        {activeTab === "Home" && (
          <>
            {/* Hero Section & Greeting */}
            <section className="relative h-64 overflow-hidden">
              <img
                alt="Digital Banking Background"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEpKBvqJHuavcWY6Xn3xlxA4Nb0RJO4f2pbTuQ36mWYFIrfSkds3GZbQIpHDb4ElYba8Hm6aYEPpVTdfy_myWZ53FqgfHDtxji_UoTS2mf_3WI1TkbeQ0qf9unut0JsXW7o2Tvr2SeeFKdJcHJgyibRUQ0olWufmSEykkCW1S5--thM3rHS8B4-rSDJY-voUfh0YDmyWYbzj7X_pqDPHF5oEC9a55TH3wHYoZEG7bE61r9oZJzarVZkEMHNzbgE2p9uOfm363JmBLh"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#00306b]/40"></div>
              <div className="absolute bottom-8 left-0 right-0 px-6 text-center">
                <p className="text-white font-headline text-lg font-bold leading-snug">
                  Welcome to
                  <br />
                  Shinhan SOL Vietnam
                </p>
              </div>
            </section>

            {/* Auth Actions */}
            <section className="px-6 -mt-6 relative z-10 grid grid-cols-2 gap-4">
              {!user ? (
                <>
                  <button 
                    onClick={() => setIsLoggingIn(true)}
                    className="bg-secondary-container text-white py-4 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 active:scale-95 transition-all"
                  >
                    LOGIN
                  </button>
                  <button className="bg-[#00306b] text-white py-4 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 active:scale-95 transition-all">
                    REGISTER
                  </button>
                </>
              ) : (
                <div className="col-span-2 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#00306b] rounded-full flex items-center justify-center text-white font-bold">
                      {(user.user?.username || user.username)?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Authenticated</p>
                      <p className="text-sm font-bold text-gray-800">{user.user?.username || user.username}</p>
                      <p className="text-[11px] font-bold text-[#00306b]">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(balance)}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setUser(null)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined">logout</span>
                  </button>
                </div>
              )}
            </section>

            {/* Banking Services Grid */}
            <section className="mt-8 px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-on-surface font-headline font-bold text-lg">
                  Banking Services
                </h2>
                <span
                  className="material-symbols-outlined text-primary-container"
                  style={{ fontSize: "16px" }}
                  data-icon="arrow_forward_ios"
                >
                  arrow_forward_ios
                </span>
              </div>
              <div className="grid grid-cols-4 gap-y-8 gap-x-2">
                {[
                  { name: "Transfer", icon: "swap_horiz" },
                  { name: "Account", icon: "account_balance" },
                  { name: "Open Account", icon: "person_add" },
                  { name: "Payments", icon: "receipt_long" },
                  { name: "Cards", icon: "credit_card" },
                  { name: "Loans", icon: "real_estate_agent" },
                  { name: "ATM Withdrawals", icon: "atm" },
                  { name: "E-Wallet", icon: "account_balance_wallet" },
                  { name: "Investments", icon: "trending_up" },
                  { name: "Digital Insurance", icon: "verified_user" },
                  { name: "Group Settings", icon: "groups" },
                  { name: "FX Trading", icon: "currency_exchange" },
                ].map((service, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center gap-2 group cursor-pointer"
                    onClick={() => handleServiceClick(service.name)}
                  >
                    <div className="w-14 h-14 bg-surface-container-low rounded-2xl flex items-center justify-center group-active:scale-90 transition-transform">
                      <span
                        className="material-symbols-outlined text-primary text-2xl"
                        data-icon={service.icon}
                      >
                        {service.icon}
                      </span>
                    </div>
                    <span className="text-[11px] text-center font-medium leading-tight text-on-surface-variant">
                      {service.name}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Promotional Banner */}
            <section className="mt-10 px-6 pb-12">
              <div className="rounded-2xl overflow-hidden shadow-sm bg-surface-container-lowest">
                <img
                  alt="Financial Promotion"
                  className="w-full h-40 object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCqbvU5yBaBswUWcnhy5p4SM3kVVGrqYGgzxI3lDMJMFKPtl8pgqUAnaa1tE7-g9VLr0H65WX7MSSQfxY_CX2SUhMZmONqwwnCadgtAhaU8KXmNDXsON_xD7NPNWfrh90O54PoJok8Awswn5mjP2p6drkWFaZa_0ERbuUv6ttPKYPxyZr13gWSeikSVcD1qy9aUGTe3fCYuGu19sJdbkj8gRXtyknNzdPuk_e6crAk0U2IwMpACBNx34dEmKdQC96NP0eSZ6YH1lVJ"
                />
                <div className="p-4">
                  <p className="text-xs font-bold text-primary mb-1">
                    NEW PROMOTION
                  </p>
                  <p className="text-on-surface font-semibold text-sm">
                    Special consumer loan rate starting from 5.9%/year
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {/* MAIN: AI ADVISOR OVERLAY */}
        {activeTab === "AI Advisor" && (
          <div className="w-full flex flex-col justify-end p-4 pb-28 min-h-[calc(100vh-64px)] relative z-20">
            {/* The 3D avatar handles its own transparent background via <AiAssistantWidget/> overlay */}
            <AiAssistantWidget
              textToSpeak={notification}
              preloadedAudioUrl={preloadedAudioUrl ?? undefined}
              productContext={productContext}
              onAudioEnd={() => { setNotification(""); setPreloadedAudioUrl(null); }}
              onTextInput={(val) => setNotification(val)}
            />
          </div>
        )}

        {/* Tab: Information */}
        {activeTab === 'Information' && (
          <div className="w-full relative z-10 px-6 mt-6 pb-28">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-bold text-primary tracking-tight">Promotions</h2>
              <button className="text-sm font-semibold text-secondary hover:opacity-80 transition-opacity">Show more</button>
            </div>
            
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#6a5acd] to-[#483d8b] shadow-xl group cursor-pointer aspect-[16/9]">
              <img alt="" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAb8O7Ax_sT9BWqI5334wInnhHgqf0Gm_9W_pWubUpnUhS3kxhLYRNQ_W1ImCBxEymuUg2GuFGBoA5C48yo4LZkVP-mOIlCzCdDmgm6yF84wQTs-Ak344uoSok4_dEJbCfK6jEHYx8EctntQtbm2Lhm7Setjz7mykGib9BxTzMiwsBhhCCvreCs96lJQ5NnBnrccrMryZS3V50fVRLTUEI2dgTmd5M9rUD1IsPhYM4RfmCupJ3tYxTAu_OJGhODGs9UNzZB4N8ZdMPh"/>
              <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                <div className="max-w-[70%]">
                  <span className="inline-block px-2 py-1 rounded bg-white/20 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-widest mb-2">Exclusive Offer</span>
                  <h3 className="text-lg font-extrabold text-white leading-tight uppercase">NEED CASH? WITHDRAW NOW FROM YOUR SHINHAN CREDIT CARD</h3>
                </div>
                <div className="flex justify-between items-end">
                  <div className="bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    <p className="text-[10px] text-white/80 font-medium">Promotion period</p>
                    <p className="text-xs text-white font-bold">16/03/2026 - 16/04/2026</p>
                  </div>
                  <div className="w-20 h-20 -mb-2">
                    <img alt="" className="w-full h-full object-contain drop-shadow-2xl" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHa5yCmpAN5x3M8hVQGPuf9qGTQ0yTP0Ey95c_TeOnzkNTmSXtt1NhRzM027z96oFzJRiD8NRie-Q3O_B6ifxmjdBFCLfS-_840UNR6eGZGD9qtP7-30FiJTs6gn0oIes6AtUnp8yqpENnZCMPMgz-Pm7OZ2uQHBUdQjZHRwl3MgNaOgmPqwcO5Gn2ptxQ7z9uN9_KPKePAf0ujDssplLITlTOYP6aTrJYKkxo3O8AdjQ_FHuon-VO4P60hexX67Z0ffYC0gVhXAj1"/>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="text-xl font-bold text-primary tracking-tight mb-6 mt-10">News &amp; Entertainment</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: 'Shinhan News', icon: 'newspaper', colorClass: 'text-[#004695]', bgClass: 'bg-blue-50' },
                { title: 'Cashback Shopping', icon: 'shopping_bag', colorClass: 'text-orange-500', bgClass: 'bg-orange-50' },
                { title: 'Financial Tools', icon: 'calculate', colorClass: 'text-green-600', bgClass: 'bg-green-50' },
                { title: 'Booking & Travel', icon: 'directions_bus', colorClass: 'text-cyan-600', bgClass: 'bg-cyan-50' },
                { title: 'Privileges', icon: 'workspace_premium', colorClass: 'text-purple-600', bgClass: 'bg-purple-50' },
                { title: 'Vietlott SMS', icon: 'confirmation_number', colorClass: 'text-red-600', bgClass: 'bg-red-50' }
              ].map((item, idx) => (
                <div key={idx} className="col-span-1 bg-surface-container-lowest p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-transform active:scale-95 shadow-sm hover:shadow-md border border-outline-variant/10">
                  <div className={`w-14 h-14 ${item.bgClass} rounded-full flex items-center justify-center mb-3`}>
                    <span className={`material-symbols-outlined ${item.colorClass} text-3xl`} data-icon={item.icon}>{item.icon}</span>
                  </div>
                  <span className="text-sm font-bold text-on-surface leading-tight">{item.title}</span>
                </div>
              ))}
            </div>

            <div className="bg-surface-container-low rounded-3xl p-6 flex items-center gap-4 mt-8">
              <div className="bg-white p-3 rounded-2xl shadow-sm">
                <span className="material-symbols-outlined text-primary text-3xl">security</span>
              </div>
              <div>
                <h4 className="font-bold text-primary">Secure Banking</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">Update the latest security methods to protect your account effectively.</p>
              </div>
            </div>
          </div>
        )}

        {/* Other Tabs */}
        {["QR", "Settings"].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center p-8 mt-20 opacity-60">
            <span
              className="material-symbols-outlined text-6xl text-primary mb-4"
              data-icon="construction"
            >
              construction
            </span>
            <h2 className="text-xl font-headline font-bold text-on-surface">
              {activeTab} Feature
            </h2>
            <p className="text-sm font-body mt-2 text-center text-on-surface-variant">
              Currently under development and optimization.
            </p>
          </div>
        )}
      </main>

      {/* BOTTOM NAV */}
      {activeTab !== "Investments" && (
      <nav
        className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pt-3 pb-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-50 rounded-t-3xl shadow-[0_-12px_24px_-4px_rgba(0,0,0,0.06)]"
        style={{
          maxWidth: "480px",
          transform: "translateX(-50%)",
          left: "50%",
        }}
      >
        <div
          onClick={() => setActiveTab("Home")}
          className={`flex flex-col items-center justify-center rounded-2xl px-3 py-1.5 transition-transform duration-200 active:scale-90 cursor-pointer ${activeTab === "Home" ? "bg-[#f1f4f7] dark:bg-slate-800 text-[#004695] dark:text-blue-400" : "text-slate-500 hover:opacity-80"}`}
        >
          <span
            className="material-symbols-outlined"
            data-icon="home"
            style={{
              fontVariationSettings:
                activeTab === "Home" ? "'FILL' 1" : "",
            }}
          >
            home
          </span>
          <span className="text-[10px] font-medium font-headline mt-1">
            Home
          </span>
        </div>

        <div
          onClick={() => setActiveTab("Information")}
          className={`flex flex-col items-center justify-center rounded-2xl px-3 py-1.5 transition-transform duration-200 active:scale-90 cursor-pointer ${activeTab === "Information" ? "bg-[#f1f4f7] dark:bg-slate-800 text-[#004695] dark:text-blue-400" : "text-slate-500 hover:opacity-80"}`}
        >
          <span
            className="material-symbols-outlined"
            data-icon="account_balance_wallet"
            style={{
              fontVariationSettings:
                activeTab === "Information" ? "'FILL' 1" : "",
            }}
          >
            account_balance_wallet
          </span>
          <span className="text-[10px] font-medium font-headline mt-1">
            Information
          </span>
        </div>

        <div
          onClick={() => setActiveTab("QR")}
          className={`flex flex-col items-center justify-center rounded-2xl px-3 py-1.5 transition-transform duration-200 active:scale-90 cursor-pointer ${activeTab === "QR" ? "bg-[#f1f4f7] dark:bg-slate-800 text-[#004695] dark:text-blue-400" : "text-slate-500 hover:opacity-80"}`}
        >
          <span
            className="material-symbols-outlined"
            data-icon="qr_code_scanner"
            style={{
              fontVariationSettings: activeTab === "QR" ? "'FILL' 1" : "",
            }}
          >
            qr_code_scanner
          </span>
          <span className="text-[10px] font-medium font-headline mt-1">QR</span>
        </div>

        <div
          onClick={() => setActiveTab("AI Advisor")}
          className={`flex flex-col items-center justify-center rounded-2xl px-3 py-1.5 transition-transform duration-200 active:scale-90 cursor-pointer ${activeTab === "AI Advisor" ? "bg-[#f1f4f7] dark:bg-slate-800 text-[#004695] dark:text-blue-400" : "text-slate-500 hover:opacity-80"}`}
        >
          <span
            className="material-symbols-outlined"
            data-icon="contact_support"
            style={{
              fontVariationSettings:
                activeTab === "AI Advisor" ? "'FILL' 1" : "",
            }}
          >
            support_agent
          </span>
          <span className="text-[10px] font-medium font-headline mt-1">
            Advisor
          </span>
        </div>

        <div
          onClick={() => setActiveTab("Settings")}
          className={`flex flex-col items-center justify-center rounded-2xl px-3 py-1.5 transition-transform duration-200 active:scale-90 cursor-pointer ${activeTab === "Settings" ? "bg-[#f1f4f7] dark:bg-slate-800 text-[#004695] dark:text-blue-400" : "text-slate-500 hover:opacity-80"}`}
        >
          <span
            className="material-symbols-outlined"
            data-icon="settings"
            style={{
              fontVariationSettings: activeTab === "Settings" ? "'FILL' 1" : "",
            }}
          >
            settings
          </span>
          <span className="text-[10px] font-medium font-headline mt-1">
            Settings
          </span>
        </div>
      </nav>
      )}

      {/* Payment Menu Bottom Sheet */}
      {showPaymentMenu && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end pointer-events-auto">
          <style>{`
            @keyframes sheetSlideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            .animate-sheet-slide-up {
              animation: sheetSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            @keyframes backdropFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            .animate-backdrop-fade-in {
              animation: backdropFadeIn 0.3s ease-out forwards;
            }
          `}</style>
          
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 animate-backdrop-fade-in" 
            onClick={() => setShowPaymentMenu(false)}
          ></div>
          
          {/* Bottom Sheet */}
          <div className="bg-white w-full rounded-t-3xl relative z-10 flex flex-col max-h-[85vh] animate-sheet-slide-up" style={{ maxWidth: '480px', margin: '0 auto' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-red-50 p-2 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-500 font-bold" style={{fontSize: '22px'}}>receipt_long</span>
                </div>
                <h2 className="text-[20px] font-extrabold text-gray-800 tracking-tight">Payments</h2>
              </div>
              <button 
                onClick={() => setShowPaymentMenu(false)}
                className="hover:bg-gray-100 p-1.5 rounded-full transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-gray-800 font-extrabold text-xl">close</span>
              </button>
            </div>

            {/* Menu List */}
            <div className="overflow-y-auto pt-2 pb-8 flex-1 bg-gray-50/50">
              {/* Payment History Option */}
              <div 
                onClick={() => { setShowPaymentHistory(true); setShowPaymentMenu(false); }}
                className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-white active:bg-gray-100 transition-all border-b border-gray-100 bg-white/50 mb-2"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#2f66ee] text-[26px]">history</span>
                  </div>
                  <span className="text-[16px] font-bold text-gray-800">Payment history</span>
                </div>
                <span className="material-symbols-outlined text-gray-400 font-bold text-xl">chevron_right</span>
              </div>

              <div className="px-6 py-2">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Quick Demo Payments</p>
                <div className="grid grid-cols-1 gap-3">
                  {DEMO_PAYMENTS.map((demo, idx) => (
                    <button 
                      key={idx}
                      disabled={isCreatingDemo}
                      onClick={() => handleCreateDemoTransaction(demo)}
                      className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md active:scale-[0.98] transition-all group overflow-hidden relative"
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{backgroundColor: demo.color}}>
                          <span className="material-symbols-outlined text-[24px]">{demo.icon}</span>
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-bold text-gray-800">{demo.title}</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-black rounded uppercase tracking-tighter">Demo</span>
                          </div>
                          <p className="text-[12px] text-gray-400 font-medium">-{demo.amount.toLocaleString('vi-VN')} VND</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end relative z-10">
                        <span className="material-symbols-outlined text-gray-300 group-hover:text-[#2f66ee] transition-colors">add_circle</span>
                      </div>
                      {/* Subtle background glow on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ GLOBAL PERSISTENT TOASTS (survive tab changes) ════ */}
      <style>{`
        @keyframes slideDownIn {
          from { transform: translateX(-50%) translateY(-110%); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
        .g-toast { animation: slideDownIn 0.45s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      {/* Balance deduction toast */}
      {globalDeductToast?.show && (
        <div className="g-toast" style={{ position:'fixed', top:10, left:'50%', width:'calc(100% - 24px)', maxWidth:456, zIndex:9000 }}>
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.14)] border border-gray-100 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-red-500 text-[20px]">account_balance_wallet</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 text-[13px]">Balance Changed</p>
              <p className="text-gray-500 text-[12px] truncate">
                <span className="text-red-500 font-semibold">-{globalDeductToast.amount} VND</span>
                {' '}· Còn lại: <span className="text-[#2f66ee] font-semibold">{balance.toLocaleString('vi-VN')} VND</span>
              </p>
            </div>
            <button onClick={() => setGlobalDeductToast(null)} className="shrink-0 p-1 rounded-full hover:bg-gray-100">
              <span className="material-symbols-outlined text-gray-400 text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* AI Advisor toast — stays until tapped or dismissed */}
      {globalAdvisorToast?.show && (
        <div className="g-toast" style={{
          position:'fixed', top: globalDeductToast?.show ? 84 : 10,
          left:'50%', width:'calc(100% - 24px)', maxWidth:456, zIndex:9001, transition:'top 0.3s ease'
        }}>
          <button
            onClick={() => {
              const { audioUrl, script, payload } = globalAdvisorToast;
              setGlobalAdvisorToast(null);
              setNotification(script);
              setPreloadedAudioUrl(audioUrl);
              setProductContext(payload);
              setActiveTab('AI Advisor');
            }}
            className="w-full bg-gradient-to-r from-[#2f66ee] to-[#1a8cff] rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(47,102,238,0.35)] flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[22px]">robot_2</span>
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#2f66ee] animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-[13px] mb-0.5">🎯 AI Advisor has a tip for you!</p>
              <p className="text-white/70 text-[11px] truncate">Tap to hear your personalized recommendation</p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[15px]">arrow_forward</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setGlobalAdvisorToast(null); }}
                className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-white text-[15px]">close</span>
              </button>
            </div>
          </button>
        </div>
      )}

      {/* Simulation Market Alert toast - High priority warning style */}
      {simulationAlert && (
        <div className="g-toast" style={{ position:'fixed', top:10, left:'50%', width:'calc(100% - 24px)', maxWidth:456, zIndex:9002 }}>
           <button
            onClick={() => {
              setSimulationAlert(null);
              setActiveTab('Investments');
            }}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl px-4 py-3.5 shadow-[0_10px_35px_rgba(245,158,11,0.4)] flex items-center gap-3 text-left border border-amber-400/30 active:scale-[0.98] transition-transform animate-pulse"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
               <span className="material-symbols-outlined text-white text-[24px]" style={{fontVariationSettings: "'FILL' 1"}}>warning</span>
            </div>
            <div className="flex-1 min-w-0">
               <p className="font-black text-white text-[10px] uppercase tracking-wider mb-0.5 opacity-90">Market Volatility Alert</p>
               <p className="font-bold text-white text-[14px] leading-tight">{simulationAlert.message}</p>
            </div>
            <div className="shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]">chevron_right</span>
            </div>
          </button>
        </div>
      )}

      {/* LOGIN OVERLAY */}
      {isLoggingIn && (
        <LoginUI 
          onBack={() => setIsLoggingIn(false)} 
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* PAYMENT HISTORY OVERLAY */}
      {showPaymentHistory && (
        <PaymentHistoryUI 
          onBack={() => setShowPaymentHistory(false)}
          accountId={user?.user?.id}
        />
      )}
    </div>
  );
}
