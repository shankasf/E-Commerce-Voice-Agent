using System;
using System.Linq;
using System.Management;
using System.Net;
using System.Net.Http;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace WindowsApp.Services;

// Service to retrieve comprehensive device information for registration
// Collects hardware, OS, network, and system details automatically
public class DeviceInformationService
{
    // Retrieves raw BIOS serial number without hashing
    // Used for authentication with backend - sends plain serial number
    public string GetBiosSerialNumber()
    {
        try
        {
            // Query Win32_BIOS for BIOS serial number
            // This is the actual serial number visible in system info
            using var searcher = new ManagementObjectSearcher("SELECT SerialNumber FROM Win32_BIOS");
            foreach (ManagementObject obj in searcher.Get())
            {
                var serial = obj["SerialNumber"]?.ToString()?.Trim();
                if (!string.IsNullOrEmpty(serial))
                {
                    return serial;
                }
            }
        }
        catch
        {
            // Fall through to fallback
        }

        // Fallback: Return machine name if BIOS serial unavailable
        return Environment.MachineName;
    }

    // Retrieves unique device identifier using motherboard serial number
    // Fallback to machine name + processor ID if serial unavailable
    // Note: This returns a HASHED value for privacy
    public string GetDeviceId()
    {
        try
        {
            // Query Win32_BaseBoard for motherboard serial number as primary device ID
            // This remains constant even if OS is reinstalled
            using var searcher = new ManagementObjectSearcher("SELECT SerialNumber FROM Win32_BaseBoard");
            foreach (ManagementObject obj in searcher.Get())
            {
                var serial = obj["SerialNumber"]?.ToString()?.Trim();
                if (!string.IsNullOrEmpty(serial))
                {
                    // Hash the serial number for privacy and consistent length
                    return HashString(serial);
                }
            }
        }
        catch
        {
            // Fall through to backup method if WMI query fails
        }

        // Fallback: Use combination of machine name and processor ID
        // Less reliable but works when WMI is unavailable
        return HashString($"{Environment.MachineName}_{GetProcessorName()}");
    }

    // Retrieves user-friendly device name (computer name)
    public string GetDeviceName()
    {
        return Environment.MachineName;
    }

    // Retrieves Windows OS version with edition information
    public string GetOsVersion()
    {
        try
        {
            // Query Win32_OperatingSystem for detailed OS information
            using var searcher = new ManagementObjectSearcher("SELECT Caption, Version FROM Win32_OperatingSystem");
            foreach (ManagementObject obj in searcher.Get())
            {
                var caption = obj["Caption"]?.ToString() ?? "Windows";
                var version = obj["Version"]?.ToString() ?? "";
                return $"{caption} ({version})";
            }
        }
        catch
        {
            // Fallback to basic environment version if WMI fails
        }

        return $"Windows {Environment.OSVersion.Version}";
    }

    // Retrieves device manufacturer (e.g., Dell, HP, Lenovo)
    // Uses Win32_ComputerSystem WMI query
    public string GetManufacturer()
    {
        try
        {
            // Query Win32_ComputerSystem for manufacturer information
            using var searcher = new ManagementObjectSearcher("SELECT Manufacturer FROM Win32_ComputerSystem");
            foreach (ManagementObject obj in searcher.Get())
            {
                return obj["Manufacturer"]?.ToString()?.Trim() ?? "Unknown";
            }
        }
        catch
        {
            // Return Unknown if WMI query fails
        }

        return "Unknown";
    }

    // Retrieves device model (e.g., OptiPlex 7090, ThinkPad X1)
    // Uses Win32_ComputerSystem WMI query
    public string GetModel()
    {
        try
        {
            // Query Win32_ComputerSystem for model information
            using var searcher = new ManagementObjectSearcher("SELECT Model FROM Win32_ComputerSystem");
            foreach (ManagementObject obj in searcher.Get())
            {
                return obj["Model"]?.ToString()?.Trim() ?? "Unknown";
            }
        }
        catch
        {
            // Return Unknown if WMI query fails
        }

        return "Unknown";
    }

    // Retrieves network host name (typically same as computer name)
    public string GetHostName()
    {
        return Dns.GetHostName();
    }

