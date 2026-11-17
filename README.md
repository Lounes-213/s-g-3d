# 🔫 S-G-3D — Multiplayer Tactical Arena FPS (3D)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Play%20Online-0284c7?style=for-the-badge&logo=vercel)](https://s-g-3d.vercel.app)
[![Server Status](https://img.shields.io/badge/Dedicated%20Server-Online%20(Render)-22c55e?style=for-the-badge&logo=render)](https://s-g-3d-server.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/Lounes-213/s-g-3d)

A fast-paced, low-poly 3D tactical arena first-person shooter built with **React 19**, **Three.js / React Three Fiber (R3F)**, **Rapier3D physics engine**, and a high-performance **Node.js + Socket.IO server**.

---

## 🎮 Play Now (Live Demo)

- 🌐 **Web Game Client (Vercel):** [https://s-g-3d.vercel.app](https://s-g-3d.vercel.app)
- 🖥️ **Dedicated WebSocket Server (Render):** [https://s-g-3d-server.onrender.com](https://s-g-3d-server.onrender.com)

> 💡 Open the link in two separate browser windows (or on two devices) to test real-time multiplayer combat, room matchmaking, and synchronized physics!

---

## ✨ Key Features

- **🌐 Server-Authoritative Realtime Multiplayer:** Powered by Socket.IO over WebSockets with client-side prediction, entity interpolation, and authoritative server validation.
- **⚡ Rapier3D Physics Engine:** Headless WASM-powered 3D physics on the server coupled with `@react-three/rapier` on the client for ultra-consistent collision detection and movement.
- **⚔️ Game Modes:**
  - **TDM (Team Deathmatch):** Red vs. Blue tactical team battles.
  - **FFA (Free-For-All):** Every operator for themselves.
  - **Domination:** Capture and hold tactical zones.
  - **Battle Royale (BR):** Shrinking storm zone with survival mechanics.
- **🎯 Advanced Gunplay:**
  - Multiple weapons: Assault Rifle, SMG, Shotgun, Burst Rifle, Sniper Rifle, Pistol.
  - Dynamic recoil, weapon sway, tactical aim-down-sights (ADS), and muzzle flashes.
  - Hitscan projectile math, hit markers, headshot multipliers, and global killfeed.
- **🤖 Tactical Bots:** Intelligent bot simulation running autonomously with pathfinding, combat behaviors, and target prioritization.
- **🎙️ Spatial & Tactical Audio:** Full 3D directional gunshots, footstep sound effects, jump pad impulses, and kill confirmations.
- **🎨 Customization & Classes:** Selectable operator classes (`striker`, `ghost`, `titan`, `nova`, etc.) with distinctive tactical camouflage uniforms and special abilities (Dash, Tactical Shield, Grenade).

---

## 🕹️ Controls

| Action | Key / Input |
| :--- | :--- |
| **Move** | `W` / `A` / `S` / `D` |
| **Look / Aim** | `Mouse Move` |
| **Shoot** | `Left Mouse Button` |
| **Aim Down Sights (ADS)** | `Right Mouse Button` |
| **Jump / Double Jump** | `Space` |
| **Sprint** | `Shift` |
| **Crouch** | `C` or `Ctrl` |
| **Reload** | `R` |
| **Switch Weapons** | `1`, `2`, `3`, `4`, `5`, `6` or `Mouse Wheel` |
| **Tactical Abilities** | `E` (Dash), `Q` (Shield), `F` (Grenade) |
| **Scoreboard** | `Tab` |
| **Menu / Pause** | `Esc` |

---

## 📦 Monorepo Architecture

This project is structured as an **npm workspaces** monorepo:

```text
s-g-3d/
├── apps/
│   ├── appClient/          # React 19 + R3F 3D Web Frontend (Vite + Tailwind v4)
│   └── appServer/          # Node.js + Express + Headless Rapier3D Game Server
├── packages/
│   └── shared/             # @block-shooter/shared (Constants, physics rules, weapon configs)
├── .github/workflows/      # Automated CI/CD deployment pipelines
├── firebase.json           # Firebase configuration
├── vercel.json             # Vercel deployment configuration
└── package.json            # Root monorepo workspace manifest
```

### ⚖️ `@block-shooter/shared` — Single Source of Truth
Constants, weapon stats, hitbox parameters, and map boundaries are centralized in `packages/shared`, ensuring zero desynchronization between what the client predicts and what the server computes.

---

## 🛠️ Tech Stack

### Frontend (`apps/appClient`)
- **React 19 & React Router v7**
- **Three.js & React Three Fiber (R3F)** (`@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`)
- **Zustand** for state management
- **Tailwind CSS v4** for tactical HUD UI
- **Socket.io Client** for high-frequency networking

### Backend (`apps/appServer`)
- **Node.js** with TypeScript (`tsup` bundler)
- **Express 5**
- **Socket.IO** (Authoritative WebSocket networking & room orchestration)
- **@dimforge/rapier3d-compat** (Headless 3D physics WASM engine)
- **Pino** high-performance logging

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js `>= 20`
- npm `>= 10`

### Quick Start
```bash
# 1. Clone the repository
git clone https://github.com/Lounes-213/s-g-3d.git
cd s-g-3d

# 2. Install dependencies across all workspaces
npm install

# 3. Start both Client and Dedicated Server simultaneously
npm run dev
```

- **Client:** `http://localhost:3000`
- **Server:** `http://localhost:9208`

---

## 🌐 Production Deployment

- **Frontend (Vercel):**
  - Build command: `npm --prefix apps/appClient run build`
  - Output directory: `apps/appClient/dist`
  - Environment variable: `VITE_SERVER_URL=https://s-g-3d-server.onrender.com`
- **Server (Render):**
  - Build command: `npm install && npm run build`
  - Start command: `npm start`
  - Environment variable: `NODE_ENV=production`

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.
