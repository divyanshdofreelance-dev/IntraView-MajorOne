import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

export class OverlayManager {
  private overlayProcess: ChildProcess | null = null;
  private overlayReady: boolean = false;

  constructor() {}

  private getOverlayPath(): string {
    // Check if running in packaged app (production)
    if (app.isPackaged) {
      // In packaged app, overlay is in resources/overlay/
      return path.join(process.resourcesPath, 'overlay', 'IntraViewOverlay.exe');
    } else {
      // In development, use the build output
      return path.join(
        app.getAppPath(),
        'overlay',
        'build',
        'bin',
        'Release',
        'IntraViewOverlay.exe'
      );
    }
  }

  start(): Promise<boolean> {
    return new Promise((resolve) => {
      const overlayPath = this.getOverlayPath();

      // Check if overlay executable exists
      if (!fs.existsSync(overlayPath)) {
        console.error('[Overlay] Executable not found at:', overlayPath);
        console.error('[Overlay] Please build the overlay first: npm run build:overlay');
        resolve(false);
        return;
      }

      console.log('[Overlay] Starting overlay process:', overlayPath);

      // Spawn overlay process
      this.overlayProcess = spawn(overlayPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!this.overlayProcess.stdin || !this.overlayProcess.stdout) {
        console.error('[Overlay] Failed to create stdio pipes');
        resolve(false);
        return;
      }

      // Listen for output
      this.overlayProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log('[Overlay Output]:', output);
        
        if (output.includes('Started')) {
          this.overlayReady = true;
          resolve(true);
        }
      });

      this.overlayProcess.stderr?.on('data', (data) => {
        console.error('[Overlay Error]:', data.toString());
      });

      this.overlayProcess.on('error', (error) => {
        console.error('[Overlay] Process error:', error);
        resolve(false);
      });

      this.overlayProcess.on('exit', (code) => {
        console.log('[Overlay] Process exited with code:', code);
        this.overlayReady = false;
        this.overlayProcess = null;
      });

      // Timeout
      setTimeout(() => {
        if (!this.overlayReady) {
          console.warn('[Overlay] Startup timeout');
          resolve(false);
        }
      }, 5000);
    });
  }

  sendMessage(message: string): boolean {
    if (!this.overlayProcess || !this.overlayProcess.stdin || !this.overlayReady) {
      console.warn('[Overlay] Not ready to send messages');
      return false;
    }

    try {
      this.overlayProcess.stdin.write(message + '\n');
      return true;
    } catch (error) {
      console.error('[Overlay] Failed to send message:', error);
      return false;
    }
  }

  toggle(): boolean {
    return this.sendMessage('toggle');
  }

  show(): boolean {
    return this.sendMessage('show');
  }

  hide(): boolean {
    return this.sendMessage('hide');
  }

  updateText(text: string): boolean {
    return this.sendMessage(text);
  }

  stop(): void {
    if (this.overlayProcess) {
      console.log('[Overlay] Stopping overlay process');
      this.sendMessage('exit');
      
      // Force kill after 2 seconds if not exited
      setTimeout(() => {
        if (this.overlayProcess && !this.overlayProcess.killed) {
          this.overlayProcess.kill();
        }
      }, 2000);
    }
  }

  isReady(): boolean {
    return this.overlayReady;
  }
}
