# IntraView C++ Overlay - Complete Documentation

This document provides a comprehensive explanation of the C++ overlay component in the IntraView project, including every file, every function, and how it connects to the Electron application.

---

## 📁 Project Structure

```
overlay/
├── CMakeLists.txt              # CMake build configuration
├── README.md                   # Quick reference documentation
├── src/
│   ├── main.cpp                # Application entry point
│   ├── OverlayWindow.h         # Overlay window class header
│   ├── OverlayWindow.cpp       # Overlay window implementation
│   ├── IPCManager.h            # IPC manager class header
│   └── IPCManager.cpp          # IPC manager implementation
└── build/
    └── bin/
        └── Release/
            └── IntraViewOverlay.exe   # Compiled executable
```

---

## 🎯 Purpose

The C++ overlay creates an **invisible-to-screen-capture window** that displays text on top of all applications. This is used for:

- Displaying AI assistant responses during screen sharing
- Showing information that only YOU can see (not visible in Google Meet, Zoom, etc.)
- Creating a "heads-up display" (HUD) overlay

### Key Windows API Feature

```cpp
SetWindowDisplayAffinity(hwnd_, WDA_EXCLUDEFROMCAPTURE);
```

This single line makes the window **invisible to all screen capture methods** while remaining visible on your physical display.

---

## 📄 File-by-File Breakdown

---

### 1. CMakeLists.txt - Build Configuration

```cmake
cmake_minimum_required(VERSION 3.20)
project(IntraViewOverlay)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
```

**What this does:**
- Sets the minimum CMake version to 3.20
- Names the project "IntraViewOverlay"
- Uses C++17 standard (required for modern features like `std::atomic`)

```cmake
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
```

**What this does:**
- Sets the output directory for the compiled `.exe` file to `build/bin/`

```cmake
add_executable(IntraViewOverlay
    src/main.cpp
    src/OverlayWindow.cpp
    src/OverlayWindow.h
    src/IPCManager.cpp
    src/IPCManager.h
)
```

**What this does:**
- Creates an executable named `IntraViewOverlay.exe`
- Lists all source files that will be compiled together

```cmake
target_link_libraries(IntraViewOverlay
    d2d1       # Direct2D (2D graphics rendering)
    dwrite     # DirectWrite (text rendering)
    dcomp      # DirectComposition (visual effects)
    user32     # Windows User Interface APIs
    gdi32      # Graphics Device Interface
    dwmapi     # Desktop Window Manager API
)
```

**What this does:**
- Links the necessary Windows libraries:
  - **d2d1**: For GPU-accelerated 2D graphics
  - **dwrite**: For high-quality text rendering
  - **dcomp**: For composition effects (blur, transparency)
  - **user32**: For window creation and management
  - **gdi32**: For basic graphics operations
  - **dwmapi**: For glass/blur effects behind window

```cmake
target_compile_definitions(IntraViewOverlay PRIVATE UNICODE _UNICODE)
```

**What this does:**
- Enables Unicode support (wide strings like `std::wstring`)
- All Windows APIs will use Unicode versions (e.g., `CreateWindowExW` instead of `CreateWindowExA`)

```cmake
if(MSVC)
    set_target_properties(IntraViewOverlay PROPERTIES
        LINK_FLAGS "/SUBSYSTEM:WINDOWS /ENTRY:mainCRTStartup"
    )
endif()
```

**What this does:**
- `/SUBSYSTEM:WINDOWS`: Creates a Windows GUI application (no console window)
- `/ENTRY:mainCRTStartup`: Uses `main()` as entry point instead of `WinMain()`

---

### 2. main.cpp - Application Entry Point

```cpp
#include "OverlayWindow.h"
#include "IPCManager.h"
#include <iostream>
#include <windows.h>
```

**What this does:**
- Includes our custom classes (OverlayWindow and IPCManager)
- Includes standard I/O for console output
- Includes Windows API definitions

```cpp
int main() {
    // Initialize COM
    CoInitialize(nullptr);
```

**What this does:**
- `CoInitialize()` initializes the Component Object Model (COM) library
- Required for DirectWrite and some Windows APIs
- `nullptr` uses default concurrency model

```cpp
    // Create overlay window
    OverlayWindow overlay;
    
    if (!overlay.Initialize()) {
        std::cerr << "Failed to initialize overlay window" << std::endl;
        CoUninitialize();
        return 1;
    }
```

