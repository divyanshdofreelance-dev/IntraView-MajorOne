import { BrowserWindow } from 'electron';
import koffi from 'koffi';

const WDA_EXCLUDEFROMCAPTURE = 0x00000011;

let user32: any = null;
let SetWindowDisplayAffinity: any = null;
let GetLastError: any = null;

try {
  // Load user32 and kernel32
  user32 = koffi.load('user32.dll');
  const kernel32 = koffi.load('kernel32.dll');
  
  // Define SetWindowDisplayAffinity function
  // BOOL SetWindowDisplayAffinity(HWND hWnd, DWORD dwAffinity);
  SetWindowDisplayAffinity = user32.func('SetWindowDisplayAffinity', 'int', ['uintptr_t', 'uint32']);
  
  // Get error code helper
  GetLastError = kernel32.func('GetLastError', 'uint32', []);
  
  console.log('[Capture Exclusion] Native module loaded successfully');
} catch (error: any) {
  console.warn('[Capture Exclusion] Failed to load native module:', error.message);
}

export function excludeWindowFromCapture(window: BrowserWindow): boolean {
  if (!SetWindowDisplayAffinity) {
    console.warn('[Capture Exclusion] SetWindowDisplayAffinity not available');
    return false;
  }

  try {
    // Get native window handle
    const hwndBuffer = window.getNativeWindowHandle();
    
    if (!hwndBuffer || hwndBuffer.length === 0) {
      console.warn('[Capture Exclusion] Failed to get window handle');
      return false;
    }

    // Convert buffer to integer pointer value
    const hwnd = hwndBuffer.length === 8 
      ? Number(hwndBuffer.readBigUInt64LE(0))
      : hwndBuffer.readUInt32LE(0);
    
    console.log('[Capture Exclusion] Setting WDA_EXCLUDEFROMCAPTURE on window');
    console.log('[Capture Exclusion] HWND:', '0x' + hwnd.toString(16));
    
    // Call SetWindowDisplayAffinity
    const result = SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
    
    if (result !== 0) {
      console.log('[Capture Exclusion] ✅ Window excluded from screen capture successfully!');
      return true;
    } else {
      const lastError = GetLastError ? GetLastError() : 'unknown';
      console.warn('[Capture Exclusion] ❌ SetWindowDisplayAffinity failed. Last error:', lastError);
      return false;
    }
  } catch (error: any) {
    console.error('[Capture Exclusion] Error setting window affinity:', error.message);
    return false;
  }
}
