# 🌸 Kizuna AI Companion (`waifu-desktop`)

> Production-ready, local-first Desktop AI Anime Waifu Companion application for Windows PC (cross-platform architecture ready for Linux).

![Kizuna AI Desktop](build/icon.png)

Kizuna is an intelligent, emotionally-responsive virtual partner designed for long-term companionship. Unlike generic chatbots, Kizuna features a **persistent SQLite memory engine**, **dynamic 9-axis affective emotional simulation**, **progressive relationship evolution**, **autonomous proactive messaging**, an **animated anime avatar with expressive mood sync**, and **universal OpenAI-compatible endpoint support** (compatible with LM Studio, Ollama, vLLM, OpenAI, OpenRouter, Groq, Mistral, and more).

---

## 🌟 Key Features

### ⚡ Universal AI Provider & Custom Endpoints
- **Zero Hardcoding**: Connect to any local or remote OpenAI-compatible HTTP endpoint.
- **Local LLM Support**: Instant compatibility with LM Studio (`http://localhost:1234/v1`), Ollama (`http://localhost:11434/v1`), text-generation-webui, or vLLM.
- **Cloud Providers**: Seamless connection to OpenAI, OpenRouter, Groq, Mistral, Together AI, Anthropic proxies, etc.
- **Deep Parameter Controls**: Temperature (0.0 - 1.5), Top-P (0.1 - 1.0), Max Output Tokens, Context Window, Request Timeout, and Exponential Retry Count.
- **Reasoning Models**: Dedicated parser for `<think>...</think>` tags and explicit `reasoning_content` (DeepSeek-R1, OpenAI o1/o3) with collapsible thinking drawers.
- **Test Connection Tool**: Live diagnostic tester measuring endpoint connectivity, latency (ms), available models, and streaming compatibility.
- **Automatic Failover**: Configure fallback providers if primary endpoint experiences rate limits or server downtime.

### 🧠 Persistent Long-Term Memory System
- **Real SQLite Database**: All memories persist across application restarts in local storage.
- **Hybrid Relevance Retrieval**: Combines keyword stem overlap, TF-IDF scoring, category weighting, importance rating (1-10), recency, and pinned priority.
- **Memory Token Budgeting**: Injects only the most relevant memories into the context window without exceeding the model's token limits.
- **Automatic Background Memory Extraction**: Distills durable facts, user habits, preferences, emotional moments, and corrections from conversation turns.
- **Negative Memory Blacklist**: Define forbidden keywords and topics to prevent sensitive data (passwords, private details) from ever being stored.
- **Full Memory Studio**: Search, filter by category (facts, preferences, habits, events, emotional, corrections), edit, delete, pin, or mark permanent.

### 🌸 Dynamic Emotional State & Mood Simulation
- **9 Affective Dimensions**: Happiness, Affection, Excitement, Energy, Trust, Familiarity, Sadness, Anger, and Jealousy (0-100 scales).
- **Temporal Affective Decay**: Emotional spikes (e.g. anger or sadness) naturally soften and decay back towards the character's baseline personality over time.
- **Conversational Reactivity**: Compliments and sweet remarks boost affection and happiness; mentions of rival companions trigger cute possessiveness or jealousy.
- **Dominant Mood Classification**: Mood gauges (Radiant, Affectionate, Bashful, Excited, Pensive, Melancholy, Flustered, Pouting, Sleepy, Serene).
- **Simulation Intensity Slider**: Configure how strongly emotions modulate responses (0% to 100%), or toggle simulation off completely.

### 💖 Relationship Evolution & Affinity Progression
- **5 Progressive Stages**: Stranger → Acquaintance → Friend → Close Friend → Romantic Partner → Long-Term Soulmate.
- **Editable Milestones & Stages**: Customize stage names, minimum affinity thresholds, descriptions, and prompt instructions.
- **Affinity Earning**: Meaningful exchanges and thoughtful interactions award affinity points and unlock relationship milestones with confetti celebration!
- **Persistent Milestone History**: Log of relationship events and dates saved permanently.

### 💬 Polished Modern Chat Experience
- **Real-Time Streaming**: Token-by-token streaming with smooth animated text rendering.
- **Rich Markdown & Code**: Code blocks with syntax highlighting, copy-to-clipboard, tables, and blockquotes.
- **Message Editing & Branching**: Edit prior messages to steer conversation in new directions.
- **Regenerate & Retry**: Instantly retry or regenerate assistant answers.
- **Stop Generation**: Immediate cancellation via `AbortController`.
- **Multi-Session Management**: Create, rename, search, pin, and delete multiple conversation threads.
- **Export & Portability**: Export conversations to clean Markdown or JSON archives.

### 🎨 Animated Anime Avatar & Custom Assets
- **Rich Vector Animation**: Smooth breathing float, natural eye blinking, and synchronized mouth movement during streaming and speech.
- **8 Distinct Emotive Expressions**: Idle, Talking, Happy, Sad, Angry (Pouting), Surprised, Blushing (Flustered), and Sleepy.
- **Dynamic Emotional Aura**: Radial color-shifting aura glow reflecting the current dominant mood.
- **Custom Asset Importer**: Easily import and map your own custom PNG, GIF, SVG, or WebP sprite artwork for each expression!