**What this does:**
- Creates an instance of `OverlayWindow` class
- Calls `Initialize()` to set up the window and graphics
- If initialization fails, prints error and exits with code 1
- `CoUninitialize()` cleans up COM before exiting

```cpp
    std::wcout << L"IntraView Overlay Started" << std::endl;
```

**What this does:**
- Prints startup message to stdout (which Electron reads)
- Uses `std::wcout` for wide character string output

```cpp
    // Create IPC manager
    IPCManager ipc;
    
    // Start listening for commands
    ipc.Start([&overlay](const std::wstring& message) {
```

**What this does:**
- Creates an IPC (Inter-Process Communication) manager
- Starts listening in a separate thread
- Passes a **lambda function** that handles incoming messages
- `[&overlay]` captures the overlay reference so we can control it

```cpp
        if (message == L"toggle") {
            overlay.Toggle();
        } else if (message == L"show") {
            overlay.Show();
        } else if (message == L"hide") {
            overlay.Hide();
        } else if (message == L"exit") {
            PostQuitMessage(0);
        } else {
            // Update text
            overlay.UpdateText(message);
        }
    });
```

**What this does:**
- **Command processing logic:**
  - `toggle`: Shows/hides the overlay
  - `show`: Makes overlay visible
  - `hide`: Hides overlay
  - `exit`: Sends WM_QUIT message to end the message loop
  - **Any other text**: Updates the displayed text

```cpp
    // Run message loop
    overlay.Run();
```

**What this does:**
- Starts the Windows message loop
- This is a blocking call - the program stays here until `PostQuitMessage` is called
- Processes all Windows messages (paint, resize, etc.)

```cpp
    // Cleanup
    ipc.Stop();
    overlay.Shutdown();
    CoUninitialize();

    return 0;
}
```

**What this does:**
- Stops the IPC listener thread
- Releases all overlay resources (Direct2D, window, etc.)
- Uninitializes COM
- Returns 0 (success)

---

### 3. IPCManager.h - IPC Manager Header

```cpp
#pragma once
#include <string>
#include <functional>
#include <thread>
#include <atomic>
```

**What this does:**
- `#pragma once`: Prevents multiple inclusion of this header
- Includes necessary standard library headers:
  - `<string>`: For `std::wstring`
  - `<functional>`: For `std::function` (callback type)
  - `<thread>`: For `std::thread`
  - `<atomic>`: For thread-safe boolean flag

```cpp
class IPCManager {
public:
    using MessageCallback = std::function<void(const std::wstring&)>;
```

**What this does:**
- Defines a type alias `MessageCallback`
- It's a function that takes a wide string and returns nothing
- Used for the callback when a message is received

```cpp
    IPCManager();
    ~IPCManager();

    void Start(MessageCallback callback);
    void Stop();
```

**What this does:**
- Constructor: Initializes the manager
- Destructor: Cleans up resources
- `Start()`: Begins listening for messages in a new thread
- `Stop()`: Stops the listener thread

```cpp
private:
    void ListenLoop();
    std::wstring ReadLine();

    MessageCallback callback_;
    std::atomic<bool> running_;
    std::thread listenerThread_;
};
```

**What this does:**
- `ListenLoop()`: Private method that runs in the listener thread
- `ReadLine()`: Reads a line from stdin and converts to wide string
- `callback_`: Stores the callback function
- `running_`: Thread-safe flag to control the loop (atomic for thread safety)
- `listenerThread_`: The actual thread object

---

### 4. IPCManager.cpp - IPC Manager Implementation

```cpp
#include "IPCManager.h"
#include <iostream>
#include <windows.h>

IPCManager::IPCManager() : running_(false) {
}
```

**What this does:**
- Constructor initializes `running_` to false
- Uses member initializer list for efficiency

```cpp
IPCManager::~IPCManager() {
    Stop();
}
```

**What this does:**
- Destructor ensures the listener thread is stopped
- Prevents resource leaks

```cpp
void IPCManager::Start(MessageCallback callback) {
    callback_ = callback;
    running_ = true;
    listenerThread_ = std::thread(&IPCManager::ListenLoop, this);
}
```

**What this does:**
- Stores the callback function
- Sets running flag to true
- Creates a new thread running `ListenLoop`
- `this` is passed so the thread can access member variables

