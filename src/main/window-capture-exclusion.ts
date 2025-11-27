import { BrowserWindow } from 'electron';
import koffi from 'koffi';

const WDA_EXCLUDEFROMCAPTURE = 0x00000011;
const GWL_EXSTYLE = -20; // Extended window style index
const GWL_HWNDPARENT = -8; // Window parent handle index
const WS_EX_TOOLWINDOW = 0x00000080; // Tool window style (moves to Background processes)
const WS_EX_APPWINDOW = 0x00040000; // App window style (shows in Apps - we want to remove this)
const SWP_NOMOVE = 0x0002;
const SWP_NOSIZE = 0x0001;
const SWP_NOZORDER = 0x0004;
const SWP_FRAMECHANGED = 0x0020;
const SWP_SHOWWINDOW = 0x0040;

let user32: any = null;
let SetWindowDisplayAffinity: any = null;
let GetWindowLongPtrW: any = null;
let SetWindowLongPtrW: any = null;
let SetWindowPos: any = null;
let SetParent: any = null;
let GetLastError: any = null;

try {
  // Load user32 and kernel32
  user32 = koffi.load('user32.dll');
  const kernel32 = koffi.load('kernel32.dll');
  
  // Define SetWindowDisplayAffinity function
  // BOOL SetWindowDisplayAffinity(HWND hWnd, DWORD dwAffinity);
  SetWindowDisplayAffinity = user32.func('SetWindowDisplayAffinity', 'int', ['uintptr_t', 'uint32']);
  
  // Define GetWindowLongPtrW function (for 64-bit)
  // LONG_PTR GetWindowLongPtrW(HWND hWnd, int nIndex);
  GetWindowLongPtrW = user32.func('GetWindowLongPtrW', 'int64', ['uintptr_t', 'int32']);
  
  // Define SetWindowLongPtrW function (for 64-bit)
  // LONG_PTR SetWindowLongPtrW(HWND hWnd, int nIndex, LONG_PTR dwNewLong);
  SetWindowLongPtrW = user32.func('SetWindowLongPtrW', 'int64', ['uintptr_t', 'int32', 'int64']);
  
  // Define SetWindowPos function to force window style update
  // BOOL SetWindowPos(HWND hWnd, HWND hWndInsertAfter, int X, int Y, int cx, int cy, UINT uFlags);
  SetWindowPos = user32.func('SetWindowPos', 'int', ['uintptr_t', 'uintptr_t', 'int32', 'int32', 'int32', 'int32', 'uint32']);
  
  // Define SetParent function to remove window parent (makes it appear in Background processes)
  // HWND SetParent(HWND hWndChild, HWND hWndNewParent);
  SetParent = user32.func('SetParent', 'uintptr_t', ['uintptr_t', 'uintptr_t']);
  
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

export function hideWindowFromTaskManager(window: BrowserWindow): boolean {
  if (process.platform !== 'win32') {
    return false;
  }

  if (!GetWindowLongPtrW || !SetWindowLongPtrW || !SetWindowPos || !SetParent) {
    console.warn('[Task Manager Hide] Required Windows API functions not available');
    return false;
  }

  try {
    // Get native window handle
    const hwndBuffer = window.getNativeWindowHandle();
    
    if (!hwndBuffer || hwndBuffer.length === 0) {
      console.warn('[Task Manager Hide] Failed to get window handle');
      return false;
    }

    // Convert buffer to integer pointer value
    const hwnd = hwndBuffer.length === 8 
      ? Number(hwndBuffer.readBigUInt64LE(0))
      : hwndBuffer.readUInt32LE(0);
    
    console.log('[Task Manager Hide] Moving window to Background processes');
    console.log('[Task Manager Hide] HWND:', '0x' + hwnd.toString(16));
    
    // Hide the window first (required for style changes to take effect)
    const wasVisible = window.isVisible();
    if (wasVisible) {
      window.hide();
    }
    
    // Step 1: Remove parent window (set to NULL/0) - this helps move it to Background processes
    const oldParent = SetParent(hwnd, 0);
    console.log('[Task Manager Hide] Removed parent window, old parent:', '0x' + (oldParent ? oldParent.toString(16) : 'NULL'));
    
    // Step 2: Get current extended window style
    const currentStyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
    console.log('[Task Manager Hide] Current style:', '0x' + currentStyle.toString(16));
    
    // Step 3: Remove WS_EX_APPWINDOW (which makes it show in Apps section)
    // Add WS_EX_TOOLWINDOW (which moves it to Background processes)
    const newStyle = (currentStyle & ~WS_EX_APPWINDOW) | WS_EX_TOOLWINDOW;
    console.log('[Task Manager Hide] New style:', '0x' + newStyle.toString(16));
    
    // Step 4: Set the new extended window style
    SetWindowLongPtrW(hwnd, GWL_EXSTYLE, newStyle);
    
    // Step 5: Also set parent via GWL_HWNDPARENT to ensure it's NULL
    SetWindowLongPtrW(hwnd, GWL_HWNDPARENT, 0);
    
    // Step 6: Force Windows to recognize the style change
    // Use SetWindowPos with SWP_FRAMECHANGED to apply the extended style
    SetWindowPos(
      hwnd,
      0, // hWndInsertAfter
      0, // X
      0, // Y
      0, // cx
      0, // cy
      SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED
    );
    
    // Show the window again if it was visible
    if (wasVisible) {
      window.show();
    }
    
    // Verify the style was actually applied by reading it back
    const verifyStyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
    console.log('[Task Manager Hide] Verified style:', '0x' + verifyStyle.toString(16));
    
    if ((verifyStyle & WS_EX_TOOLWINDOW) !== 0 && (verifyStyle & WS_EX_APPWINDOW) === 0) {
      console.log('[Task Manager Hide] ✅ Window moved to Background processes successfully!');
      return true;
    } else {
      console.warn('[Task Manager Hide] ⚠️ Style verification failed - window may still appear in Apps section');
      console.warn('[Task Manager Hide] WS_EX_TOOLWINDOW:', (verifyStyle & WS_EX_TOOLWINDOW) !== 0);
      console.warn('[Task Manager Hide] WS_EX_APPWINDOW:', (verifyStyle & WS_EX_APPWINDOW) !== 0);
      return false;
    }
  } catch (error: any) {
    console.error('[Task Manager Hide] Error setting window style:', error.message);
    return false;
  }
}
