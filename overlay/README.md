# IntraView HUD - C++ Overlay Component

This is the native Windows overlay component that renders text invisibly over other applications. It uses Direct2D for GPU-accelerated rendering and Windows APIs to exclude itself from screen capture and screen sharing.

## Features

- **Screen Capture Invisible**: Uses `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` to hide from screenshots and screen sharing (Google Meet, Zoom, OBS, etc.)
- **Always on Top**: Overlays on all applications including fullscreen apps
- **Click-Through**: Fully transparent to mouse events
- **GPU Accelerated**: Direct2D rendering for smooth performance
- **Glass Effect**: DWM blur-behind for modern appearance
- **IPC Communication**: Receives text updates from Electron via stdin/stdout

## Prerequisites

### Required Software

1. **Visual Studio 2022** (or 2019)
   - Install with "Desktop development with C++" workload
   - Includes MSVC compiler and Windows SDK

2. **CMake 3.20 or later**
   - Download from https://cmake.org/download/
   - Add to PATH during installation

3. **Windows 10/11**
   - Direct2D and DirectComposition APIs required

### Verify Installation

```cmd
cmake --version
cl.exe
```

## Building

### Option 1: Build via npm (Recommended)

From the project root:

```cmd
npm run build:overlay
```

This builds the release version to `overlay/build/bin/IntraViewOverlay.exe`.

For debug build:

```cmd
npm run build:overlay:debug
```

### Option 2: Manual CMake Build

From the `overlay/` directory:

```cmd
# Create build directory
mkdir build
cd build

# Configure (Release)
cmake ..

# Build
cmake --build . --config Release

# Output: build/bin/Release/IntraViewOverlay.exe
```

For debug:

```cmd
cmake -DCMAKE_BUILD_TYPE=Debug ..
cmake --build . --config Debug
```

## Architecture

### File Structure

```
overlay/
├── CMakeLists.txt          # Build configuration
├── src/
│   ├── main.cpp            # Entry point, message loop
│   ├── OverlayWindow.h/cpp # Direct2D window rendering
│   └── IPCManager.h/cpp    # stdin/stdout communication
└── build/                  # Generated build files
    └── bin/
        └── IntraViewOverlay.exe  # Final executable
```

### Communication Protocol

The overlay communicates with Electron via **stdin/stdout**:

**Commands from Electron (stdin):**
- `show` - Make overlay visible
- `hide` - Hide overlay
- `toggle` - Toggle visibility
- `exit` - Shutdown overlay
- Any other text - Update overlay content

**Responses to Electron (stdout):**
- `ready` - Overlay initialized successfully
- `error: <message>` - Error occurred

### Window Properties

```cpp
WS_EX_LAYERED        // Alpha transparency support
WS_EX_TRANSPARENT    // Click-through (ignores mouse events)
WS_EX_TOPMOST        // Always on top
WS_EX_TOOLWINDOW     // Exclude from Alt+Tab
WS_EX_NOACTIVATE     // Cannot receive focus
```

**Screen Capture Exclusion:**
```cpp
SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
```

This excludes the window from:
- Screenshots (PrintScreen, Snipping Tool)
- Screen recording (OBS, ShareX)
- Screen sharing (Google Meet, Zoom, Teams)
- Window capture APIs

## Testing

### Manual Test

Run the overlay standalone:

```cmd
cd overlay\build\bin
IntraViewOverlay.exe
```

Type commands:
- `Hello, World!` - Display text
- `toggle` - Toggle visibility
- `exit` - Close overlay

### Screen Capture Test

1. Start the overlay
2. Open Google Meet or Zoom
3. Start screen sharing
4. Verify the overlay text is NOT visible in the shared screen
5. Verify the overlay IS visible on your local screen

### Global Hotkey Test

With Electron app running:
- Press `Ctrl+Shift+O` - Should toggle overlay
- Verify hotkey works from any application

## Debugging

### Enable Debug Output

Change `SUBSYSTEM:WINDOWS` to `SUBSYSTEM:CONSOLE` in `CMakeLists.txt`:

```cmake
set_target_properties(IntraViewOverlay PROPERTIES
    WIN32_EXECUTABLE TRUE
    # Comment out to see console:
    # LINK_FLAGS "/SUBSYSTEM:WINDOWS"
)
```

Rebuild and run - you'll see debug output in a console window.

### Common Issues

**"CMake not found"**
- Install CMake from https://cmake.org/download/
- Add to PATH

**"cl.exe not found"**
- Install Visual Studio with C++ workload
- Run from "Developer Command Prompt for VS 2022"

**"Cannot find Windows.h"**
- Install Windows SDK via Visual Studio Installer
- Ensure "Windows 10 SDK" component is checked

**Overlay doesn't appear**
- Check if `IntraViewOverlay.exe` exists in `overlay/build/bin/`
- Run manually to test if it starts
- Check Electron console for spawn errors

**Overlay visible in screen share**
- `SetWindowDisplayAffinity` requires Windows 10+
- Some capture methods bypass this (hardware capture cards)
- Test with Google Meet/Zoom, not OBS (OBS may require display capture mode)

## Performance

- **GPU Usage**: ~1-5% (Direct2D hardware acceleration)
- **Memory**: ~15-30 MB
- **CPU**: <1% when idle, ~2-5% when updating text
- **Startup Time**: ~200-500ms

## API Reference

### OverlayWindow Class

```cpp
class OverlayWindow {
public:
    bool Create();              // Initialize window and Direct2D
    void Show();                // Make visible (fade in)
    void Hide();                // Make invisible (fade out)
    void SetText(wstring text); // Update displayed text
    bool IsVisible();           // Check visibility state
    
private:
    void Render();              // Render frame with Direct2D
    void CreateDeviceResources(); // Initialize D2D device
};
```

### IPCManager Class

```cpp
class IPCManager {
public:
    void Start(function<void(wstring)> callback);
    void Stop();
    void SendMessage(wstring message);
    
private:
    wstring ReadLine();  // Read UTF-8 line from stdin
};
```

## Future Enhancements

- [ ] DirectComposition blur (better glass effect)
- [ ] Fade animations (smooth show/hide)
- [ ] Multi-monitor support (specify monitor index)
- [ ] Customizable position and size
- [ ] Font and color customization via IPC
- [ ] Rich text formatting (bold, colors, etc.)
- [ ] Transparency level control

## License

MIT License - See main project LICENSE file
