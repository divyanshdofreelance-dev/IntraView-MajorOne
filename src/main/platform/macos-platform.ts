import { BrowserWindow } from 'electron';
import { IPlatformHelper, CaptureTestResult } from './platform-helper';

// macOS-specific capture exclusion using Cocoa APIs
export class MacOSPlatform implements IPlatformHelper {
  applyCaptureExclusion(window: BrowserWindow): void {
    try {
      console.log('[macOS] Applying capture exclusion settings...');

      // Method 1: Set window level to floating
      // This puts the window above most other windows
      window.setAlwaysOnTop(true, 'floating');
      
      // Method 2: Use vibrancy for transparency effects
      // This is already handled by Electron's transparent: true
      
      // Note: macOS doesn't have a built-in API to exclude windows from capture
      // The best approach is to use NSWindow levels and rely on user guidance
      // to share specific application windows rather than entire screens
      
      // In production, you would use a native addon:
      // const { setWindowLevel } = require('../../native/macos');
      // setWindowLevel(window, NSPopUpMenuWindowLevel);
      
      console.log('[macOS] Window level set to floating (limited capture exclusion)');
    } catch (error) {
      console.error('[macOS] Failed to apply capture exclusion:', error);
    }
  }

  async testCaptureExclusion(window: BrowserWindow): Promise<CaptureTestResult> {
    // macOS capture exclusion is limited
    // Screen Capture Kit (macOS 12.3+) could potentially be used for testing
    
    return {
      supported: false,
      method: 'NSWindow Level (Partial)',
      confidence: 'low',
      warnings: [
        'macOS does not provide reliable API for excluding windows from screen capture',
        'Full screen captures will always include overlay windows',
        'Some meeting platforms may still capture the overlay',
      ],
      recommendations: [
        'Instruct users to share specific application windows instead of entire screen',
        'Use "Share Application Window" feature in meeting platforms',
        'Consider using the overlay on a secondary display that is not shared',
        'macOS 12.3+ Screen Capture Kit may offer better control in future updates',
      ],
    };
  }

  isCaptureExclusionSupported(): boolean {
    // macOS has limited support - always return false for full exclusion
    // We can provide partial support through window levels
    return false;
  }
}
