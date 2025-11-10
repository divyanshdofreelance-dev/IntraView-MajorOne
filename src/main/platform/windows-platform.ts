import { BrowserWindow } from 'electron';
import { IPlatformHelper, CaptureTestResult } from './platform-helper';

// Windows-specific capture exclusion using native APIs
export class WindowsPlatform implements IPlatformHelper {
  private WDA_EXCLUDEFROMCAPTURE = 0x00000011;

  applyCaptureExclusion(window: BrowserWindow): void {
    try {
      // Method 1: SetWindowDisplayAffinity
      // This requires a native addon, so we'll document it for now
      console.log('[Windows] Applying capture exclusion settings...');

      // Get the native window handle
      const nativeHandle = window.getNativeWindowHandle();
      
      // Note: In production, you would call a native addon here:
      // const { setWindowDisplayAffinity } = require('../../native/windows');
      // setWindowDisplayAffinity(nativeHandle, this.WDA_EXCLUDEFROMCAPTURE);

      // Method 2: Layered window with transparency
      // This is automatically handled by Electron's transparent: true option
      
      // Method 3: Set window to be always on top with specific styles
      window.setAlwaysOnTop(true, 'screen-saver');
      
      // Additional Windows-specific optimizations
      window.setSkipTaskbar(false); // Keep visible in taskbar per requirements
      
      console.log('[Windows] Capture exclusion applied (native module required for full support)');
    } catch (error) {
      console.error('[Windows] Failed to apply capture exclusion:', error);
    }
  }

  async testCaptureExclusion(window: BrowserWindow): Promise<CaptureTestResult> {
    // In a real implementation, this would:
    // 1. Take a screenshot using Windows capture APIs
    // 2. Analyze if the overlay window appears in the capture
    // 3. Return detailed results

    return {
      supported: true,
      method: 'SetWindowDisplayAffinity + Layered Window',
      confidence: 'medium',
      warnings: [
        'Native addon not yet implemented - capture exclusion may not work with all applications',
        'Some screen recording software may still capture the overlay',
      ],
      recommendations: [
        'Install the native Windows addon for full SetWindowDisplayAffinity support',
        'When sharing, prefer "Application Window" sharing over "Entire Screen"',
        'Test with your specific meeting platform (Teams, Zoom, Meet)',
      ],
    };
  }

  isCaptureExclusionSupported(): boolean {
    // Windows 10+ supports SetWindowDisplayAffinity
    const version = process.getSystemVersion();
    const majorVersion = parseInt(version.split('.')[0]);
    return majorVersion >= 10;
  }
}
