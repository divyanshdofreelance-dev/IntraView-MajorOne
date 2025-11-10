import { BrowserWindow } from 'electron';
import { WindowsPlatform } from './windows-platform';
import { MacOSPlatform } from './macos-platform';

export interface IPlatformHelper {
  applyCaptureExclusion(window: BrowserWindow): void;
  testCaptureExclusion(window: BrowserWindow): Promise<CaptureTestResult>;
  isCaptureExclusionSupported(): boolean;
}

export interface CaptureTestResult {
  supported: boolean;
  method: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  warnings: string[];
  recommendations: string[];
}

export class PlatformHelper implements IPlatformHelper {
  private platformImpl: IPlatformHelper;

  constructor() {
    switch (process.platform) {
      case 'win32':
        this.platformImpl = new WindowsPlatform();
        break;
      case 'darwin':
        this.platformImpl = new MacOSPlatform();
        break;
      default:
        // Fallback for unsupported platforms
        this.platformImpl = {
          applyCaptureExclusion: () => {
            console.warn('Capture exclusion not supported on this platform');
          },
          testCaptureExclusion: async () => ({
            supported: false,
            method: 'none',
            confidence: 'none',
            warnings: ['Platform not supported'],
            recommendations: ['Use Windows or macOS for capture exclusion features'],
          }),
          isCaptureExclusionSupported: () => false,
        };
    }
  }

  applyCaptureExclusion(window: BrowserWindow): void {
    this.platformImpl.applyCaptureExclusion(window);
  }

  async testCaptureExclusion(window: BrowserWindow): Promise<CaptureTestResult> {
    return await this.platformImpl.testCaptureExclusion(window);
  }

  isCaptureExclusionSupported(): boolean {
    return this.platformImpl.isCaptureExclusionSupported();
  }
}