```cpp
void IPCManager::Stop() {
    running_ = false;
    if (listenerThread_.joinable()) {
        listenerThread_.join();
    }
}
```

**What this does:**
- Sets running flag to false (tells loop to stop)
- Checks if thread is joinable (valid and not already joined)
- `join()` waits for the thread to finish

```cpp
void IPCManager::ListenLoop() {
    while (running_) {
        std::wstring line = ReadLine();
        if (!line.empty() && callback_) {
            callback_(line);
        }
    }
}
```

**What this does:**
- Main loop that runs in the listener thread
- Reads lines from stdin while `running_` is true
- If line is not empty and callback exists, calls the callback
- This enables continuous communication from Electron

```cpp
std::wstring IPCManager::ReadLine() {
    std::string line;
    
    if (!std::getline(std::cin, line)) {
        running_ = false;
        return L"";
    }
```

**What this does:**
- Reads a line from stdin (standard input)
- If read fails (EOF or error), stops the loop
- Returns empty string on failure

```cpp
    // Convert UTF-8 to wide string
    int size_needed = MultiByteToWideChar(CP_UTF8, 0, line.c_str(), (int)line.size(), NULL, 0);
    std::wstring wstrTo(size_needed, 0);
    MultiByteToWideChar(CP_UTF8, 0, line.c_str(), (int)line.size(), &wstrTo[0], size_needed);
    
    return wstrTo;
}
```

**What this does:**
- Converts UTF-8 string to Windows wide string (UTF-16)
- `MultiByteToWideChar` is a Windows API for string conversion
- First call with NULL gets required buffer size
- Second call performs the actual conversion
- Returns the wide string for use with Windows APIs

---

### 5. OverlayWindow.h - Overlay Window Header

```cpp
#pragma once
#include <windows.h>
#include <d2d1.h>
#include <dwrite.h>
#include <dcomp.h>
#include <string>
#include <memory>
```

**What this does:**
- Includes Windows and DirectX headers:
  - `d2d1.h`: Direct2D for 2D graphics
  - `dwrite.h`: DirectWrite for text rendering
  - `dcomp.h`: DirectComposition for visual effects

```cpp
class OverlayWindow {
public:
    OverlayWindow();
    ~OverlayWindow();

    bool Initialize();
    void Show();
    void Hide();
    void Toggle();
    void UpdateText(const std::wstring& text);
    void Run();
    void Shutdown();
```

**What this does:**
- Public interface for controlling the overlay:
  - `Initialize()`: Sets up window and graphics resources
  - `Show()/Hide()/Toggle()`: Control visibility
  - `UpdateText()`: Change displayed text
  - `Run()`: Start the message loop
  - `Shutdown()`: Clean up resources

```cpp
private:
    static LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam);
    void Render();
    void CreateDeviceResources();
    void DiscardDeviceResources();
    void Resize();
```

**What this does:**
- `WindowProc`: Static callback that Windows calls for window events
- `Render()`: Draws the overlay content
- `CreateDeviceResources()/DiscardDeviceResources()`: Manage Direct2D resources
- `Resize()`: Handle window size changes

```cpp
    HWND hwnd_;                              // Window handle
    bool visible_;                           // Visibility state
    std::wstring displayText_;               // Current displayed text

    // Direct2D resources
    ID2D1Factory* d2dFactory_;               // Creates D2D objects
    ID2D1HwndRenderTarget* renderTarget_;    // Drawing surface
    ID2D1SolidColorBrush* textBrush_;        // Text color
    ID2D1SolidColorBrush* backgroundBrush_;  // Background color

    // DirectWrite resources
    IDWriteFactory* dwFactory_;              // Creates DWrite objects
    IDWriteTextFormat* textFormat_;          // Font settings

    // DirectComposition resources (for future blur effects)
    IDCompositionDevice* dcompDevice_;
    IDCompositionTarget* dcompTarget_;
    IDCompositionVisual* dcompVisual_;

    // Window dimensions
    const int WINDOW_WIDTH = 600;
    const int WINDOW_HEIGHT = 400;
};
```

**What this does:**
- Stores all window and graphics state
- Direct2D objects handle GPU-accelerated rendering
- DirectWrite objects handle text formatting
- DirectComposition (prepared for future blur effects)

---

### 6. OverlayWindow.cpp - Overlay Window Implementation

#### Constructor & Destructor

