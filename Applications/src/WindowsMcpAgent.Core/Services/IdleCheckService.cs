using System;
using System.Runtime.InteropServices;

namespace WindowsMcpAgent.Core.Services;

/// <summary>
/// Checks if Windows system is idle (no user input)
/// </summary>
public class IdleCheckService : IIdleCheckService
{
    [DllImport("user32.dll")]
    private static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

    [StructLayout(LayoutKind.Sequential)]
    private struct LASTINPUTINFO
    {
        public uint cbSize;
        public uint dwTime;
    }

    public bool IsSystemIdle(int idleThresholdSeconds = 300)
    {
        var idleTime = GetIdleTimeSeconds();
        return idleTime >= idleThresholdSeconds;
    }

    public int GetIdleTimeSeconds()
    {
        var lastInputInfo = new LASTINPUTINFO
        {
            cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO))
        };

        if (!GetLastInputInfo(ref lastInputInfo))
        {
            return 0;
        }

        var lastInputTime = lastInputInfo.dwTime;
        var currentTime = (uint)Environment.TickCount;
        var idleTime = (currentTime - lastInputTime) / 1000; // Convert to seconds

        return (int)idleTime;
    }
}