    // Retrieves public IP address using external service
    // Uses api.ipify.org for fast, reliable IP detection
    public async Task<string> GetPublicIpAsync()
    {
        try
        {
            // Call external service to get public IP
            // Using ipify API which returns plain text IP address
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
            var response = await client.GetStringAsync("https://api.ipify.org");
            return response.Trim();
        }
        catch
        {
            // Return empty string if service unavailable or timeout
            return string.Empty;
        }
    }

    // Retrieves default gateway IP address
    // Uses NetworkInterface to find active adapter's gateway
    public string GetGateway()
    {
        try
        {
            // Get all network interfaces that are up and not loopback
            var activeInterface = NetworkInterface.GetAllNetworkInterfaces()
                .FirstOrDefault(n => n.OperationalStatus == OperationalStatus.Up
                                  && n.NetworkInterfaceType != NetworkInterfaceType.Loopback);

            if (activeInterface != null)
            {
                // Get gateway addresses from IP properties
                var gateway = activeInterface.GetIPProperties().GatewayAddresses
                    .FirstOrDefault(g => g.Address.AddressFamily == AddressFamily.InterNetwork);

                return gateway?.Address.ToString() ?? string.Empty;
            }
        }
        catch
        {
            // Return empty string if unable to detect gateway
        }

        return string.Empty;
    }

    // Retrieves OS type (Windows, Windows Server, etc.)
    // Determines from OS caption
    public string GetOsType()
    {
        try
        {
            // Query Win32_OperatingSystem for OS caption
            using var searcher = new ManagementObjectSearcher("SELECT Caption FROM Win32_OperatingSystem");
            foreach (ManagementObject obj in searcher.Get())
            {
                var caption = obj["Caption"]?.ToString() ?? "";
                // Check if server OS
                if (caption.Contains("Server", StringComparison.OrdinalIgnoreCase))
                {
                    return "Windows Server";
                }
                return "Windows";
            }
        }
        catch
        {
            // Fallback to Windows
        }

        return "Windows";
    }

    // Retrieves domain or workgroup name
    // Uses Win32_ComputerSystem to get domain information
    public string GetDomain()
    {
        try
        {
            // Query Win32_ComputerSystem for domain/workgroup
            using var searcher = new ManagementObjectSearcher("SELECT Domain FROM Win32_ComputerSystem");
            foreach (ManagementObject obj in searcher.Get())
            {
                return obj["Domain"]?.ToString()?.Trim() ?? "WORKGROUP";
            }
        }
        catch
        {
            // Return WORKGROUP as default
        }

        return "WORKGROUP";
    }

    // Retrieves system uptime in seconds
    // Uses Environment.TickCount64 for accurate uptime calculation
    public long GetSystemUptime()
    {
        try
        {
            // Get milliseconds since system boot, convert to seconds
            // Environment.TickCount64 is 64-bit, won't overflow
            return Environment.TickCount64 / 1000;
        }
        catch
        {
            return 0;
        }
    }

    // Retrieves username of currently logged in user
    // Uses Environment.UserName and Domain
    public string GetLastLoggedInUser()
    {
        try
        {
            // Get domain and username
            var domain = Environment.UserDomainName;
            var username = Environment.UserName;

            // Return in domain\user format if domain exists
            if (!string.IsNullOrEmpty(domain) && domain != username)
            {
                return $"{domain}\\{username}";
            }

            return username;
        }
        catch
        {
            return "Unknown";
        }
    }

    // Retrieves device type (Desktop, Laptop, Server, Tablet)
    // Uses chassis type from Win32_SystemEnclosure
    public string GetDeviceType()
    {
        try
        {
            // Query Win32_SystemEnclosure for chassis type
            // Chassis types: 3=Desktop, 8-10=Laptop, 30=Tablet, 17=Server, etc.
            using var searcher = new ManagementObjectSearcher("SELECT ChassisTypes FROM Win32_SystemEnclosure");
            foreach (ManagementObject obj in searcher.Get())
            {
                var chassisTypes = obj["ChassisTypes"] as ushort[];
                if (chassisTypes != null && chassisTypes.Length > 0)
                {
                    var chassisType = chassisTypes[0];
                    // Map chassis type to device category
                    return chassisType switch
                    {
                        3 or 4 or 5 or 6 or 7 or 15 or 16 => "Desktop",
                        8 or 9 or 10 or 11 or 12 or 14 or 18 or 21 => "Laptop",
                        17 or 23 => "Server",
                        30 or 31 or 32 => "Tablet",
                        _ => "Desktop"
                    };
                }
            }
        }
        catch
        {
            // Default to Desktop if unable to determine
        }

        return "Desktop";
    }

