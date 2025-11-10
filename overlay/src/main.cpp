#include "OverlayWindow.h"
#include "IPCManager.h"
#include <iostream>
#include <windows.h>

int main() {
    // Initialize COM
    CoInitialize(nullptr);

    // Create overlay window
    OverlayWindow overlay;
    
    if (!overlay.Initialize()) {
        std::cerr << "Failed to initialize overlay window" << std::endl;
        CoUninitialize();
        return 1;
    }

    std::wcout << L"IntraView Overlay Started" << std::endl;

    // Create IPC manager
    IPCManager ipc;
    
    // Start listening for commands
    ipc.Start([&overlay](const std::wstring& message) {
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

    // Run message loop
    overlay.Run();

    // Cleanup
    ipc.Stop();
    overlay.Shutdown();
    CoUninitialize();

    return 0;
}
