import React, { useState } from "react";
import AiAssistantWidget from "../components/AiAssistantWidget";

export default function BankUI() {
  const [notification, setNotification] = useState("");
  const [activeTab, setActiveTab] = useState("Trang chủ");

  const handleServiceClick = (serviceName: string) => {
    setNotification(
      `Bạn vừa chọn tính năng ${serviceName}. Bạn có cần tôi hỗ trợ hướng dẫn không?`,
    );
    setActiveTab("Trợ lý AI");
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

      {/* NỘI DUNG TÙY TAB */}
      <main className="w-full">
        {activeTab === "Trang chủ" && (
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
                  Chào mừng Quý khách đến với
                  <br />
                  Shinhan SOL Việt Nam
                </p>
              </div>
            </section>

            {/* Auth Actions */}
            <section className="px-6 -mt-6 relative z-10 grid grid-cols-2 gap-4">
              <button className="bg-secondary-container text-white py-4 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 active:scale-95 transition-all">
                ĐĂNG NHẬP
              </button>
              <button className="bg-[#00306b] text-white py-4 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 active:scale-95 transition-all">
                ĐĂNG KÝ
              </button>
            </section>

            {/* Banking Services Grid */}
            <section className="mt-8 px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-on-surface font-headline font-bold text-lg">
                  Dịch vụ Ngân hàng
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
                  { name: "Chuyển khoản", icon: "swap_horiz" },
                  { name: "Tài khoản", icon: "account_balance" },
                  { name: "Mở tài khoản", icon: "person_add" },
                  { name: "Thanh toán", icon: "receipt_long" },
                  { name: "Thẻ", icon: "credit_card" },
                  { name: "Vay", icon: "real_estate_agent" },
                  { name: "Rút tiền tại ATM", icon: "atm" },
                  { name: "Ví điện tử", icon: "account_balance_wallet" },
                  { name: "Đầu tư", icon: "trending_up" },
                  { name: "Bảo hiểm số", icon: "verified_user" },
                  { name: "Quản lý nhóm", icon: "groups" },
                  { name: "Ngoại hối", icon: "currency_exchange" },
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
                    CHƯƠNG TRÌNH MỚI
                  </p>
                  <p className="text-on-surface font-semibold text-sm">
                    Ưu đãi vay tiêu dùng lãi suất cực thấp chỉ từ 5.9%/năm
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {/* CHÍNH: TRỢ LÝ AI (Canvas UI Overlay) */}
        {activeTab === "Trợ lý AI" && (
          <div className="w-full flex flex-col justify-end p-4 pb-28 min-h-[calc(100vh-64px)] relative z-20">
            {/* The 3D avatar handles its own transparent background via <AiAssistantWidget/> overlay */}
            <AiAssistantWidget
              textToSpeak={notification}
              onAudioEnd={() => setNotification("")}
              onTextInput={(val) => setNotification(val)}
            />
          </div>
        )}

        {/* Tab: Thông tin (Tin tức) */}
        {activeTab === 'Thông tin' && (
          <div className="w-full relative z-10 px-6 mt-6 pb-28">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-bold text-primary tracking-tight">Khuyến mãi</h2>
              <button className="text-sm font-semibold text-secondary hover:opacity-80 transition-opacity">Hiển thị thêm</button>
            </div>
            
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#6a5acd] to-[#483d8b] shadow-xl group cursor-pointer aspect-[16/9]">
              <img alt="" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAb8O7Ax_sT9BWqI5334wInnhHgqf0Gm_9W_pWubUpnUhS3kxhLYRNQ_W1ImCBxEymuUg2GuFGBoA5C48yo4LZkVP-mOIlCzCdDmgm6yF84wQTs-Ak344uoSok4_dEJbCfK6jEHYx8EctntQtbm2Lhm7Setjz7mykGib9BxTzMiwsBhhCCvreCs96lJQ5NnBnrccrMryZS3V50fVRLTUEI2dgTmd5M9rUD1IsPhYM4RfmCupJ3tYxTAu_OJGhODGs9UNzZB4N8ZdMPh"/>
              <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                <div className="max-w-[70%]">
                  <span className="inline-block px-2 py-1 rounded bg-white/20 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-widest mb-2">Ưu đãi độc quyền</span>
                  <h3 className="text-lg font-extrabold text-white leading-tight uppercase">CẦN TIỀN MẶT? RÚT NGAY TỪ THẺ TÍN DỤNG SHINHAN</h3>
                </div>
                <div className="flex justify-between items-end">
                  <div className="bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    <p className="text-[10px] text-white/80 font-medium">Thời hạn chương trình</p>
                    <p className="text-xs text-white font-bold">16/03/2026 - 16/04/2026</p>
                  </div>
                  <div className="w-20 h-20 -mb-2">
                    <img alt="" className="w-full h-full object-contain drop-shadow-2xl" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHa5yCmpAN5x3M8hVQGPuf9qGTQ0yTP0Ey95c_TeOnzkNTmSXtt1NhRzM027z96oFzJRiD8NRie-Q3O_B6ifxmjdBFCLfS-_840UNR6eGZGD9qtP7-30FiJTs6gn0oIes6AtUnp8yqpENnZCMPMgz-Pm7OZ2uQHBUdQjZHRwl3MgNaOgmPqwcO5Gn2ptxQ7z9uN9_KPKePAf0ujDssplLITlTOYP6aTrJYKkxo3O8AdjQ_FHuon-VO4P60hexX67Z0ffYC0gVhXAj1"/>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="text-xl font-bold text-primary tracking-tight mb-6 mt-10">Tin tức &amp; Giải trí</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: 'Tin tức Shinhan', icon: 'newspaper', colorClass: 'text-[#004695]', bgClass: 'bg-blue-50' },
                { title: 'Mua sắm hoàn tiền', icon: 'shopping_bag', colorClass: 'text-orange-500', bgClass: 'bg-orange-50' },
                { title: 'Công cụ tài chính', icon: 'calculate', colorClass: 'text-green-600', bgClass: 'bg-green-50' },
                { title: 'Đặt chỗ & Đi lại', icon: 'directions_bus', colorClass: 'text-cyan-600', bgClass: 'bg-cyan-50' },
                { title: 'Đặc quyền ưu đãi', icon: 'workspace_premium', colorClass: 'text-purple-600', bgClass: 'bg-purple-50' },
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
                <h4 className="font-bold text-primary">Ngân hàng an toàn</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">Cập nhật các phương thức bảo mật mới nhất để bảo vệ tài khoản của bạn.</p>
              </div>
            </div>
          </div>
        )}

        {/* Các Tab Khác */}
        {["QR", "Cài đặt"].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center p-8 mt-20 opacity-60">
            <span
              className="material-symbols-outlined text-6xl text-primary mb-4"
              data-icon="construction"
            >
              construction
            </span>
            <h2 className="text-xl font-headline font-bold text-on-surface">
              Tính năng {activeTab}
            </h2>
            <p className="text-sm font-body mt-2 text-center text-on-surface-variant">
              Đang trong quá trình phát triển và hoàn thiện.
            </p>
          </div>
        )}
      </main>

      {/* BOTTOM NAV */}
      <nav
        className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pt-3 pb-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-50 rounded-t-3xl shadow-[0_-12px_24px_-4px_rgba(0,0,0,0.06)]"
        style={{
          maxWidth: "480px",
          transform: "translateX(-50%)",
          left: "50%",
        }}
      >
        <div
          onClick={() => setActiveTab("Trang chủ")}
          className={`flex flex-col items-center justify-center rounded-2xl px-3 py-1.5 transition-transform duration-200 active:scale-90 cursor-pointer ${activeTab === "Trang chủ" ? "bg-[#f1f4f7] dark:bg-slate-800 text-[#004695] dark:text-blue-400" : "text-slate-500 hover:opacity-80"}`}
        >
          <span
            className="material-symbols-outlined"
            data-icon="home"
            style={{
              fontVariationSettings:
                activeTab === "Trang chủ" ? "'FILL' 1" : "",
            }}
          >
            home
          </span>
          <span className="text-[10px] font-medium font-headline mt-1">
            Trang chủ
          </span>
        </div>

        <div
          onClick={() => setActiveTab("Thông tin")}
          className={`flex flex-col items-center justify-center rounded-2xl px-3 py-1.5 transition-transform duration-200 active:scale-90 cursor-pointer ${activeTab === "Thông tin" ? "bg-[#f1f4f7] dark:bg-slate-800 text-[#004695] dark:text-blue-400" : "text-slate-500 hover:opacity-80"}`}
        >
          <span
            className="material-symbols-outlined"
            data-icon="account_balance_wallet"
            style={{
              fontVariationSettings:
                activeTab === "Thông tin" ? "'FILL' 1" : "",
            }}
          >
            account_balance_wallet
          </span>
          <span className="text-[10px] font-medium font-headline mt-1">
            Thông tin
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
          onClick={() => setActiveTab("Trợ lý AI")}
          className={`flex flex-col items-center justify-center rounded-2xl px-3 py-1.5 transition-transform duration-200 active:scale-90 cursor-pointer ${activeTab === "Trợ lý AI" ? "bg-[#f1f4f7] dark:bg-slate-800 text-[#004695] dark:text-blue-400" : "text-slate-500 hover:opacity-80"}`}
        >
          <span
            className="material-symbols-outlined"
            data-icon="contact_support"
            style={{
              fontVariationSettings:
                activeTab === "Trợ lý AI" ? "'FILL' 1" : "",
            }}
          >
            support_agent
          </span>
          <span className="text-[10px] font-medium font-headline mt-1">
            Trợ lý AI
          </span>
        </div>

        <div
          onClick={() => setActiveTab("Cài đặt")}
          className={`flex flex-col items-center justify-center rounded-2xl px-3 py-1.5 transition-transform duration-200 active:scale-90 cursor-pointer ${activeTab === "Cài đặt" ? "bg-[#f1f4f7] dark:bg-slate-800 text-[#004695] dark:text-blue-400" : "text-slate-500 hover:opacity-80"}`}
        >
          <span
            className="material-symbols-outlined"
            data-icon="settings"
            style={{
              fontVariationSettings: activeTab === "Cài đặt" ? "'FILL' 1" : "",
            }}
          >
            settings
          </span>
          <span className="text-[10px] font-medium font-headline mt-1">
            Cài đặt
          </span>
        </div>
      </nav>
    </div>
  );
}
