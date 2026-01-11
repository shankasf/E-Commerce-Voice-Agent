"""
Diagnostic Templates - Server-Owned Command Allowlist

These are the ONLY commands the endpoint agent can execute.
No raw shell commands are accepted - only diagnostic IDs from this registry.
"""

import re
from dataclasses import dataclass
from typing import List, Dict, Optional, Any

@dataclass
class DiagnosticTemplate:
    """A pre-approved diagnostic command template."""
    id: str
    name: str
    description: str
    category: str
    command: List[str]  # Command as argument array (NO shell interpretation)
    params: Dict[str, str] = None  # Parameter name -> regex validation pattern
    risk: str = "low"  # low, medium, high
    timeout: int = 30
    requires_admin: bool = False
    
    def validate_params(self, provided_params: Dict[str, str]) -> tuple[bool, str]:
        """Validate provided parameters against patterns."""
        if not self.params:
            return True, "OK"
        
        for param_name, pattern in self.params.items():
            if param_name not in provided_params:
                return False, f"Missing required parameter: {param_name}"
            
            value = provided_params[param_name]
            if not re.match(pattern, value):
                return False, f"Invalid value for {param_name}: does not match allowed pattern"
        
        return True, "OK"
    
    def build_command(self, provided_params: Dict[str, str] = None) -> List[str]:
        """Build the command with parameter substitution."""
        if not provided_params:
            return self.command.copy()
        
        result = []
        for arg in self.command:
            if arg.startswith("{") and arg.endswith("}"):
                param_name = arg[1:-1]
                if param_name in provided_params:
                    result.append(provided_params[param_name])
                else:
                    result.append(arg)
            else:
                result.append(arg)
        
        return result


# ─────────────────────────────────────────────────────────────
# Diagnostic Registry - Windows Diagnostics
# ─────────────────────────────────────────────────────────────

DIAGNOSTICS: Dict[str, DiagnosticTemplate] = {}

def register(template: DiagnosticTemplate):
    """Register a diagnostic template."""
    DIAGNOSTICS[template.id] = template
    return template


# ─────────────────────────────────────────────────────────────
# Network Diagnostics
# ─────────────────────────────────────────────────────────────

register(DiagnosticTemplate(
    id="network_ipconfig",
    name="IP Configuration",
    description="Display all network adapter IP configuration including DNS, DHCP, and gateway settings",
    category="network",
    command=["ipconfig", "/all"],
    risk="low",
    timeout=10,
))

register(DiagnosticTemplate(
    id="network_ipconfig_release",
    name="Release DHCP Lease",
    description="Release the current DHCP lease for all adapters",
    category="network",
    command=["ipconfig", "/release"],
    risk="medium",
    timeout=15,
))

register(DiagnosticTemplate(
    id="network_ipconfig_renew",
    name="Renew DHCP Lease",
    description="Renew DHCP lease for all adapters",
    category="network",
    command=["ipconfig", "/renew"],
    risk="medium",
    timeout=30,
))

register(DiagnosticTemplate(
    id="network_flushdns",
    name="Flush DNS Cache",
    description="Clear the local DNS resolver cache",
    category="network",
    command=["ipconfig", "/flushdns"],
    risk="low",
    timeout=5,
))

register(DiagnosticTemplate(
    id="network_ping",
    name="Ping Host",
    description="Test network connectivity to a specific host",
    category="network",
    command=["ping", "-n", "4", "{host}"],
    params={"host": r"^[\w\.\-]+$"},  # Alphanumeric, dots, dashes only
    risk="low",
    timeout=30,
))

register(DiagnosticTemplate(
    id="network_ping_continuous",
    name="Extended Ping",
    description="Extended ping test (10 packets) to check for packet loss",
    category="network",
    command=["ping", "-n", "10", "{host}"],
    params={"host": r"^[\w\.\-]+$"},
    risk="low",
    timeout=60,
))

