import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

/**
 * Sets WDA_EXCLUDEFROMCAPTURE flag on a window to prevent screen capture
 * Uses a compiled C# helper executable
 */
export async function setWindowDisplayAffinity(windowHandle: Buffer): Promise<boolean> {
  try {
    // Get window handle as decimal number
    const hwnd = windowHandle.readBigInt64LE(0);
    const hwndStr = hwnd.toString();
    
    console.log('[WindowAffinity] Window handle:', hwndStr);
    
    // Path to C# source and executable
    const csPath = path.join(__dirname, 'SetWindowAffinity.cs');
    const exePath = path.join(__dirname, 'SetWindowAffinity.exe');
    
    // Check if executable exists, if not compile it
    if (!fs.existsSync(exePath)) {
      console.log('[WindowAffinity] Compiling helper executable...');
      
      // Find csc.exe (C# compiler)
      const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
      
      if (!fs.existsSync(cscPath)) {
        console.error('[WindowAffinity] C# compiler not found');
        return false;
      }
      
      // Compile the C# file
      await execAsync(`"${cscPath}" /out:"${exePath}" "${csPath}"`);
      console.log('[WindowAffinity] Helper executable compiled');
    }
    
    // Execute the helper
    const { stdout } = await execAsync(`"${exePath}" ${hwndStr}`);
    const result = stdout.trim() === 'SUCCESS';
    
    console.log('[WindowAffinity] SetWindowDisplayAffinity result:', result);
    return result;
    
  } catch (error) {
    console.error('[WindowAffinity] Error:', error);
    return false;
  }
}

