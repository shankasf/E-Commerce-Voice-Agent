using System;
using Newtonsoft.Json;

namespace WindowsApp.Models;

// Request model for device registration endpoint
// Represents all data sent to /api/device/register
// Uses JsonProperty attributes to map C# PascalCase to backend's snake_case
public class DeviceRegistrationRequest
{
    // User's email address for authentication
    [JsonProperty("email")]
    public string Email { get; set; } = string.Empty;

    // Unique enterprise/organization code assigned by the system
    [JsonProperty("ue_code")]
    public string UeCode { get; set; } = string.Empty;

    // Unique device identifier (hashed motherboard serial or machine+CPU ID)
    [JsonProperty("device_id")]
    public string DeviceId { get; set; } = string.Empty;

    // Human-readable device name (computer name)
    [JsonProperty("device_name")]
    public string DeviceName { get; set; } = string.Empty;

    // Operating system version with edition (e.g., "Windows 11 Pro (10.0.22621)")
    [JsonProperty("os_version")]
    public string OsVersion { get; set; } = string.Empty;

    // Device manufacturer (e.g., "Dell Inc.", "HP", "Lenovo")
    [JsonProperty("manufacturer_id")]
    public string ManufacturerId { get; set; } = string.Empty;

    // Device model number (e.g., "OptiPlex 7090", "ThinkPad X1")
    [JsonProperty("model_id")]
    public string ModelId { get; set; } = string.Empty;

    // Network host name (typically same as DeviceName)
    [JsonProperty("host_name")]
    public string HostName { get; set; } = string.Empty;

    // Public IP address (obtained via external service)
    [JsonProperty("public_ip")]
    public string PublicIp { get; set; } = string.Empty;

    // Default gateway IP address
    [JsonProperty("gateway")]
    public string Gateway { get; set; } = string.Empty;

    // Operating system type (e.g., "Windows", "Windows Server")
    [JsonProperty("os_id")]
    public string OsId { get; set; } = string.Empty;

    // Domain or workgroup name
    [JsonProperty("domain_id")]
    public string DomainId { get; set; } = string.Empty;

    // System uptime in seconds since last boot
    [JsonProperty("system_uptime")]
    public long SystemUptime { get; set; }

    // Username of last logged in user
    [JsonProperty("last_logged_in_by")]
    public string LastLoggedInBy { get; set; } = string.Empty;

    // Device type category (e.g., "Desktop", "Laptop", "Server")
    [JsonProperty("device_type_id")]
    public string DeviceTypeId { get; set; } = string.Empty;

    // Timestamp when device info was collected
    [JsonProperty("last_reported_time")]
    public DateTime LastReportedTime { get; set; }

    // Processor name and model (e.g., "Intel Core i7-11700")
    [JsonProperty("processor_id")]
    public string ProcessorId { get; set; } = string.Empty;

    // System architecture (e.g., "x64", "x86", "ARM64")
    [JsonProperty("architecture_id")]
    public string ArchitectureId { get; set; } = string.Empty;

    // Total physical memory in megabytes
    [JsonProperty("total_memory")]
    public long TotalMemory { get; set; }
}