### 🎙️ Voice & Text-To-Speech (TTS)
- **Built-in Offline Web Speech**: Uses Windows system voices (e.g. Microsoft Zira, David, Hazel) with zero setup and zero latency.
- **OpenAI TTS**: High-fidelity neural voice synthesis (`tts-1` with nova, shimmer, alloy, echo, fable, onyx).
- **Custom Audio HTTP Endpoint**: Support for ElevenLabs, Kokoro TTS, Piper, or local audio streaming servers.
- **Fine Audio Controls**: Adjustable speech rate (0.5x - 2.0x) and pitch (0.5x - 1.5x), auto-speak toggle, and individual message audio playback.

### 🛠️ Developer Diagnostics & Telemetry
- **Live Debug Suite**: Real-time monitor showing active provider, model, latency (ms), estimated token counts, context window breakdown, retrieved memories list, raw compiled system prompt, and error diagnostics.
- **Sensitive Key Masking**: Hide API keys with one-click masking toggle.

### 📦 Portable Backup & Restore
- Full application state export and import in JSON format (characters, conversations, messages, memories, providers, and settings).

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| **Desktop Runtime** | Electron 35+ (Node.js v26 compatible) |
| **Frontend Framework** | React 19 + TypeScript |
| **Build & Tooling** | Vite 6 + Tailwind CSS |
| **Database & Persistence** | SQLite 3 (`sql.js` WebAssembly + File Sync) |
| **Streaming Parser** | `eventsource-parser` v3 (Server-Sent Events) |
| **Markdown Rendering** | `react-markdown` + `remark-gfm` + `rehype-highlight` |
| **Visual Styling** | Glassmorphic Anime UI with Themes (Dark Sakura, Midnight Neon, Cyber Dream, Light Velvet) |
| **Desktop Packaging** | `electron-builder` (NSIS Installer + Portable Executable) |
| **Testing** | Vitest 3 |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ (Node 22 / 24 / 26 supported)
- npm 10+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/newabolup/waifu-desktop.git
cd waifu-desktop

# Install dependencies
npm install
```

### Running in Development

```bash
# Start Vite dev server & Electron desktop window
npm run build:react
npm run build:electron
npm run app
```

Or run Vite live hot-reloading:
```bash
npm run dev
```

---

## 🧪 Running Automated Tests

The application includes unit and integration tests covering prompt compilation, hybrid memory retrieval, streaming SSE parsing, reasoning token extraction, emotional decay, relationship progression, and scheduling logic.

```bash
npm run test
```

All 6 test suites and 23 automated tests run and verify all core engines:
- `tests/promptEngine.test.ts`
- `tests/memoryEngine.test.ts`
- `tests/providerEngine.test.ts`
- `tests/emotionAndRelationship.test.ts`
- `tests/proactiveScheduler.test.ts`
- `tests/exportImport.test.ts`

---

## 📦 Building the Windows Application

Produce standalone Windows executables and installers:

```bash
# 1. Compile React frontend and Electron TypeScript
npm run build

# 2. Package standalone Windows binaries
npm run pack     # Creates release/win-unpacked/Kizuna AI Companion.exe
npm run dist     # Generates NSIS Installer & Portable .exe in release/
```

### Build Outputs
- **Windows Installer**: `release/Kizuna AI Companion Setup 1.0.0.exe`
- **Portable Executable**: `release/Kizuna AI Companion 1.0.0.exe`
- **Unpacked Executable**: `release/win-unpacked/Kizuna AI Companion.exe`

---

## 🔧 Configuring AI Endpoints

Navigate to the **Providers** tab in the desktop application:

### Local LM Studio
1. Launch LM Studio, load your preferred GGUF model, and start the local server on port 1234.
2. In Kizuna AI, click **LM Studio (Local)** preset.
   - **Base URL**: `http://localhost:1234/v1`
   - **API Key**: *(leave blank)*
   - **Model**: `local-model`
3. Click **Test Connection** to verify latency and streaming.
4. Click **Set as Active**.

### Local Ollama
1. Run `ollama serve` and ensure your model is pulled (e.g. `ollama run llama3.2`).
2. In Kizuna AI, click **Ollama (Local)** preset.
   - **Base URL**: `http://localhost:11434/v1`
   - **API Key**: *(leave blank)*
   - **Model**: `llama3.2`
3. Click **Test Connection** and set as active.

### OpenAI / OpenRouter / Custom Endpoints
1. Enter your custom Base URL (e.g. `https://api.openai.com/v1` or `https://openrouter.ai/api/v1`).
2. Paste your API key.
3. Enter model identifier (e.g. `gpt-4o-mini` or `anthropic/claude-3.5-haiku`).
4. Click **Test Connection** to confirm connectivity.

---

## 🔒 Security & Privacy Guarantees
- **100% Local Storage**: Your conversations, memories, character profiles, and relationship milestones are stored in an encrypted/local SQLite database on your machine.
- **Zero Third-Party Telemetry**: Kizuna sends network requests **exclusively** to the AI provider endpoint and TTS endpoint that you explicitly configure.
- **API Key Masking**: API keys are masked in the UI and stripped from export logs.

---

## 📄 License
MIT License. Created by [newabolup](https://github.com/newabolup).
