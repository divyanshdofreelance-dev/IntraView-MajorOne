"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use ipcRenderer
// without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Transcription
    transcription: {
        start: () => electron_1.ipcRenderer.invoke('transcription:start'),
        stop: () => electron_1.ipcRenderer.invoke('transcription:stop'),
        clear: () => electron_1.ipcRenderer.invoke('transcription:clear'),
        onUpdate: (callback) => {
            electron_1.ipcRenderer.on('transcription:update', (_, data) => callback(data));
        },
    },
    // Audio
    audio: {
        getLevel: () => electron_1.ipcRenderer.invoke('audio:get-level'),
        setMute: (muted) => electron_1.ipcRenderer.invoke('audio:set-mute', muted),
        getDevices: () => electron_1.ipcRenderer.invoke('audio:get-devices'),
        setDevice: (deviceId) => electron_1.ipcRenderer.invoke('audio:set-device', deviceId),
    },
    // Settings
    settings: {
        get: (key) => electron_1.ipcRenderer.invoke('settings:get', key),
        set: (key, value) => electron_1.ipcRenderer.invoke('settings:set', key, value),
        getAll: () => electron_1.ipcRenderer.invoke('settings:get-all'),
    },
    // Platform
    platform: {
        getInfo: () => electron_1.ipcRenderer.invoke('platform:get-info'),
    },
    // Window controls
    window: {
        minimize: () => electron_1.ipcRenderer.invoke('window:minimize'),
        hide: () => electron_1.ipcRenderer.invoke('window:hide'),
        setOpacity: (opacity) => electron_1.ipcRenderer.invoke('window:set-opacity', opacity),
        setAlwaysOnTop: (alwaysOnTop) => electron_1.ipcRenderer.invoke('window:set-always-on-top', alwaysOnTop),
    },
    // Capture test
    onCaptureTestResult: (callback) => {
        electron_1.ipcRenderer.on('capture-test-result', (_, result) => callback(result));
    },
});
//# sourceMappingURL=preload.js.map