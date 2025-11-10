#include "IPCManager.h"
#include <iostream>
#include <windows.h>

IPCManager::IPCManager() : running_(false) {
}

IPCManager::~IPCManager() {
    Stop();
}

void IPCManager::Start(MessageCallback callback) {
    callback_ = callback;
    running_ = true;
    listenerThread_ = std::thread(&IPCManager::ListenLoop, this);
}

void IPCManager::Stop() {
    running_ = false;
    if (listenerThread_.joinable()) {
        listenerThread_.join();
    }
}

void IPCManager::ListenLoop() {
    while (running_) {
        std::wstring line = ReadLine();
        if (!line.empty() && callback_) {
            callback_(line);
        }
    }
}

std::wstring IPCManager::ReadLine() {
    std::string line;
    
    if (!std::getline(std::cin, line)) {
        running_ = false;
        return L"";
    }

    // Convert UTF-8 to wide string
    int size_needed = MultiByteToWideChar(CP_UTF8, 0, line.c_str(), (int)line.size(), NULL, 0);
    std::wstring wstrTo(size_needed, 0);
    MultiByteToWideChar(CP_UTF8, 0, line.c_str(), (int)line.size(), &wstrTo[0], size_needed);
    
    return wstrTo;
}
