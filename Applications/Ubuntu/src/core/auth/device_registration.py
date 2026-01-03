"""
Device registration service for backend communication.
"""
import httpx
import platform
from typing import Optional

from ..models import DeviceRegistration, DeviceRegistrationResponse


class DeviceRegistrationService:
    """Handles device registration with the backend."""

    def __init__(self, backend_url: str, storage=None):
        """
        Initialize device registration service.

        Args:
            backend_url: Backend API URL
            storage: Storage service instance (optional)
        """
        self.backend_url = backend_url.rstrip("/")
        self.registration_endpoint = f"{self.backend_url}/api/device/register"
        self.storage = storage

    async def register_device(
        self,
        email: str,
        ue_code: str,
        device_id: str,
    ) -> DeviceRegistrationResponse:
        """
        Register device with backend.

        Args:
            email: User email
            ue_code: UE code (U&E code)
            device_id: Unique device ID

        Returns:
            DeviceRegistrationResponse
        """
        # Get OS information
        os_version = self._get_os_info()
        device_name = platform.node()

        # Calculate MCP URL (WebSocket endpoint)
        mcp_url = self.backend_url.replace("http://", "ws://").replace("https://", "wss://") + "/ws"

        registration = DeviceRegistration(
            email=email,
            ue_code=ue_code,
            device_id=device_id,
            device_name=device_name,
            os_version=os_version,
            mcp_url=mcp_url,
        )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.registration_endpoint,
                    json={
                        "email": registration.email,
                        "ue_code": registration.ue_code,
                        "device_id": registration.device_id,
                        "device_name": registration.device_name,
                        "os_version": registration.os_version,
                        "mcp_url": registration.mcp_url,
                    },
                )

                if response.status_code == 200:
                    data = response.json()
                    return DeviceRegistrationResponse.from_dict(data)
                else:
                    return DeviceRegistrationResponse(
                        success=False,
                        token="",
                        device_id="",
                        client_id="",
                        user_id="",
                        error=f"Registration failed: HTTP {response.status_code}",
                    )

        except httpx.TimeoutException:
            return DeviceRegistrationResponse(
                success=False,
                token="",
                device_id="",
                client_id="",
                user_id="",
                error="Registration timeout - backend unreachable",
            )
        except httpx.RequestError as e:
            return DeviceRegistrationResponse(
                success=False,
                token="",
                device_id="",
                client_id="",
                user_id="",
                error=f"Network error: {str(e)}",
            )
        except Exception as e:
            return DeviceRegistrationResponse(
                success=False,
                token="",
                device_id="",
                client_id="",
                user_id="",
                error=f"Unexpected error: {str(e)}",
            )

    def _get_os_info(self) -> str:
        """
        Get operating system information.

        Returns:
            OS info string
        """
        try:
            os_name = platform.system()
            os_version = platform.release()
            os_arch = platform.machine()

            # Try to get distribution info on Linux
            if os_name == "Linux":
                try:
                    import distro
                    dist_name = distro.name()
                    dist_version = distro.version()
                    return f"{dist_name} {dist_version} ({os_arch})"
                except ImportError:
                    # Fallback if distro package not available
                    try:
                        with open("/etc/os-release", "r") as f:
                            lines = f.readlines()
                            dist_info = {}
                            for line in lines:
                                if "=" in line:
                                    key, value = line.strip().split("=", 1)
                                    dist_info[key] = value.strip('"')

                            name = dist_info.get("NAME", "Linux")
                            version = dist_info.get("VERSION", os_version)
                            return f"{name} {version} ({os_arch})"
                    except FileNotFoundError:
                        pass

            return f"{os_name} {os_version} ({os_arch})"

        except Exception:
            return "Unknown Linux"
