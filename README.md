# SoundRoom 🎧

![Vue](https://img.shields.io/badge/Vue-3.x-brightgreen)
![Tailwind](https://img.shields.io/badge/TailwindCSS-4.x-blue)
![Konva](https://img.shields.io/badge/Konva.js-visual--canvas-yellow)
![WebAudioAPI](https://img.shields.io/badge/Web%20Audio-API-informational)
![Supabase](https://img.shields.io/badge/Supabase-Storage-lightgrey)
![Status](https://img.shields.io/badge/status-MVP-orange)
![License](https://img.shields.io/badge/license-MIT-green)

**SoundRoom** is a web-based 3D audio environment builder that lets users place, rotate, and layer spatial sound sources in real time. It’s a visual and immersive soundboard prototype built using modern web tools — made for relaxation, focus, or pure ambient chaos.

Built entirely solo by [Zaria Burton](https://www.linkedin.com/in/zariaburton), this MVP demonstrates strong frontend engineering, audio programming, and UX thinking through a clean, modular Vue + Konva setup.

![SoundRoom Preview](https://github.com/user-attachments/assets/d1a442f5-6213-4c19-a2e0-43357fb6fc66)

## 🔗 Live Demo

**👉 [Try SoundRoom on GitHub Pages](https://centari2013.github.io/SoundRoom)**



---

## 🧠 Key Features

- **3D Spatial Sound Canvas** — Drag, rotate, and position sound sources on a grid with directional cones.
- **Web Audio API + Konva Integration** — Real-time gain, panning, and cone simulation rendered visually and audibly.
- **Modular Sound Library** — Sounds categorized into themes (Nature, Human, Musical, etc.) and loaded from Supabase.
- **Listener Movement & Rotation** — WASD and QE keys control the user's position and direction in space.
- **Undo/Redo Engine** — Supports rapid prototyping and experimentation with ambient layouts.
- **Dynamic Metadata Panel** — Live updates for cone angles, source coordinates, and direction.
- **Minimalist UI** — Built with Tailwind 4 and optimized for clarity, not clutter.

---

## 🚀 Roadmap

Planned next-phase upgrades:

- [ ] 🔍 Sound search & filtering UI
- [ ] 📥 Import local/user-uploaded audio
- [ ] 📅 Sound scheduling (gap, repeat, queueing)
- [ ] 🔐 User accounts (Supabase Auth)
- [ ] 🎧 Realistic occlusion & material filtering
- [ ] 💾 Save/load sound scenes per user
- [ ] 🧪 Audio enhancements

---

## 🛠 Tech Stack

| Layer         | Tools                                                                 |
|---------------|-----------------------------------------------------------------------|
| Frontend      | [Vue 3](https://vuejs.org/), [Konva.js](https://konvajs.org/), [Tailwind CSS v4](https://tailwindcss.com/) |
| Audio Engine  | [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) |
| Backend       | [Supabase](https://supabase.com/) — hosting audio via storage buckets |
| Build System  | [Vite](https://vitejs.dev/)                                           |
| Deployment    | GitHub Pages                                                          |

---

## 📦 Setup Instructions

1. **Clone the repo**
   ```bash
   git clone https://github.com/Centari2013/SoundRoom.git
   cd SoundRoom
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env` for Supabase & Stripe**
   ```env
   # .env.example
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_KEY=your-anon-key

   # Stripe publishable key (browser)
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

   # Stripe server-side secrets (set in Vercel/hosting environment)
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_BASIC_PRICE_ID=price_basic_...
   STRIPE_PRO_PRICE_ID=price_pro_...

   # Base URL used for checkout success/cancel fallbacks
   PUBLIC_APP_URL=http://localhost:5173
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

6. **Run the tests (optional)**
   ```bash
   # Run both unit and end-to-end suites
   npm test

   # Or run a single suite
   npm run test:unit
   npm run test:e2e
   ```

---

## 🎮 Usage Overview

| Action                        | Key / Method             |
|------------------------------|--------------------------|
| Add Sound                    | `+ Add Source` button    |
| Move Listener                | `WASD` or `Arrow Keys`   |
| Rotate Listener              | `Q` and `E`              |
| Rotate Source                | Select → `Z` or `C`      |
| Cycle Selection              | `Tab`                    |
| Undo/Redo                    | `U` / `R`                |
| Delete                       | `Delete` / `Backspace`   |
| View Sound Info              | Right Panel              |
| Open Sound Library           | `+ Add Source` → Choose  |

---

## 🤖 Author

**Zaria Burton**  
- Full Stack Developer | UI/UX Enthusiast | Audio Tinkerer  
- 📍 Miami, FL  
- 🔗 [LinkedIn](https://www.linkedin.com/in/zariaburton) | [GitHub](https://github.com/centari2013)

---

## 🧪 Dev Notes

- Currently supports 30 placed sources and 20 unique library sounds per session.
- Scene state is client-only for now — no localStorage or persistence yet.
- Supabase bucket permissions are currently public-read for MVP testing.

## 📚 Developer Docs

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a tour of the key
non-Vue modules that power SoundRoom. The new
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) document covers local setup and
general guidelines for hacking on the project.

---

## 🪪 License

MIT — do what you want, just don’t pretend you made it.

---

## 🙋🏾‍♀️ Contributions

SoundRoom is currently a solo project and not accepting open contributions.  
If you'd like to fork it or experiment, feel free to use the `.env.example` file and your own Supabase setup.
Suggestions? Use the feedback form in the help menu!

---

## 🫀 Why This Matters

SoundRoom is more than a tech demo. It’s a proof of skill for frontend + Web Audio work, and a building block toward immersive, reactive, human-centered ambient tools.
