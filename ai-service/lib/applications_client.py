"""
HTTP Client for calling Applications Backend (Remote Troubleshooting).

Handles remote device connection and tool execution.
"""

import logging
from typing import Any, Dict, Optional
import requests
from config import get_config

logger = logging.getLogger(__name__)


class ApplicationsBackendClient:
    """
    HTTP client for Applications Backend.
    
    Used for remote device troubleshooting via MCP Agent.
    """
    
    def __init__(self):
        self.config = get_config()
        self.base_url = self.config.applications_backend_url.rstrip("/")
        self.api_key = self.config.applications_backend_api_key
        self.timeout = 60  # Longer timeout for remote operations
        
        if not self.base_url:
            logger.warning("APPLICATIONS_BACKEND_URL not configured.")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get default headers for API requests."""
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["x-api-key"] = self.api_key
        return headers
    
    def solve_problem(
        self,
        user_id: str,
        problem_description: str,
        device_id: Optional[str] = None,
        role: str = "ai_agent",
    ) -> Dict[str, Any]:
        """
        Solve a problem remotely on a user's device.
        
        Args:
            user_id: User/contact ID
            problem_description: Description of the problem
            device_id: Optional device ID (uses primary device if not provided)
            role: User role (ai_agent, human_agent, admin)
        
        Returns:
            Problem response with solution and tools executed
        """
        url = f"{self.base_url}/api/problem/solve"
        
        payload = {
            "user_id": user_id,
            "problem_description": problem_description,
            "role": role,
        }
        if device_id:
            payload["device_id"] = device_id
        
        try:
            response = requests.post(
                url,
                headers=self._get_headers(),
                json=payload,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Remote troubleshooting failed: {e}")
            raise Exception(f"Remote troubleshooting error: {str(e)}")


# Global client instance
_applications_client: Optional[ApplicationsBackendClient] = None


def get_applications_client() -> ApplicationsBackendClient:
    """Get the global Applications Backend client instance."""
    global _applications_client
    if _applications_client is None:
        _applications_client = ApplicationsBackendClient()
    return _applications_client

