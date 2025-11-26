# Lumina PRO - AI Cinematic Director

Lumina PRO is a premium AI drawing application that acts as your personal visual director. It takes simple concepts and expands them into highly detailed, cinematic treatments before generating high-fidelity images using Google's Gemini 3 Pro models.

> [!WARNING]
> **Security Note**: This is a client-side demo application. The Gemini API key is injected into the frontend bundle during the build process. **Do not deploy this to a public production environment** without implementing a backend proxy to secure your API key.

## Features

- **Cinematic Treatment**: Real-time streaming of detailed prompt breakdowns (Subject, Atmosphere, Camera, etc.).
- **Adaptive Style**: Automatically adapts terminology and details to your requested style (e.g., Manga, Photorealism, 3D Render).
- **Visual Highlights**: Automatically highlights key visual elements (colors, lighting) with glowing effects.
- **Immersive UI**: Deep dark mode, glassmorphism, and smooth animations powered by Framer Motion.
- **Robust Generation**: Smart handling of AI streaming and image generation to ensure complete results.

## Prerequisites

- **Node.js** (v18 or higher) or **Bun** (v1.0 or higher)
- A **Google Gemini API Key** (Get one at [Google AI Studio](https://aistudio.google.com/))

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd lumina
```

### 2. Configure Environment

Copy the example environment file and add your API key:

```bash
cp .env.example .env.local
```

Open `.env.local` and paste your API key:
```env
VITE_GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Install Dependencies

You can use your preferred package manager:

**npm**
```bash
npm install
```

**pnpm**
```bash
pnpm install
```

**bun** (Recommended)
```bash
bun install
```

### 4. Run Development Server

Start the local development server:

**npm**
```bash
npm run dev
```

**pnpm**
```bash
pnpm dev
```

**bun**
```bash
bun dev
```

The application will be available at `http://localhost:3000`.

## Building for Production

To create a production build:

**npm**
```bash
npm run build
```

**pnpm**
```bash
pnpm build
```

**bun**
```bash
bun run build
```

## Tech Stack

- **Framework**: React + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **Animations**: Framer Motion
- **AI**: Google GenAI SDK (Gemini 3 Pro)
