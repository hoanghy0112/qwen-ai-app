# 🤖 Flux AI

Hello! This project is a web-based AI assistant (3D AI Avatar) with Progressive Web App (PWA) support, so users can install it like a mobile app.

The stack uses **React**, **Three.js (React Three Fiber)**, and **@pixiv/three-vrm** to render and animate a 3D avatar with smooth movement physics and audio-driven lip sync.

---

## 🚀 1. Quick Start (For Developers)

Make sure you have **Node.js v18+** installed.

1. **Install dependencies**
   Open a terminal in the project directory and run:
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm run dev
   ```
   The terminal will show a local URL (for example, `https://localhost:3000`). Open it in your browser.

Dev mode is configured with `basic-ssl` to auto-generate HTTPS certificates. This is useful when testing over LAN on mobile devices, especially for Text-to-Speech and PWA installation scenarios.

---

## 🔑 2. Voice Configuration (Alibaba CosyVoice TTS)

If you do not configure any key, the app uses the default English voice output.  
For more natural speech with **Alibaba Cloud CosyVoice**:

1. Create a `.env.local` file in the project root.
2. Add your DashScope API key:
   ```env
   VITE_DASHSCOPE_API_KEY=your_dashscope_api_key_here
   ```
3. Restart the dev server (`npm run dev`).

The app uses a proxy to keep your key hidden and avoid common CORS issues when calling CosyVoice APIs.

---

## 🛠 3. Important Folder/File Map

These are the key files and folders:

- `public/Test.vrm`: The 3D model file.
- `src/components/AiAssistantWidget.tsx`: Main 2D UI layer (text input/send) and TTS API orchestration (CosyVoice/Google).
- `src/components/DigitalAvatar.tsx`: Core 3D avatar logic, including motion behavior, cursor tracking, idle breathing, and lip-sync sensitivity.
- `vite.config.ts`: Server configuration, including proxy setup for CosyVoice API calls.

---

## 🧠 4. How to Customize the Avatar

### A. Replace the 3D Model
1. Put your new `.vrm` file in `public/`.
2. Open `src/components/AiAssistantWidget.tsx`.
3. Find `<DigitalAvatar url="/Test.vrm" ... />`.
4. Change `/Test.vrm` to your model file path.

### B. Adjust Motion Behavior
The current avatar behavior is tuned with spring-like movement.

1. Open `src/components/DigitalAvatar.tsx`.
2. Find `useFrame((state, delta) => { ... })`.
3. Tune variables like `velX` (lean speed) and `microOffsetX` (micro movement details).

### C. Tune Lip-Sync Intensity
1. Lip sync uses `useVRMVowelAnalyser` to track audio frequencies.
2. It maps speech to five vowel channels: `aa`, `ee`, `ih`, `oh`, `ou`.
3. Mouth-open scale is currently around `0.8`. For stronger expression, increase values like:
   `manager.setValue("aa", vowels.aa * 1.5)`.

---

## 📦 5. Production Build

Run this command to build production assets:

```bash
npm run build
```

The optimized static output is generated in `dist/`. You can deploy it to Vercel, Netlify, or any static hosting platform.