register(DiagnosticTemplate(
    id="network_tracert",
    name="Trace Route",
    description="Trace the network path to a destination host",
    category="network",
    command=["tracert", "-d", "-h", "15", "{host}"],
    params={"host": r"^[\w\.\-]+$"},
    risk="low",
    timeout=120,
))

register(DiagnosticTemplate(
    id="network_nslookup",
    name="DNS Lookup",
    description="Query DNS for a domain name",
    category="network",
    command=["nslookup", "{domain}"],
    params={"domain": r"^[\w\.\-]+$"},
    risk="low",
    timeout=15,
))

register(DiagnosticTemplate(
    id="network_netstat",
    name="Network Connections",
    description="Display active network connections and listening ports",
    category="network",
    command=["netstat", "-an"],
    risk="low",
    timeout=15,
))

register(DiagnosticTemplate(
    id="network_netstat_routes",
    name="Routing Table",
    description="Display the IP routing table",
    category="network",
    command=["netstat", "-r"],
    risk="low",
    timeout=10,
))

register(DiagnosticTemplate(
    id="network_arp",
    name="ARP Cache",
    description="Display the ARP (Address Resolution Protocol) cache",
    category="network",
    command=["arp", "-a"],
    risk="low",
    timeout=10,
))

# ─────────────────────────────────────────────────────────────
# System Diagnostics
# ─────────────────────────────────────────────────────────────

register(DiagnosticTemplate(
    id="system_info",
    name="System Information",
    description="Display detailed system configuration including OS version, memory, and hardware",
    category="system",
    command=["systeminfo"],
    risk="low",
    timeout=60,
))

register(DiagnosticTemplate(
    id="system_hostname",
    name="Computer Name",
    description="Display the computer's hostname",
    category="system",
    command=["hostname"],
    risk="low",
    timeout=5,
))

register(DiagnosticTemplate(
    id="system_whoami",
    name="Current User",
    description="Display the current logged-in user",
    category="system",
    command=["whoami"],
    risk="low",
    timeout=5,
))

register(DiagnosticTemplate(
    id="system_tasklist",
    name="Running Processes",
    description="List all running processes",
    category="system",
    command=["tasklist"],
    risk="low",
    timeout=15,
))

register(DiagnosticTemplate(
    id="system_tasklist_svc",
    name="Services by Process",
    description="List processes with their associated services",
    category="system",
    command=["tasklist", "/svc"],
    risk="low",
    timeout=15,
))

register(DiagnosticTemplate(
    id="system_services",
    name="Windows Services",
    description="List all Windows services and their status",
    category="system",
    command=["sc", "query", "type=", "service", "state=", "all"],
    risk="low",
    timeout=30,
))

register(DiagnosticTemplate(
    id="system_drivers",
    name="Loaded Drivers",
    description="List all loaded device drivers",
    category="system",
    command=["driverquery"],
    risk="low",
    timeout=30,
))

# ─────────────────────────────────────────────────────────────
# Disk & Storage Diagnostics
# ─────────────────────────────────────────────────────────────

register(DiagnosticTemplate(
    id="disk_info",
    name="Disk Space",
    description="Display disk drives and free space using WMIC",
    category="disk",
    command=["wmic", "logicaldisk", "get", "caption,description,freespace,size"],
    risk="low",
    timeout=15,
))

register(DiagnosticTemplate(
    id="disk_volumes",
    name="Volume Information",
    description="List all disk volumes",
    category="disk",
    command=["wmic", "volume", "get", "caption,capacity,freespace,filesystem"],
    risk="low",
    timeout=15,
))

# ─────────────────────────────────────────────────────────────
# PowerShell Diagnostics (Safe cmdlets only)
# ─────────────────────────────────────────────────────────────

register(DiagnosticTemplate(
    id="ps_services",
    name="PowerShell Services",
    description="Get Windows services using PowerShell",
    category="powershell",
    command=["powershell", "-NoProfile", "-Command", "Get-Service | Select-Object Name,Status,DisplayName | Format-Table -AutoSize"],
    risk="low",
    timeout=30,
))

