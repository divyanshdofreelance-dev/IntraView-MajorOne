# IntraView HUD - Hybrid Electron + C++ Overlay

A hybrid Windows overlay application combining Electron's UI capabilities with native C++ rendering for true screen-capture invisibility. Perfect for keeping private notes, AI assistance, or teleprompter text during video calls and screen sharing.

## 🎯 Features

- **True Screen Capture Invisibility**: C++ overlay using `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` - completely hidden from Google Meet, Zoom, screenshots, and OBS
- **AI Chat Assistant**: OpenRouter integration with multiple free AI models
- **Transparent UI**: Frameless Electron window with selective click-through
- **Global Hotkey**: Toggle overlay with `Ctrl+Shift+O` from any application
- **GPU Accelerated**: Direct2D rendering for smooth performance
- **Always On Top**: Overlay persists over fullscreen applications
- **Markdown Support**: Rendered AI responses with code highlighting
- **Cross-Process IPC**: Seamless communication between Electron and C++ overlay

## 📋 Prerequisites

### Required Software

1. **Visual Studio 2022** (or 2019)
   - Install with "Desktop development with C++" workload
   - Download: https://visualstudio.microsoft.com/downloads/

2. **CMake 3.20 or later**
   - Download: https://cmake.org/download/
   - Add to PATH during installation

3. **Node.js 18.x or higher**
   - Download: https://nodejs.org/

4. **Windows 10/11**
   - Required for Direct2D and SetWindowDisplayAffinity APIs

### Verify Installation

```cmd
node --version
npm --version
cmake --version
cl.exe
```

## 🚀 Quick Start

### Installation

1. **Navigate to project directory**:
   ```cmd
   cd c:\Users\ceodi\OneDrive\Desktop\Intra
   ```

2. **Install Node dependencies**:
   ```cmd
   npm install
   ```

3. **Build C++ overlay**:
   ```cmd
   npm run build:overlay
   ```
   
   This compiles the native C++ overlay to `overlay/build/bin/IntraViewOverlay.exe`