```cpp
OverlayWindow::OverlayWindow()
    : hwnd_(nullptr)
    , visible_(true)
    , displayText_(L"IntraView HUD Ready")
    , d2dFactory_(nullptr)
    , renderTarget_(nullptr)
    , textBrush_(nullptr)
    , backgroundBrush_(nullptr)
    , dwFactory_(nullptr)
    , textFormat_(nullptr)
    , dcompDevice_(nullptr)
    , dcompTarget_(nullptr)
    , dcompVisual_(nullptr)
{
}
```

**What this does:**
- Initializes all member variables to safe defaults
- Sets initial text to "IntraView HUD Ready"
- Uses member initializer list for efficiency

#### Initialize Method

```cpp
bool OverlayWindow::Initialize() {
    // Register window class
    WNDCLASSEXW wc = { sizeof(WNDCLASSEXW) };
    wc.lpfnWndProc = WindowProc;
    wc.hInstance = GetModuleHandle(nullptr);
    wc.lpszClassName = L"IntraViewOverlay";
    wc.hCursor = LoadCursor(nullptr, IDC_ARROW);
    
    if (!RegisterClassExW(&wc)) {
        return false;
    }
```

**What this does:**
- Creates a window class definition
- `lpfnWndProc`: Sets the window procedure (event handler)
- `hInstance`: Gets the application's module handle
- `lpszClassName`: Unique name for this window class
- `hCursor`: Standard arrow cursor

```cpp
    // Get screen dimensions
    int screenWidth = GetSystemMetrics(SM_CXSCREEN);
    int screenHeight = GetSystemMetrics(SM_CYSCREEN);
    
    // Center position
    int x = (screenWidth - WINDOW_WIDTH) / 2;
    int y = 100; // Top center
```

**What this does:**
- Gets the screen width and height
- Calculates centered X position
- Places window near top of screen (100 pixels from top)

```cpp
    // Create layered window
    hwnd_ = CreateWindowExW(
        WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
        L"IntraViewOverlay",
        L"IntraView HUD",
        WS_POPUP,
        x, y, WINDOW_WIDTH, WINDOW_HEIGHT,
        nullptr, nullptr, GetModuleHandle(nullptr), this
    );
```

**What this does:**
- Creates the window with special extended styles:
  - `WS_EX_LAYERED`: Enables transparency
  - `WS_EX_TRANSPARENT`: Click-through (mouse goes through)
  - `WS_EX_TOPMOST`: Always on top of other windows
  - `WS_EX_TOOLWINDOW`: Excludes from Alt+Tab
- `WS_POPUP`: Borderless window style
- `this` is passed as creation parameter (for WindowProc access)

```cpp
    // Set window display affinity to exclude from capture
    SetWindowDisplayAffinity(hwnd_, WDA_EXCLUDEFROMCAPTURE);
```

**🔥 THIS IS THE KEY LINE! 🔥**

**What this does:**
- `SetWindowDisplayAffinity` with `WDA_EXCLUDEFROMCAPTURE`
- Makes the window **invisible to ALL screen capture methods**:
  - Screenshots (PrintScreen, Snipping Tool)
  - Screen recording (OBS, ShareX)
  - Screen sharing (Google Meet, Zoom, Teams)
  - Any Windows capture API
- Window is still visible on your physical monitor!

```cpp
    // Enable blur behind
    DWM_BLURBEHIND bb = { 0 };
    bb.dwFlags = DWM_BB_ENABLE | DWM_BB_BLURREGION;
    bb.fEnable = TRUE;
    bb.hRgnBlur = CreateRectRgn(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);
    DwmEnableBlurBehindWindow(hwnd_, &bb);
    DeleteObject(bb.hRgnBlur);
```

**What this does:**
- Creates a "glass" effect behind the window
- Uses Desktop Window Manager (DWM) API
- Creates a rectangular blur region covering the whole window
- Gives the overlay a modern, translucent appearance

```cpp
    // Create Direct2D factory
    D2D1CreateFactory(D2D1_FACTORY_TYPE_SINGLE_THREADED, &d2dFactory_);
    
    // Create DirectWrite factory
    DWriteCreateFactory(
        DWRITE_FACTORY_TYPE_SHARED,
        __uuidof(IDWriteFactory),
        reinterpret_cast<IUnknown**>(&dwFactory_)
    );
```

