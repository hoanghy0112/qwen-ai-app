# 🤖 Shinhan Ai Digital Avatar

Xin chào! Đây là dự án trợ lý trí tuệ nhân tạo (AI Avatar 3D) chạy trực tiếp trên nền web, hỗ trợ tích hợp môi trường Progressive Web App (PWA) để cài đặt thành App trên thiết bị di động.

Dự án sử dụng **React**, **Three.js (React Three Fiber)** và **@pixiv/three-vrm** để load và vận hành model 3D một cách sinh động nhất (tích hợp vật lý chuyển động mượt mà và nhép môi thao tác theo giọng nói).

---

## 🚀 1. Hướng dẫn chạy Code (Dành cho Dev mới)

Đảm bảo bạn đã cài đặt **Node.js** phiên bản v18 trở lên.

1. **Cài đặt thư viện:**
   Vào thư mục chứa code và mở Terminal lên chạy dòng này:
   ```bash
   npm install
   ```

2. **Chạy Server cho Web (Dev):**
   ```bash
   npm run dev
   ```
   *Terminal sẽ hiện ra một đường link `Local` (ví dụ: `https://localhost:3000`). Bấm vào đó để mở trình duyệt.*

*(Lưu ý: Môi trường Dev đã được thiết lập `basic-ssl` tự động sinh ra chứng chỉ HTTPS. Điều này nhằm mục đích để khi bạn test qua mạng LAN điện thoại Local IP, nó vẫn sẽ tuân thủ bảo mật để gọi được Text-to-Speech hoặc Test chức năng cài đặt App PWA).*

---

## 🛠 2. Cấu trúc Thư mục Quan Trọng

Đây là những file/thư mục duy nhất bạn cần quan tâm để làm chủ con AI Avatar này:

- `public/Test.vrm`: File cấu trúc Model 3D. Mọi tải liệu mô hình 3D nằm ở đây. (Yêu cầu giữ dung lượng < 10MB để web load siêu tốc).
- `src/components/AiAssistantWidget.tsx`: Bộ mặt giao diện UI 2D (khung chat, nút bấm). Nơi đây quản lý các lệnh đưa Giọng Nói (Text-to-Speech) và trạng thái. 
- `src/components/DigitalAvatar.tsx`: **"Bộ Não" lập trình của AI 3D.** Toàn bộ code logic điều khiển vật lý (hướng nhìn theo chuột, rung lắc, dáng đi, nhép miệng theo tần số mồm) đều nhồi mắm ở trong file này. 
- `vite.config.ts`: Cấu hình hệ thống build (Cài đặt Proxy cho tính năng bóp API giọng nói tránh lỗi CORS, cùng với tuỳ chỉnh độ trâu bò của App PWA khi tải xuống máy).

---

## 🧠 3. Hướng dẫn Chỉnh sửa "Bản Rễ" của con AI (Dành cho Dev / Coder)

### A. Nếu muốn ĐỔI MODEL 3D khác:
1. Copy model mới định dạng `.vrm` của bạn bỏ vào thư mục `public/`. Đặt tên là gì cũng được (Ví dụ: `NewGirl.vrm`).
2. Mở file `src/components/AiAssistantWidget.tsx`.
3. Tìm đến dòng có đoạn thẻ `<DigitalAvatar url="/Test.vrm" ... />` (Khoảng dòng thứ 81).
4. Thay chữ `/Test.vrm` thành tên thẻ `/NewGirl.vrm` của bạn.

### B. Nếu muốn sửa đổi "HÀNH VI DI CHUYỂN" (Vật lý kiểu BB-8 rung lắc):
*Lưu ý: Avatar hiện tại code theo hệ rung lắc quán tính con nhộng BB-8 cực mượt, trỏ chuột vào là nó rướn người tới, đầu nghiêng, giật theo di chuột.*
Trường hợp bạn muốn làm con AI lờ đờ đi hoặc di chuyển nhẹ hơn:
1. Mở file `src/components/DigitalAvatar.tsx`.
2. Tìm đến hàm `useFrame((state, delta) => { ... })` (Nơi này chạy 60 frame từng giây thần tốc).
3. Tìm những biến vật lý như `velX` (Tốc độ rướn), `microOffsetX` (Những độ trễ lặt vặt rung lắc) để tăng giảm tuỳ ý!
   *Ví dụ ở đoạn `velX += dx * 0.0006 * magnetBoost;` - Thay 0.0006 thành số cao hơn thì nó vồ vập phản ứng cực mạnh.*

### C. Nếu muốn đổi hành vi "Nhép Miệng" (Lip-Sync):
1. Trong file `DigitalAvatar.tsx`, logic được gọi ra nhờ Hook `useVRMVowelAnalyser` bắt theo tần số dải âm qua Component cha truyền vào. 
2. Hệ máy học nương theo 5 biến Vowel (Mẫu âm): `aa, ee, ih, oh, ou`.
3. Có thể dùng số nhân (hiện tại cường độ đang nhân `0.8`) để chỉnh khẩu độ miệng lúc nói cho khớp với Audio Tiếng Việt hơn: `manager.setValue("aa", vowels.aa * 0.8)`. Tăng lên 1.0 thì mồm ngáp to, giảm thì mồm chúm chím.

### D. Cấu hình Giọng Nói Google (Text 2 Speech):
Mọi thứ nằm trong `vite.config.ts` (Proxy) và `src/components/AiAssistantWidget.tsx` (useEffect trigger khi có prop `textToSpeak`). Bạn hoàn toàn có thể tự gạch bỏ logic proxy và trỏ cắm API tuỳ thích (Ví dụ mua API của FPT AI TTS, Zalo AI, Viettel AI gắn vào thay thế `audioRef.current.src = ...`).

---

## 📦 4. Xuất File Sản Phẩm (Deploy Prod)
Chạy lệnh gốc này để đóng gói ra folder production:
```bash
npm run build
```
Nó sẽ sinh ra 1 thư mục `dist/` chứa các tệp HTML/CSS/JS đã tối ưu nén nhòe nhất. Đẩy thư mục này lên Vercel, Netlify, hay Host ảo là Web sẽ chạy bon bon 100%!