register(DiagnosticTemplate(
    id="ps_network_adapters",
    name="Network Adapters",
    description="Get network adapter configuration using PowerShell",
    category="powershell",
    command=["powershell", "-NoProfile", "-Command", "Get-NetIPConfiguration | Select-Object InterfaceAlias,IPv4Address,IPv4DefaultGateway,DNSServer"],
    risk="low",
    timeout=15,
))

register(DiagnosticTemplate(
    id="ps_wifi_profiles",
    name="WiFi Profiles",
    description="List saved WiFi network profiles (names only, no passwords)",
    category="powershell",
    command=["powershell", "-NoProfile", "-Command", "netsh wlan show profiles"],
    risk="low",
    timeout=15,
))

register(DiagnosticTemplate(
    id="ps_firewall_status",
    name="Firewall Status",
    description="Check Windows Firewall status for all profiles",
    category="powershell",
    command=["powershell", "-NoProfile", "-Command", "Get-NetFirewallProfile | Select-Object Name,Enabled"],
    risk="low",
    timeout=15,
))

register(DiagnosticTemplate(
    id="ps_installed_apps",
    name="Installed Applications",
    description="List installed applications (may take a moment)",
    category="powershell",
    command=["powershell", "-NoProfile", "-Command", "Get-WmiObject -Class Win32_Product | Select-Object Name,Version | Sort-Object Name"],
    risk="low",
    timeout=120,
))

register(DiagnosticTemplate(
    id="ps_startup_apps",
    name="Startup Programs",
    description="List programs that run at startup",
    category="powershell",
    command=["powershell", "-NoProfile", "-Command", "Get-CimInstance Win32_StartupCommand | Select-Object Name,Command,Location"],
    risk="low",
    timeout=30,
))

# ─────────────────────────────────────────────────────────────
# Event Log Diagnostics
# ─────────────────────────────────────────────────────────────

register(DiagnosticTemplate(
    id="eventlog_system_errors",
    name="Recent System Errors",
    description="Get the last 20 system error events",
    category="eventlog",
    command=["powershell", "-NoProfile", "-Command", 
             "Get-EventLog -LogName System -EntryType Error -Newest 20 | Select-Object TimeGenerated,Source,Message | Format-List"],
    risk="low",
    timeout=30,
))

register(DiagnosticTemplate(
    id="eventlog_app_errors",
    name="Recent Application Errors",
    description="Get the last 20 application error events",
    category="eventlog",
    command=["powershell", "-NoProfile", "-Command",
             "Get-EventLog -LogName Application -EntryType Error -Newest 20 | Select-Object TimeGenerated,Source,Message | Format-List"],
    risk="low",
    timeout=30,
))

# ─────────────────────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────────────────────

register(DiagnosticTemplate(
    id="health_check",
    name="Agent Health Check",
    description="Verify the endpoint agent is responding correctly",
    category="health",
    command=["echo", "Agent is healthy"],
    risk="low",
    timeout=5,
))


# ─────────────────────────────────────────────────────────────
# Registry Functions
# ─────────────────────────────────────────────────────────────

def get_diagnostic(diagnostic_id: str) -> Optional[DiagnosticTemplate]:
    """Get a diagnostic template by ID."""
    return DIAGNOSTICS.get(diagnostic_id)

def list_diagnostics() -> List[Dict[str, Any]]:
    """List all available diagnostics (safe for sending to clients)."""
    return [
        {
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "category": d.category,
            "risk": d.risk,
            "params": list(d.params.keys()) if d.params else [],
            "requires_admin": d.requires_admin,
        }
        for d in DIAGNOSTICS.values()
    ]

def get_diagnostics_by_category(category: str) -> List[DiagnosticTemplate]:
    """Get all diagnostics in a category."""
    return [d for d in DIAGNOSTICS.values() if d.category == category]

def get_categories() -> List[str]:
    """Get all diagnostic categories."""
    return list(set(d.category for d in DIAGNOSTICS.values()))

