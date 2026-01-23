"""
HTTP Client for calling Next.js API Gateway.

Provides consistent authentication, error handling, and request formatting.
"""

import logging
from typing import Any, Dict, Optional
import requests
from config import get_config

logger = logging.getLogger(__name__)


class APIClient:
    """
    HTTP client for Next.js API Gateway.
    
    Handles authentication, error handling, and response parsing.
    """
    
    def __init__(self):
        self.config = get_config()
        self.base_url = self.config.nextjs_api_url.rstrip("/")
        self.api_key = self.config.nextjs_api_key
        self.timeout = 30  # seconds
        
        if not self.base_url:
            logger.warning("NEXTJS_API_URL not configured. API calls will fail.")
        if not self.api_key:
            logger.warning("NEXTJS_API_KEY not configured. API calls will fail.")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get default headers for API requests."""
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["x-ai-service-key"] = self.api_key
        return headers
    
    def _handle_response(self, response: requests.Response) -> Any:
        """Handle API response and extract data."""
        try:
            response.raise_for_status()
            data = response.json()
            
            # Check for success field in response
            if isinstance(data, dict) and "success" in data:
                if not data.get("success"):
                    error_msg = data.get("error", "Unknown error")
                    logger.error(f"API returned error: {error_msg}")
                    raise Exception(f"API error: {error_msg}")
                # Some endpoints return top-level fields (no "data")
                return data.get("data", data)
            
            return data
        except requests.exceptions.HTTPError as e:
            error_text = ""
            try:
                error_text = e.response.text
            except:
                pass
            logger.error(f"HTTP error {e.response.status_code}: {error_text}")
            raise Exception(f"HTTP {e.response.status_code}: {error_text or str(e)}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error: {e}")
            raise Exception(f"Request failed: {str(e)}")
    
    def get(self, endpoint: str, params: Optional[Dict] = None) -> Any:
        """Make GET request to API gateway."""
        url = f"{self.base_url}{endpoint}"
        logger.debug(f"API GET: {url} with params: {params}")
        
        try:
            response = requests.get(
                url,
                headers=self._get_headers(),
                params=params,
                timeout=self.timeout,
            )
            return self._handle_response(response)
        except Exception as e:
            logger.error(f"GET {endpoint} failed: {e}")
            raise
    
    def post(self, endpoint: str, data: Optional[Dict] = None) -> Any:
        """Make POST request to API gateway."""
        url = f"{self.base_url}{endpoint}"
        logger.debug(f"API POST: {url} with data: {data}")
        
        try:
            response = requests.post(
                url,
                headers=self._get_headers(),
                json=data,
                timeout=self.timeout,
            )
            return self._handle_response(response)
        except Exception as e:
            logger.error(f"POST {endpoint} failed: {e}")
            raise
    
    def put(self, endpoint: str, data: Optional[Dict] = None, params: Optional[Dict] = None) -> Any:
        """Make PUT request to API gateway."""
        url = f"{self.base_url}{endpoint}"
        logger.debug(f"API PUT: {url} with data: {data}, params: {params}")
        
        try:
            response = requests.put(
                url,
                headers=self._get_headers(),
                json=data,
                params=params,
                timeout=self.timeout,
            )
            return self._handle_response(response)
        except Exception as e:
            logger.error(f"PUT {endpoint} failed: {e}")
            raise


# Global API client instance
_api_client: Optional[APIClient] = None


def get_api_client() -> APIClient:
    """Get the global API client instance."""
    global _api_client
    if _api_client is None:
        _api_client = APIClient()
    return _api_client