**What this does:**
- Creates Direct2D factory (entry point for D2D operations)
- Creates DirectWrite factory (for text rendering)
- Single-threaded for simplicity (we only render from one thread)

```cpp
    // Create text format
    if (dwFactory_) {
        dwFactory_->CreateTextFormat(
            L"Segoe UI",                      // Font family
            nullptr,                           // Font collection (null = system)
            DWRITE_FONT_WEIGHT_NORMAL,        // Weight
            DWRITE_FONT_STYLE_NORMAL,         // Style
            DWRITE_FONT_STRETCH_NORMAL,       // Stretch
            24.0f,                            // Font size
            L"en-us",                         // Locale
            &textFormat_
        );

        if (textFormat_) {
            textFormat_->SetTextAlignment(DWRITE_TEXT_ALIGNMENT_CENTER);
            textFormat_->SetParagraphAlignment(DWRITE_PARAGRAPH_ALIGNMENT_CENTER);
        }
    }
```

**What this does:**
- Creates a text format with Segoe UI font at 24pt
- Centers text both horizontally and vertically
- Segoe UI is the standard Windows UI font

#### CreateDeviceResources Method

```cpp
void OverlayWindow::CreateDeviceResources() {
    if (renderTarget_) return;

    RECT rc;
    GetClientRect(hwnd_, &rc);

    D2D1_SIZE_U size = D2D1::SizeU(
        rc.right - rc.left,
        rc.bottom - rc.top
    );

    D2D1_RENDER_TARGET_PROPERTIES props = D2D1::RenderTargetProperties(
        D2D1_RENDER_TARGET_TYPE_DEFAULT,
        D2D1::PixelFormat(DXGI_FORMAT_B8G8R8A8_UNORM, D2D1_ALPHA_MODE_PREMULTIPLIED)
    );

    if (d2dFactory_) {
        d2dFactory_->CreateHwndRenderTarget(
            props,
            D2D1::HwndRenderTargetProperties(hwnd_, size),
            &renderTarget_
        );
    }
```

**What this does:**
- Creates GPU resources for rendering
- Gets window client area dimensions
- Creates a render target bound to our window
- Uses premultiplied alpha for proper transparency

```cpp
    if (renderTarget_) {
        // Create brushes
        renderTarget_->CreateSolidColorBrush(
            D2D1::ColorF(1.0f, 1.0f, 1.0f, 1.0f), // White text
            &textBrush_
        );

        renderTarget_->CreateSolidColorBrush(
            D2D1::ColorF(0.0f, 0.0f, 0.0f, 0.4f), // Semi-transparent black
            &backgroundBrush_
        );
    }
}
```

**What this does:**
- Creates brushes for drawing:
  - White brush for text (RGBA: 1, 1, 1, 1)
  - Semi-transparent black for background (40% opacity)

#### Render Method

```cpp
void OverlayWindow::Render() {
    if (!renderTarget_) CreateDeviceResources();
    if (!renderTarget_) return;

    renderTarget_->BeginDraw();
    
    // Clear with transparent background
    renderTarget_->Clear(D2D1::ColorF(0, 0, 0, 0));

    // Draw semi-transparent background
    D2D1_RECT_F rect = D2D1::RectF(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);
    if (backgroundBrush_) {
        renderTarget_->FillRectangle(rect, backgroundBrush_);
    }

    // Draw text
    if (textBrush_ && textFormat_) {
        renderTarget_->DrawTextW(
            displayText_.c_str(),
            displayText_.length(),
            textFormat_,
            rect,
            textBrush_
        );
    }

    HRESULT hr = renderTarget_->EndDraw();
    
    if (hr == D2DERR_RECREATE_TARGET) {
        DiscardDeviceResources();
    }
}
```

**What this does:**
1. Ensures device resources exist
2. Begins a drawing operation
3. Clears to transparent (so DWM blur shows through)
4. Draws a semi-transparent black rectangle as background
5. Draws the text centered in the window
6. Ends drawing and checks for errors
7. If device lost (GPU reset), recreates resources

#### Show/Hide/Toggle Methods

```cpp
void OverlayWindow::Show() {
    visible_ = true;
    ShowWindow(hwnd_, SW_SHOW);
    UpdateWindow(hwnd_);
    Render();
}

void OverlayWindow::Hide() {
    visible_ = false;
    ShowWindow(hwnd_, SW_HIDE);
}

void OverlayWindow::Toggle() {
    if (visible_) {
        Hide();
    } else {
        Show();
    }
}
```

