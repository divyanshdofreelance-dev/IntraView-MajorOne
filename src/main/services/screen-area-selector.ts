import { BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';

export interface SelectedArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ScreenAreaSelector {
  private selectorWindow: BrowserWindow | null = null;
  private resolveCallback: ((area: SelectedArea | null) => void) | null = null;

  /**
   * Show area selector overlay and wait for user selection
   */
  async selectArea(): Promise<SelectedArea | null> {
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
      
      const displays = screen.getAllDisplays();
      
      // Find the bounds of all displays combined
      let minX = 0, minY = 0, maxX = 0, maxY = 0;
      displays.forEach(display => {
        const bounds = display.bounds;
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      });

      // Create a full-screen transparent window for selection
      this.selectorWindow = new BrowserWindow({
        width: maxX - minX,
        height: maxY - minY,
        x: minX,
        y: minY,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        focusable: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, '../preload/preload.js'),
        },
        backgroundColor: '#00000000',
      });

      // Create HTML content for the selector
      const selectorHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              width: 100vw;
              height: 100vh;
              background: rgba(0, 0, 0, 0.3);
              cursor: crosshair;
              overflow: hidden;
            }
            #selection-box {
              position: absolute;
              border: 2px dashed #00ff00;
              background: rgba(0, 255, 0, 0.1);
              pointer-events: none;
              display: none;
            }
            #instructions {
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(0, 0, 0, 0.8);
              color: white;
              padding: 10px 20px;
              border-radius: 5px;
              font-family: Arial, sans-serif;
              font-size: 14px;
              z-index: 1000;
            }
          </style>
        </head>
        <body>
          <div id="instructions">Click and drag to select area. Press ESC to cancel.</div>
          <div id="selection-box"></div>
          <script>
            const { ipcRenderer } = require('electron');
            const selectionBox = document.getElementById('selection-box');
            const instructions = document.getElementById('instructions');
            let startX = 0, startY = 0;
            let isSelecting = false;

            document.addEventListener('mousedown', (e) => {
              startX = e.clientX;
              startY = e.clientY;
              isSelecting = true;
              selectionBox.style.display = 'block';
              selectionBox.style.left = startX + 'px';
              selectionBox.style.top = startY + 'px';
              selectionBox.style.width = '0px';
              selectionBox.style.height = '0px';
              instructions.style.display = 'none';
            });

            document.addEventListener('mousemove', (e) => {
              if (!isSelecting) return;
              
              const width = Math.abs(e.clientX - startX);
              const height = Math.abs(e.clientY - startY);
              const left = Math.min(e.clientX, startX);
              const top = Math.min(e.clientY, startY);
              
              selectionBox.style.left = left + 'px';
              selectionBox.style.top = top + 'px';
              selectionBox.style.width = width + 'px';
              selectionBox.style.height = height + 'px';
            });

            document.addEventListener('mouseup', (e) => {
              if (!isSelecting) return;
              isSelecting = false;
              
              const width = Math.abs(e.clientX - startX);
              const height = Math.abs(e.clientY - startY);
              
              if (width > 10 && height > 10) {
                const left = Math.min(e.clientX, startX);
                const top = Math.min(e.clientY, startY);
                
                // Send relative coordinates - we'll add window position in main process
                ipcRenderer.send('screenshot:area-selected', {
                  x: left,
                  y: top,
                  width: width,
                  height: height
                });
              }
            });

            document.addEventListener('keydown', (e) => {
              if (e.key === 'Escape') {
                ipcRenderer.send('screenshot:area-selected', null);
              }
            });
          </script>
        </body>
        </html>
      `;

      this.selectorWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(selectorHTML)}`);

      // Focus the window when ready so ESC key works
      this.selectorWindow.once('ready-to-show', () => {
        if (this.selectorWindow && !this.selectorWindow.isDestroyed()) {
          this.selectorWindow.focus();
          this.selectorWindow.show();
        }
      });

      // Handle area selection via IPC
      const handler = (_event: any, relativeArea: SelectedArea | null) => {
        this.close();
        ipcMain.removeListener('screenshot:area-selected', handler);
        
        if (relativeArea && this.selectorWindow) {
          // Convert relative coordinates to screen coordinates
          const bounds = this.selectorWindow.getBounds();
          const screenArea: SelectedArea = {
            x: relativeArea.x + bounds.x,
            y: relativeArea.y + bounds.y,
            width: relativeArea.width,
            height: relativeArea.height
          };
          
          if (this.resolveCallback) {
            this.resolveCallback(screenArea);
            this.resolveCallback = null;
          }
        } else if (this.resolveCallback) {
          this.resolveCallback(null);
          this.resolveCallback = null;
        }
      };
      
      ipcMain.once('screenshot:area-selected', handler);

      this.selectorWindow.on('closed', () => {
        ipcMain.removeListener('screenshot:area-selected', handler);
        if (this.resolveCallback) {
          this.resolveCallback(null);
          this.resolveCallback = null;
        }
      });
    });
  }

  /**
   * Close the selector window
   */
  close(): void {
    if (this.selectorWindow && !this.selectorWindow.isDestroyed()) {
      this.selectorWindow.close();
      this.selectorWindow = null;
    }
  }
}

