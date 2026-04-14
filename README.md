# 🤖 Trợ lý Shinhan AI Digital Avatar

Xin chào! Đây là dự án trợ lý trí tuệ nhân tạo (AI Avatar 3D) chạy trực tiếp trên nền web, hỗ trợ tích hợp môi trường Progressive Web App (PWA) để cài đặt thành App trên thiết bị di động.

Dự án sử dụng **React**, **Three.js (React Three Fiber)** và **@pixiv/three-vrm** để tải và vận hành mô hình 3D một cách sinh động nhất (tích hợp vật lý chuyển động mượt mà và nhép môi theo âm thanh). Mọi hiển thị trên Web App giờ đây đều được tối ưu hóa bằng **Tiếng Anh**.

---

## 🚀 1. Hướng dẫn chạy Nhanh (Dành cho Lập trình viên)

Đảm bảo bạn đã cài đặt **Node.js** phiên bản v18 trở lên.

1. **Cài đặt thư viện:**
   Mở Terminal trong thư mục chứa mã nguồn và chạy lệnh:
   ```bash
   npm install
   ```

2. **Khởi động Môi trường Lập Trình (Dev Server):**
   ```bash
   npm run dev
   ```
   *Terminal sẽ sinh ra một đường dẫn `Local` (ví dụ: `https://localhost:3000`). Bấm vào đó để mở trên trình duyệt.*

*(Lưu ý: Môi trường Dev đã được thiết lập `basic-ssl` tự động sinh ra chứng chỉ HTTPS. Điều này nhằm mục đích để khi bạn test hệ thống qua mạng LAN trên thiết bị di động (Local IP), hệ thống vẫn vượt qua phương thức bảo mật để gọi được Text-to-Speech hoặc Test chức năng cài đặt App PWA).*

---

## 🔑 2. Cấu hình Giọng đọc Khủng (Alibaba CosyVoice TTS)

Mặc định nếu để trống, App sẽ dùng Giọng Google Dịch (Tiếng Anh) bình thường. Nhưng nếu muốn App nói tự nhiên có ngắt nghỉ cảm xúc chuẩn AI thông qua **CosyVoice của Alibaba Cloud**:

1. Tạo một file tên là `.env.local` ở cùng thư mục nguồn.
2. Dán Key API DashScope của Alibaba Cloud mà bạn có vào đó theo mẫu:
   ```env
   VITE_DASHSCOPE_API_KEY=dán_api_key_dashscope_cua_ban_vao_day
   ```
3. Thoát Terminal chạy lại lệnh (`npm run dev`). Hệ thống sẽ tự động dùng Proxy ẩn mã hóa Key API của bạn đẩy lên Alibaba và lấy giọng đọc `CosyVoice` mượt về trả cho hệ thống Web. (Không sợ lỗi chia sẻ tên miền ngầm CORS!)

---

## 🛠 3. Cấu trúc Thư mục Quan Trọng

Đây là những file/thư mục duy nhất bạn cần quan tâm để làm chủ trợ lý ảo này:

- `public/Test.vrm`: File hệ thống Model 3D. 
- `src/components/AiAssistantWidget.tsx`: Điểm tụ của giao diện UI/UX 2D gắn đè lên lớp 3D (Text placeholder, Lệnh gửi chữ). Nơi quản lý quá trình gọi API Text-to-Speech (Alibaba CosyVoice/Google API). 
- `src/components/DigitalAvatar.tsx`: **"Bộ não" của AI 3D.** Toàn bộ khung logic điều khiển độ trễ vật lý (đưa mắt vào theo chuột, rung hình, nhịp thở đi lại, độ nhạy nhép miệng với âm lượng) được đúc kết hết ở đây. 
- `vite.config.ts`: Cấu hình hệ thống Server. Chứa Proxy bí mật giúp Bypass CORS chặn gọi API CosyVoice.

---

## 🧠 4. Cách chọc ngoáy vào "Trái tim" của Avatar 

### A. Nếu muốn Cập nhật MODEL 3D mới:
1. Ném file `.vrm` mới toanh vào thư mục `public/`. Đặt tên tùy thích.
2. Mở file `src/components/AiAssistantWidget.tsx`.
3. Tìm đến dòng thẻ `<DigitalAvatar url="/Test.vrm" ... />`.
4. Sửa `/Test.vrm` thành tên của file của bạn.

### B. Nếu muốn sửa đổi "HÀNH VI DI CHUYỂN" (Hệ vật lý bập bênh):
*Ghi nhớ: Hệ Avatar hiện tại được mô phỏng theo vật lý hệ nhún của con Robot BB-8—Khi có tác động chuột, nó sẽ khom mình theo phía trước.*
1. Mở file `src/components/DigitalAvatar.tsx`.
2. Trỏ chuột tới dòng chứa hàm siêu tốc `useFrame((state, delta) => { ... })`.
3. Tha hồ điều chỉnh tùy ý các hệ biến như `velX` (Tốc đọ rướn người) hay `microOffsetX` (Những độ chệch vi mô giả người thật)!

### C. Nếu muốn cân chỉnh "Biên độ Nhép Miệng":
1. Cơ chế môi trường được Hook bắt tần số âm thanh từ loa ngoài bằng `useVRMVowelAnalyser`.
2. AI chia hệ tiếng rên rỉ theo 5 vần chính: `aa, ee, ih, oh, ou`.
3. Hệ số độ mở môi đang để `0.8` (rất tự nhiên khép mồm vừa). Muốn mồm ngoạc ra có thể dùng `manager.setValue("aa", vowels.aa * 1.5)`.

---

## 📦 5. Xuất File Triển Khai (Deploy Prod)
Chạy lệnh gốc này để đóng gói ra folder xuất mạng:
```bash
npm run build
```
Mã nguồn React sẽ được đẩy thành các tệp tĩnh nén cực căng nằm ở thư mục `dist/`. Úp lên Vercel hoặc Netlify là bạn sẽ có trang web public hoàn chỉnh như mọi nền tảng khác!
