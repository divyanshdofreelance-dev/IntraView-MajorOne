import { desktopCapturer, screen } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface ScreenshotOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fullScreen?: boolean;
}

export class ScreenshotService {
  /**
   * Capture a screenshot of the entire screen or a specific area
   */
  async captureScreen(options: ScreenshotOptions = {}): Promise<string> {
    const { fullScreen = true, x = 0, y = 0, width, height } = options;

    try {
      // Get all available sources
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });

      if (sources.length === 0) {
        throw new Error('No screen sources available');
      }

      // Use the primary display
      const primarySource = sources[0];
      
      // Get screen dimensions
      const primaryDisplay = screen.getPrimaryDisplay();
      const screenWidth = primaryDisplay.size.width;
      const screenHeight = primaryDisplay.size.height;

      // Determine capture area
      const captureWidth = width || screenWidth;
      const captureHeight = height || screenHeight;
      const captureX = x;
      const captureY = y;

      // Create a temporary file path
      const tempDir = app.getPath('temp');
      const timestamp = Date.now();
      const screenshotPath = path.join(tempDir, `screenshot-${timestamp}.png`);

      // For full screen, we can use the thumbnail directly
      // For area selection, we need to crop the image
      const image = primarySource.thumbnail;
      
      if (!image) {
        throw new Error('Failed to capture screen image');
      }

      // Convert NativeImage to PNG buffer
      const pngBuffer = image.toPNG();
      
      // If we need to crop (area selection), we'll do it with a canvas-like approach
      // For now, save the full screenshot
      // Note: For area cropping, we'd need to use a library like 'sharp' or 'jimp'
      // For simplicity, we'll capture full screen and crop later if needed
      
      fs.writeFileSync(screenshotPath, pngBuffer);
      
      console.log(`[Screenshot] Captured to: ${screenshotPath}`);
      return screenshotPath;
    } catch (error: any) {
      console.error('[Screenshot] Error capturing screen:', error);
      throw new Error(`Failed to capture screenshot: ${error.message}`);
    }
  }

  /**
   * Capture a specific area of the screen
   */
  async captureArea(x: number, y: number, width: number, height: number): Promise<string> {
    return this.captureScreen({
      fullScreen: false,
      x,
      y,
      width,
      height
    });
  }

  /**
   * Clean up temporary screenshot files
   */
  cleanup(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Screenshot] Cleaned up: ${filePath}`);
      }
    } catch (error: any) {
      console.warn(`[Screenshot] Failed to cleanup ${filePath}:`, error.message);
    }
  }
}

