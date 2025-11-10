#pragma once
#include <string>
#include <functional>
#include <thread>
#include <atomic>

class IPCManager {
public:
    using MessageCallback = std::function<void(const std::wstring&)>;

    IPCManager();
    ~IPCManager();

    void Start(MessageCallback callback);
    void Stop();

private:
    void ListenLoop();
    std::wstring ReadLine();

    MessageCallback callback_;
    std::atomic<bool> running_;
    std::thread listenerThread_;
};
