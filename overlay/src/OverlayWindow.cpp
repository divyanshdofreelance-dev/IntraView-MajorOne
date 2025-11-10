#include "OverlayWindow.h"
#include <dwmapi.h>
#include <iostream>

#pragma comment(lib, "d2d1.lib")
#pragma comment(lib, "dwrite.lib")
#pragma comment(lib, "dcomp.lib")
#pragma comment(lib, "dwmapi.lib")

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

OverlayWindow::~OverlayWindow() {
    Shutdown();
}

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

    // Get screen dimensions
    int screenWidth = GetSystemMetrics(SM_CXSCREEN);
    int screenHeight = GetSystemMetrics(SM_CYSCREEN);
    
    // Center position
    int x = (screenWidth - WINDOW_WIDTH) / 2;
    int y = 100; // Top center

    // Create layered window
    hwnd_ = CreateWindowExW(
        WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
        L"IntraViewOverlay",
        L"IntraView HUD",
        WS_POPUP,
        x, y, WINDOW_WIDTH, WINDOW_HEIGHT,
        nullptr, nullptr, GetModuleHandle(nullptr), this
    );

    if (!hwnd_) {
        return false;
    }

    // Set window display affinity to exclude from capture
    SetWindowDisplayAffinity(hwnd_, WDA_EXCLUDEFROMCAPTURE);

    // Enable blur behind
    DWM_BLURBEHIND bb = { 0 };
    bb.dwFlags = DWM_BB_ENABLE | DWM_BB_BLURREGION;
    bb.fEnable = TRUE;
    bb.hRgnBlur = CreateRectRgn(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);
    DwmEnableBlurBehindWindow(hwnd_, &bb);
    DeleteObject(bb.hRgnBlur);

    // Create Direct2D factory
    D2D1CreateFactory(D2D1_FACTORY_TYPE_SINGLE_THREADED, &d2dFactory_);
    
    // Create DirectWrite factory
    DWriteCreateFactory(
        DWRITE_FACTORY_TYPE_SHARED,
        __uuidof(IDWriteFactory),
        reinterpret_cast<IUnknown**>(&dwFactory_)
    );

    // Create text format
    if (dwFactory_) {
        dwFactory_->CreateTextFormat(
            L"Segoe UI",
            nullptr,
            DWRITE_FONT_WEIGHT_NORMAL,
            DWRITE_FONT_STYLE_NORMAL,
            DWRITE_FONT_STRETCH_NORMAL,
            24.0f,
            L"en-us",
            &textFormat_
        );

        if (textFormat_) {
            textFormat_->SetTextAlignment(DWRITE_TEXT_ALIGNMENT_CENTER);
            textFormat_->SetParagraphAlignment(DWRITE_PARAGRAPH_ALIGNMENT_CENTER);
        }
    }

    CreateDeviceResources();

    return true;
}

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

    if (renderTarget_) {
        // Create brushes
        renderTarget_->CreateSolidColorBrush(
            D2D1::ColorF(1.0f, 1.0f, 1.0f, 1.0f), // White text
            &textBrush_
        );

        renderTarget_->CreateSolidColorBrush(
            D2D1::ColorF(0.0f, 0.0f, 0.0f, 0.4f), // Semi-transparent black background
            &backgroundBrush_
        );
    }
}

void OverlayWindow::DiscardDeviceResources() {
    if (textBrush_) textBrush_->Release();
    if (backgroundBrush_) backgroundBrush_->Release();
    if (renderTarget_) renderTarget_->Release();
    textBrush_ = nullptr;
    backgroundBrush_ = nullptr;
    renderTarget_ = nullptr;
}

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

void OverlayWindow::UpdateText(const std::wstring& text) {
    displayText_ = text;
    if (visible_) {
        Render();
    }
}

void OverlayWindow::Run() {
    Show();
    
    MSG msg;
    while (GetMessage(&msg, nullptr, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
}

void OverlayWindow::Shutdown() {
    DiscardDeviceResources();
    
    if (textFormat_) textFormat_->Release();
    if (dwFactory_) dwFactory_->Release();
    if (d2dFactory_) d2dFactory_->Release();
    
    if (hwnd_) {
        DestroyWindow(hwnd_);
        hwnd_ = nullptr;
    }
}

void OverlayWindow::Resize() {
    if (renderTarget_) {
        RECT rc;
        GetClientRect(hwnd_, &rc);
        
        D2D1_SIZE_U size = D2D1::SizeU(
            rc.right - rc.left,
            rc.bottom - rc.top
        );
        
        renderTarget_->Resize(size);
        Render();
    }
}

LRESULT CALLBACK OverlayWindow::WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    OverlayWindow* pThis = nullptr;

    if (uMsg == WM_NCCREATE) {
        CREATESTRUCT* pCreate = (CREATESTRUCT*)lParam;
        pThis = (OverlayWindow*)pCreate->lpCreateParams;
        SetWindowLongPtr(hwnd, GWLP_USERDATA, (LONG_PTR)pThis);
    } else {
        pThis = (OverlayWindow*)GetWindowLongPtr(hwnd, GWLP_USERDATA);
    }

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