**What this does:**
- `Show()`: Sets visible flag, shows window, updates and renders
- `Hide()`: Sets visible flag, hides window
- `Toggle()`: Switches between visible and hidden states

#### UpdateText Method

```cpp
void OverlayWindow::UpdateText(const std::wstring& text) {
    displayText_ = text;
    if (visible_) {
        Render();
    }
}
```

**What this does:**
- Stores the new text
- If visible, immediately re-renders with new text

#### Run Method (Message Loop)

```cpp
void OverlayWindow::Run() {
    Show();
    
    MSG msg;
    while (GetMessage(&msg, nullptr, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
}
```

**What this does:**
- Shows the window initially
- Enters the Windows message loop:
  - `GetMessage()`: Waits for and retrieves messages
  - `TranslateMessage()`: Converts keyboard input
  - `DispatchMessage()`: Sends message to WindowProc
- Loop exits when `WM_QUIT` is received

#### WindowProc (Static Callback)

```cpp
LRESULT CALLBACK OverlayWindow::WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    OverlayWindow* pThis = nullptr;

    if (uMsg == WM_NCCREATE) {
        CREATESTRUCT* pCreate = (CREATESTRUCT*)lParam;
        pThis = (OverlayWindow*)pCreate->lpCreateParams;
        SetWindowLongPtr(hwnd, GWLP_USERDATA, (LONG_PTR)pThis);
    } else {
        pThis = (OverlayWindow*)GetWindowLongPtr(hwnd, GWLP_USERDATA);
    }
```

**What this does:**
- Gets the `OverlayWindow` instance from window data
- On `WM_NCCREATE`, stores the `this` pointer in window's user data
- On other messages, retrieves the stored pointer
- Allows static function to call instance methods

```cpp
    if (pThis) {
        switch (uMsg) {
        case WM_PAINT:
        case WM_DISPLAYCHANGE:
            pThis->Render();
            ValidateRect(hwnd, nullptr);
            return 0;

        case WM_SIZE:
            pThis->Resize();
            return 0;

        case WM_DESTROY:
            PostQuitMessage(0);
            return 0;
        }
    }

    return DefWindowProc(hwnd, uMsg, wParam, lParam);
}
```

**What this does:**
- Handles specific window messages:
  - `WM_PAINT`/`WM_DISPLAYCHANGE`: Re-render the window
  - `WM_SIZE`: Handle resize
  - `WM_DESTROY`: Post quit message to exit message loop
- All other messages go to default handler

---

## 🔗 Electron Connection (TypeScript Side)

### overlay-manager.ts

This TypeScript file manages the C++ overlay process from Electron:

```typescript
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { app } from 'electron';

export class OverlayManager {
  private overlayProcess: ChildProcess | null = null;
  private overlayReady: boolean = false;
```

**What this does:**
- Imports Node.js spawn for running external processes
- Tracks the overlay child process
- Tracks ready state

```typescript
  start(): Promise<boolean> {
    return new Promise((resolve) => {
      const overlayPath = path.join(
        app.getAppPath(),
        'overlay',
        'build',
        'bin',
        'Release',
        'IntraViewOverlay.exe'
      );

      console.log('[Overlay] Starting overlay process:', overlayPath);

      this.overlayProcess = spawn(overlayPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
```

**What this does:**
- Constructs path to the compiled overlay executable
- Spawns the overlay as a child process
- Sets up stdin/stdout/stderr as pipes for communication

```typescript
      this.overlayProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log('[Overlay Output]:', output);
        
        if (output.includes('Started')) {
          this.overlayReady = true;
          resolve(true);
        }
      });
```

**What this does:**
- Listens for stdout from the overlay
- When "Started" message received, marks as ready
- Resolves the promise to indicate successful startup

```typescript
  sendMessage(message: string): boolean {
    if (!this.overlayProcess || !this.overlayProcess.stdin || !this.overlayReady) {
      console.warn('[Overlay] Not ready to send messages');
      return false;
    }

    try {
      this.overlayProcess.stdin.write(message + '\n');
      return true;
    } catch (error) {
      console.error('[Overlay] Failed to send message:', error);
      return false;
    }
  }
```

**What this does:**
- Writes messages to overlay's stdin
- The C++ `IPCManager::ReadLine()` receives these messages
- Messages are newline-terminated