    // Retrieves virtualization type (Physical, Virtual Machine, Container)
    // Checks manufacturer and model for VM indicators
    public string GetVirtualizationType()
    {
        try
        {
            var manufacturer = GetManufacturer().ToLower();
            var model = GetModel().ToLower();

            // Check for common VM indicators in manufacturer or model
            if (manufacturer.Contains("vmware") || model.Contains("vmware"))
                return "Virtual - VMware";
            if (manufacturer.Contains("microsoft") && model.Contains("virtual"))
                return "Virtual - Hyper-V";
            if (manufacturer.Contains("xen") || model.Contains("xen"))
                return "Virtual - Xen";
            if (manufacturer.Contains("kvm") || model.Contains("kvm"))
                return "Virtual - KVM";
            if (manufacturer.Contains("qemu") || model.Contains("qemu"))
                return "Virtual - QEMU";
            if (manufacturer.Contains("virtualbox") || model.Contains("virtualbox"))
                return "Virtual - VirtualBox";

            // If no VM detected, assume physical
            return "Physical";
        }
        catch
        {
            return "Physical";
        }
    }

    // Retrieves primary local IP address
    // Gets IPv4 address from active network adapter
    public string GetLocalIpAddress()
    {
        try
        {
            // Get host entry for local machine
            var host = Dns.GetHostEntry(Dns.GetHostName());

            // Find first IPv4 address that's not loopback
            var localIp = host.AddressList
                .FirstOrDefault(ip => ip.AddressFamily == AddressFamily.InterNetwork
                                   && !IPAddress.IsLoopback(ip));

            return localIp?.ToString() ?? string.Empty;
        }
        catch
        {
            return string.Empty;
        }
    }

    // Retrieves processor name and model
    // Uses Win32_Processor WMI query for full CPU details
    public string GetProcessorName()
    {
        try
        {
            // Query Win32_Processor for name field
            using var searcher = new ManagementObjectSearcher("SELECT Name FROM Win32_Processor");
            foreach (ManagementObject obj in searcher.Get())
            {
                return obj["Name"]?.ToString()?.Trim() ?? "Unknown";
            }
        }
        catch
        {
            // Return Unknown if WMI query fails
        }

        return "Unknown";
    }

    // Retrieves system architecture (x64, x86, ARM64)
    // Uses RuntimeInformation or Environment for architecture detection
    public string GetArchitecture()
    {
        try
        {
            // Check if 64-bit process
            if (Environment.Is64BitOperatingSystem)
            {
                // Further check for ARM64
                var processor = GetProcessorName().ToLower();
                if (processor.Contains("arm"))
                {
                    return "ARM64";
                }
                return "x64";
            }
            return "x86";
        }
        catch
        {
            return "Unknown";
        }
    }

    // Retrieves total physical memory in megabytes
    // Uses Win32_ComputerSystem WMI query
    public long GetTotalMemory()
    {
        try
        {
            // Query Win32_ComputerSystem for total physical memory
            using var searcher = new ManagementObjectSearcher("SELECT TotalPhysicalMemory FROM Win32_ComputerSystem");
            foreach (ManagementObject obj in searcher.Get())
            {
                var bytes = Convert.ToInt64(obj["TotalPhysicalMemory"]);
                // Convert bytes to megabytes
                return bytes / (1024 * 1024);
            }
        }
        catch
        {
            // Return 0 if unable to query memory
        }

        return 0;
    }

    // Hashes input string using SHA256 for consistent, privacy-preserving identifier
    // Converts hardware IDs to fixed-length hash to avoid exposing raw device data
    private string HashString(string input)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToHexString(hash);
    }
}
