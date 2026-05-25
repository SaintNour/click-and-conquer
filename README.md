# 🎮 Click & Conquer (Clicky)

A highly responsive, real-time incremental street-empire strategy game built using a modern frontend architecture.  
The game simulates advanced resource allocation systems, live progression mechanics, dynamic economic scaling, and real-time event processing entirely on the client side.

Built with performance, scalability, and maintainability in mind, the project combines React’s component-driven architecture with GPU-accelerated rendering and animation systems to create a smooth and immersive gameplay experience.

---

# 🌐 Live Demo

👉 https://clickandconquer.netlify.app/

---

# 🚀 Features

- ⚡ Real-time incremental gameplay loop
- 🏙️ Street empire progression and expansion systems
- 💰 Dynamic economy and mathematical scaling mechanics
- 🎯 Event-driven gameplay architecture
- 🔥 Responsive UI with smooth state synchronization
- 🎨 GPU-accelerated background rendering using Pixi.js
- ✨ Advanced animations powered by GSAP
- 💾 Local save/load progression system
- 🧠 Modular simulation engine with scalable tick processing
- 📱 Responsive layout optimized for desktop and mobile
- 🔒 Strict TypeScript architecture for safer state management

---

# 🛠️ Tech Stack & Architecture

## Frontend Framework
- **React 18**
- **Vite**

Used for fast development workflows, optimized production builds, and component-based UI architecture.

## Language
- **TypeScript**

Implements strict compile-time type safety for complex game states, progression systems, and simulation logic.

## Rendering & Animation
- **Pixi.js**
  - WebGL-accelerated interactive background rendering
  - High-performance canvas effects

- **GSAP (GreenSock Animation Platform)**
  - Smooth UI animations
  - Timeline orchestration
  - DOM motion helpers

## Code Quality & Tooling
- **ESLint**
- **Prettier**

Maintains consistent code standards and formatting across the project.

---

# 🧩 Core Architecture Philosophy

The project follows a modular separation-of-concerns architecture:

- **UI Layer**
  - React-driven component rendering
  - Modal systems
  - Panels and HUD interfaces

- **Simulation Layer**
  - Tick processors
  - Real-time economy calculations
  - Progression systems
  - Rival/event handling

- **Rendering Layer**
  - Pixi.js background engine
  - GPU-accelerated visual effects
  - GSAP motion orchestration

This structure allows the application to scale efficiently while keeping gameplay logic isolated from rendering and interface management.

---

# 📦 Project Structure

```text
src/
  ├── main.tsx          # Application entry point
  ├── App.tsx           # Root layout management and structural modals
  ├── components/       # Component-driven React UI (Modals, Panels, HUDs)
  ├── game/             # Core simulation engine, intervals, save systems, tick processors
  ├── data/             # Static configurations and gameplay definitions
  ├── animations/       # GSAP timelines and motion orchestration
  └── effects/pixi/     # Pixi.js WebGL rendering engine
```

---

# ⚙️ Installation & Setup

## Clone the Repository

```bash
git clone https://github.com/SaintNour/click-and-conquer.git
```

## Navigate Into the Project

```bash
cd click-and-conquer
```

## Install Dependencies

```bash
npm install
```

## Start Development Server

```bash
npm run dev
```

---

# 🏗️ Production Build

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```

---

# 🧠 Technical Highlights

## Real-Time Simulation Engine
The gameplay loop operates through optimized tick-based progression systems handling:
- Resource generation
- Scaling economics
- Passive income calculations
- Event triggers
- Rival interactions
- Upgrade systems

## Mathematical Scaling Systems
Custom progression formulas dynamically balance:
- Income growth
- Upgrade costs
- Progress pacing
- Late-game scaling
- Reward efficiency

## Performance Optimization
The project uses:
- React memoization strategies
- Efficient interval management
- GPU-accelerated rendering
- Lightweight state updates
- Optimized animation timelines

## Modular State Management
Game systems are isolated into reusable modules to improve:
- Maintainability
- Scalability
- Debugging
- Future feature expansion

---

# 🎨 UI & Visual Systems

The interface combines:
- Responsive React components
- Animated HUD systems
- GSAP transitions
- Pixi.js visual effects
- Real-time data synchronization

The design prioritizes:
- Smooth user feedback
- Low-latency interactions
- Readability
- Responsive gameplay flow

---

# 📱 Responsive Design

The game is designed to work across:
- Desktop devices
- Tablets
- Mobile browsers

UI scaling and layout behavior are optimized for different screen sizes and resolutions.

---

# 🔒 Code Quality Standards

The project follows modern frontend engineering standards including:
- Strict TypeScript typing
- Component modularization
- Clean folder separation
- ESLint enforcement
- Prettier formatting
- Reusable utility architecture

---

# 📈 Future Improvements

Planned or potential future systems include:
- Cloud save synchronization
- Multiplayer/event leaderboards
- Expanded business systems
- Additional progression trees
- Achievement systems
- Sound engine integration
- Advanced AI rival behavior
- Backend-driven persistence

---

# 📄 License & Intellectual Property

Copyright © 2026. All rights reserved.

This project is proprietary and confidential.

The source code, assets, gameplay systems, mechanics, and visual implementations are the exclusive intellectual property of the author. Unauthorized copying, redistribution, modification, sublicensing, or commercial exploitation of any part of this repository is strictly prohibited.

Permission is granted solely for:
- Educational review
- Portfolio evaluation
- Technical assessment by prospective employers

No commercial or derivative use is permitted without explicit written authorization from the author.

---

# 👨‍💻 Author

**Saed Nour** — [saednoor363@yahoo.com](mailto:saednoor363@yahoo.com)

Focused on modern frontend engineering, simulation systems, interactive UI architecture, and scalable real-time web applications.

---

# ⭐ Project Goal

Click & Conquer was developed as both:
- A scalable browser-based strategy/incremental game
- A demonstration of advanced frontend engineering principles

The project showcases expertise in:
- React architecture
- TypeScript systems design
- Real-time simulation logic
- Rendering optimization
- Animation orchestration
- Frontend scalability patterns

---