4. **Set OpenRouter API key** (for AI chat):
   ```cmd
   node set-api-key.js
   ```
   
   Enter your OpenRouter API key when prompted (get free key at https://openrouter.ai/)

5. **Build and start**:
   ```cmd
   npm start
   ```

### Development Mode

For TypeScript development with hot-reload:

```cmd
npm run dev
```

Note: You'll need to rebuild the C++ overlay manually if you modify C++ code.

## 🎨 Usage

### Chat Interface

The main Electron window provides an AI chat interface:

1. Type your message in the input box
2. Press Enter or click Send
3. AI responses appear with markdown formatting
4. Click the copy button (📋) to copy AI responses

### Overlay Control

**Toggle Overlay:**
- Click the eye icon (👁️) in the chat window header, or
- Press `Ctrl+Shift+O` globally (works from any application)

**Update Overlay Text:**
- Currently manual: Overlay shows text sent via IPC
- Future: Auto-sync AI responses to overlay

### Window Features

- **Frameless**: No title bar, sleek appearance
- **Transparent**: See-through background
- **Click-through**: Transparent areas don't block clicks
- **Hidden from taskbar**: Won't appear in Alt+Tab or taskbar

## 🔒 Screen Capture Invisibility

### How It Works

The C++ overlay uses Windows' `SetWindowDisplayAffinity` API with the `WDA_EXCLUDEFROMCAPTURE` flag to exclude itself from:

- **Screenshots**: PrintScreen, Snipping Tool, ShareX
- **Screen Recording**: OBS (Display Capture mode), Bandicam
- **Screen Sharing**: Google Meet, Zoom, Microsoft Teams
- **Window Capture APIs**: Any software using Desktop Duplication API

### Testing Invisibility

1. Start the app (`npm start`)
2. Toggle overlay visible (`Ctrl+Shift+O`)
3. Open Google Meet or Zoom
4. Start screen sharing (select entire screen)
5. **Verify**: Overlay text visible on your screen but NOT in shared view

### Limitations

- **Hardware capture cards**: May bypass software exclusion
- **OBS Window Capture**: Captures specific windows (use Display Capture to test)
- **Mobile screen mirroring**: Platform-dependent
- **Older Windows versions**: Requires Windows 10 1903 or later

## 🛠️ Architecture

### Hybrid System

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Process                      │
│  ┌────────────┐         ┌──────────────┐                │
│  │  Renderer  │ ◄─IPC─► │ Main Process │                │
│  │ (chat.ts)  │         │  (main.ts)   │                │
│  └────────────┘         └──────┬───────┘                │
│                                 │                        │
│                                 │ spawn()                │
│                                 ▼                        │
│                    ┌─────────────────────┐              │
│                    │  OverlayManager     │              │
│                    │  Process Spawner    │              │
│                    └──────────┬──────────┘              │
└───────────────────────────────┼──────────────────────────┘
                                │
                          stdin/stdout
                                │
┌───────────────────────────────▼──────────────────────────┐
│              C++ Overlay Process                         │
│  ┌──────────────┐    ┌────────────────┐                 │
│  │  IPCManager  │    │ OverlayWindow  │                 │
│  │ (stdin read) │───►│ (Direct2D)     │                 │
│  └──────────────┘    └────────────────┘                 │
│                      SetWindowDisplayAffinity()          │
└──────────────────────────────────────────────────────────┘
```

### File Structure

```
Intra/
├── src/                          # Electron source
│   ├── main/
│   │   ├── main.ts              # Main process + global hotkeys
│   │   ├── overlay-manager.ts   # C++ overlay process manager
│   │   └── services/
│   │       └── settings-manager.ts
│   ├── preload/
│   │   └── preload.ts           # IPC bridge
│   └── renderer/
│       ├── chat.html/ts/css     # Chat UI
│       └── settings.html/ts/css # Settings UI
│
├── overlay/                      # C++ overlay component
│   ├── CMakeLists.txt           # Build configuration
│   ├── src/
│   │   ├── main.cpp             # Entry point
│   │   ├── OverlayWindow.h/cpp  # Direct2D rendering
│   │   └── IPCManager.h/cpp     # stdin/stdout IPC
│   ├── build/                   # Generated by CMake
│   │   └── bin/
│   │       └── IntraViewOverlay.exe
│   └── README.md                # C++ overlay documentation
│
├── package.json                 # npm scripts & dependencies
├── tsconfig.json                # TypeScript config
└── README.md                    # This file
```

## 📡 IPC Communication

### Electron → C++ Overlay (stdin)

| Command | Description |
|---------|-------------|
| `show` | Make overlay visible |
| `hide` | Hide overlay |
| `toggle` | Toggle visibility |
| `exit` | Shutdown overlay process |
| `<any text>` | Update overlay text content |

### C++ Overlay → Electron (stdout)

| Message | Description |
|---------|-------------|
| `ready` | Overlay initialized successfully |
| `error: <msg>` | Error occurred |

### Example Flow

```typescript
// Electron sends text to overlay
overlayManager.updateText("Hello from Electron!");

// C++ receives on stdin, updates Direct2D text rendering
// User sees "Hello from Electron!" in overlay window
```

## 🎨 Customization

### AI Model

Edit `src/main/main.ts`:

```typescript
const DEFAULT_MODEL = 'openai/gpt-oss-20b:free';  // Change to any OpenRouter model
```

Free models:
- `openai/gpt-oss-20b:free`
- `google/gemma-2-9b-it:free`
- `meta-llama/llama-3-8b-instruct:free`

### Overlay Appearance

Edit `overlay/src/OverlayWindow.cpp`:

```cpp
// Window size
const int width = 600;   // Change width
const int height = 400;  // Change height

// Text color
pRenderTarget_->CreateSolidColorBrush(
    D2D1::ColorF(D2D1::ColorF::White, 0.95f),  // Change color/opacity
    &pTextBrush_
);

// Background color
pRenderTarget_->Clear(D2D1::ColorF(0.0f, 0.0f, 0.0f, 0.3f));  // RGBA
```

### Global Hotkey

Edit `src/main/main.ts`:

```typescript
globalShortcut.register('CommandOrControl+Shift+O', () => {  // Change hotkey
    overlayManager?.toggle();
});
```

## 🔧 Build Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Build overlay + Electron, then run |
| `npm run dev` | Development mode with TypeScript watch |
| `npm run build` | Build Electron TypeScript only |
| `npm run build:overlay` | Build C++ overlay (Release) |
| `npm run build:overlay:debug` | Build C++ overlay (Debug with console) |
| `npm run clean:overlay` | Remove C++ build artifacts |
| `npm run clean` | Remove Electron build artifacts |

## 🧪 Testing

### Test C++ Overlay Standalone

```cmd
cd overlay\build\bin
IntraViewOverlay.exe
```

Type commands in console:
- `Hello, World!` - Updates overlay text
- `toggle` - Toggles visibility
- `exit` - Closes overlay

### Test Screen Capture Exclusion

1. Run the app: `npm start`
2. Toggle overlay: `Ctrl+Shift+O`
3. Open Google Meet: https://meet.google.com/
4. Start a test meeting
5. Click "Present" → "Your entire screen"
6. **Expected**: Overlay visible on your screen, invisible in preview and to others

### Test Global Hotkey

1. Run the app
2. Open any other application (Chrome, Notepad, etc.)
3. Press `Ctrl+Shift+O`
4. **Expected**: Overlay toggles regardless of active app

## 🐛 Troubleshooting

### "CMake not found"
- Install CMake from https://cmake.org/download/
- Ensure "Add CMake to PATH" was checked
- Restart terminal

### "cl.exe not found"
- Install Visual Studio with C++ workload
- Run commands from "Developer Command Prompt for VS 2022" or
- Run `"C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"`

### "Cannot find IntraViewOverlay.exe"
- Ensure C++ overlay built successfully: `npm run build:overlay`
- Check `overlay/build/bin/` for executable
- Review build output for errors

### Overlay visible in screen share
- Verify Windows 10 1903 or later
- Test with Google Meet/Zoom (not OBS Window Capture)
- Some capture methods may bypass API

### Overlay doesn't appear
- Check console for spawn errors
- Run C++ overlay manually to test
- Verify overlay process in Task Manager

### AI chat not working
- Verify OpenRouter API key: `node set-api-key.js`
- Check internet connection
- Review console for API errors
- Try a different free model

## 📚 Additional Documentation

- **C++ Overlay Details**: See `overlay/README.md`
- **Product Requirements**: See `PRD_Advanced_Overlay.md`
- **Build Summary**: See `BUILD_SUMMARY.md`
- **Quick Start Guide**: See `QUICK_START.md`

## 🤝 Contributing

This is currently a private project. For issues or feature requests, contact the development team.

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

This application is designed for legitimate productivity use cases:
- Personal note-taking during meetings
- AI-assisted research and brainstorming
- Teleprompter for presentations

Users are responsible for:
- Complying with organizational policies
- Respecting meeting platform terms of service
- Following applicable privacy laws
- Using the tool ethically and transparently

The screen-capture invisibility feature is intended to provide a private workspace, NOT to deceive others or violate platform policies.

## 🔮 Roadmap

### Completed ✅
- Hybrid Electron + C++ architecture
- True screen capture invisibility (SetWindowDisplayAffinity)
- OpenRouter AI integration with markdown
- Transparent Electron window with selective click-through
- Global hotkey support
- Direct2D GPU-accelerated rendering
- DWM glass blur effect

### In Progress 🔄
- DirectComposition advanced blur
- Smooth fade animations
- Auto-sync AI responses to overlay

### Planned 🎯
- Multi-monitor support
- Custom font and color selection via UI
- Rich text formatting in overlay
- Export chat history
- Voice input for chat
- Offline AI models (llama.cpp)
