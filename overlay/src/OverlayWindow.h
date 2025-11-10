#pragma once
#include <windows.h>
#include <d2d1.h>
#include <dwrite.h>
#include <dcomp.h>
#include <string>
#include <memory>

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

private:
    static LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam);
    void Render();
    void CreateDeviceResources();
    void DiscardDeviceResources();
    void Resize();

    HWND hwnd_;
    bool visible_;
    std::wstring displayText_;

    // Direct2D resources
    ID2D1Factory* d2dFactory_;
    ID2D1HwndRenderTarget* renderTarget_;
    ID2D1SolidColorBrush* textBrush_;
    ID2D1SolidColorBrush* backgroundBrush_;

    // DirectWrite resources
    IDWriteFactory* dwFactory_;
    IDWriteTextFormat* textFormat_;

    // DirectComposition resources
    IDCompositionDevice* dcompDevice_;
    IDCompositionTarget* dcompTarget_;
    IDCompositionVisual* dcompVisual_;

    // Window dimensions
    const int WINDOW_WIDTH = 600;
    const int WINDOW_HEIGHT = 400;
};