```typescript
  toggle(): boolean { return this.sendMessage('toggle'); }
  show(): boolean { return this.sendMessage('show'); }
  hide(): boolean { return this.sendMessage('hide'); }
  updateText(text: string): boolean { return this.sendMessage(text); }
```

**What this does:**
- Convenience methods that map to overlay commands
- `toggle/show/hide` send control commands
- `updateText` sends any other text to display

---

## 🔄 Communication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              ELECTRON                                    │
│                                                                         │
│  ┌─────────────────┐         ┌──────────────────────────────────┐      │
│  │   Main Process  │         │       OverlayManager.ts           │      │
│  │                 │────────>│                                   │      │
│  │  - User input   │         │  spawn('IntraViewOverlay.exe')   │      │
│  │  - AI response  │         │  stdin.write('message\n')        │      │
│  └─────────────────┘         └──────────────────────────────────┘      │
│                                          │                              │
│                                          │ stdin                        │
│                                          ▼                              │
└──────────────────────────────────────────┼──────────────────────────────┘
                                           │
                                           │ pipe
                                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         C++ OVERLAY PROCESS                              │
│                                                                         │
│  ┌───────────────────┐                    ┌──────────────────────┐      │
│  │   IPCManager      │                    │   OverlayWindow      │      │
│  │                   │                    │                      │      │
│  │ std::cin.getline()│──── messages ────>│ UpdateText(msg)      │      │
│  │                   │                    │ Show() / Hide()      │      │
│  │ Running in        │                    │ Toggle()             │      │
│  │ separate thread   │                    │                      │      │
│  └───────────────────┘                    │ Direct2D Rendering   │      │
│                                           │ WDA_EXCLUDEFROMCAPTURE│      │
│                                           └──────────────────────┘      │
│                                                      │                   │
│                                                      ▼                   │
│                                           ┌──────────────────────┐      │
│                                           │   WINDOWS DISPLAY    │      │
│                                           │                      │      │
│                                           │  Visible on monitor  │      │
│                                           │  INVISIBLE to capture│      │
│                                           └──────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📝 Command Protocol

| Command | Description | C++ Handler |
|---------|-------------|-------------|
| `show` | Make overlay visible | `overlay.Show()` |
| `hide` | Hide overlay | `overlay.Hide()` |
| `toggle` | Toggle visibility | `overlay.Toggle()` |
| `exit` | Shutdown overlay | `PostQuitMessage(0)` |
| `<any text>` | Display text | `overlay.UpdateText(msg)` |

---

## 🛠️ Building

### Prerequisites
- Visual Studio 2022 with C++ workload
- CMake 3.20+
- Windows 10/11

### Build Commands

```cmd
# From project root
cd overlay
mkdir build
cd build
cmake ..
cmake --build . --config Release
```

### Output
```
overlay/build/bin/Release/IntraViewOverlay.exe
```

---

## 🧪 Testing

### Manual Test
```cmd
cd overlay\build\bin\Release
IntraViewOverlay.exe
```

Then type in console:
```
Hello World!      # Displays text
toggle            # Hides overlay
toggle            # Shows overlay
exit              # Closes overlay
```

### Screen Share Test
1. Start overlay
2. Join Google Meet/Zoom call
3. Share screen
4. Verify overlay text is NOT visible in shared view
5. Verify overlay IS visible on your monitor

---

## 🔑 Key Takeaways

1. **The Magic Line**: `SetWindowDisplayAffinity(hwnd_, WDA_EXCLUDEFROMCAPTURE)` makes the window invisible to capture

2. **IPC via stdio**: Electron communicates with C++ through stdin/stdout pipes

3. **Direct2D for Rendering**: GPU-accelerated graphics for smooth overlay

4. **Layered Window**: `WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOPMOST` creates a click-through, always-on-top overlay

5. **Separate Thread for IPC**: `IPCManager` runs in its own thread to not block the message loop

---

## 📚 References

- [SetWindowDisplayAffinity MSDN](https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity)
- [Direct2D Programming Guide](https://docs.microsoft.com/en-us/windows/win32/direct2d/direct2d-portal)
- [DirectWrite Introduction](https://docs.microsoft.com/en-us/windows/win32/directwrite/introducing-directwrite)
- [Node.js child_process](https://nodejs.org/api/child_process.html)

