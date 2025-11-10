using System;
using System.Runtime.InteropServices;

class SetWindowAffinity
{
    [DllImport("user32.dll")]
    static extern bool SetWindowDisplayAffinity(IntPtr hwnd, uint affinity);
    
    const uint WDA_EXCLUDEFROMCAPTURE = 0x00000011;
    
    static int Main(string[] args)
    {
        if (args.Length != 1)
        {
            Console.WriteLine("Usage: SetWindowAffinity <window_handle>");
            return 1;
        }
        
        try
        {
            IntPtr hwnd = new IntPtr(long.Parse(args[0]));
            bool result = SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
            
            Console.WriteLine(result ? "SUCCESS" : "FAILED");
            return result ? 0 : 1;
        }
        catch (Exception ex)
        {
            Console.WriteLine("ERROR: " + ex.Message);
            return 1;
        }
    }
}
