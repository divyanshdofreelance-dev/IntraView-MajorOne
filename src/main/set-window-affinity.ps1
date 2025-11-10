# PowerShell script to set WDA_EXCLUDEFROMCAPTURE on a window
param (
    [Parameter(Mandatory=$true)]
    [int]$ProcessId,
    [string]$WindowTitle = "AI Chat"
)

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;

public class WindowAffinity {
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);
    
    [DllImport("user32.dll")]
    public static extern bool SetWindowDisplayAffinity(IntPtr hwnd, uint dwAffinity);
    
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    
    public const uint WDA_NONE = 0x00000000;
    public const uint WDA_MONITOR = 0x00000001;
    public const uint WDA_EXCLUDEFROMCAPTURE = 0x00000011;
    
    public static IntPtr FindWindowByProcessId(uint processId) {
        IntPtr foundWindow = IntPtr.Zero;
        
        EnumWindows(delegate(IntPtr hWnd, IntPtr lParam) {
            uint windowProcessId;
            GetWindowThreadProcessId(hWnd, out windowProcessId);
            
            if (windowProcessId == processId) {
                foundWindow = hWnd;
                return false; // Stop enumeration
            }
            return true; // Continue enumeration
        }, IntPtr.Zero);
        
        return foundWindow;
    }
}
"@

try {
    Write-Host "Looking for window with process ID: $ProcessId"
    
    # Wait a bit for window to be created
    Start-Sleep -Milliseconds 2000
    
    # Find window by process ID
    $hwnd = [WindowAffinity]::FindWindowByProcessId($ProcessId)
    
    if ($hwnd -eq [IntPtr]::Zero) {
        Write-Host "Window not found for process $ProcessId"
        exit 1
    }
    
    Write-Host "Found window handle: $hwnd"
    
    # Set WDA_EXCLUDEFROMCAPTURE
    $result = [WindowAffinity]::SetWindowDisplayAffinity($hwnd, [WindowAffinity]::WDA_EXCLUDEFROMCAPTURE)
    
    if ($result) {
        Write-Host "Successfully set WDA_EXCLUDEFROMCAPTURE on window"
        exit 0
    } else {
        Write-Host "Failed to set window affinity"
        exit 1
    }
} catch {
    Write-Host "Error: $_"
    exit 1
}
