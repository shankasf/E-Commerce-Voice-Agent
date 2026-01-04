"""
Database connection handler for Real Estate Voice Agent.

Supports Supabase REST API for database operations.
"""

import os
import logging
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class DatabaseConnection:
    """Database connection using Supabase REST API."""
    
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL", "")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self._validate()
    
    def _validate(self) -> None:
        """Validate database configuration."""
        if not self.supabase_url:
            logger.warning("SUPABASE_URL not configured")
        if not self.supabase_key:
            logger.warning("SUPABASE_SERVICE_ROLE_KEY not configured")
    
    @property
    def _headers(self) -> Dict[str, str]:
        """Get request headers for Supabase API."""
        return {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    @property
    def _base_url(self) -> str:
        """Get base URL for REST API."""
        return f"{self.supabase_url}/rest/v1"
    
    def _make_request(
        self,
        method: str,
        table: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None
    ) -> Any:
        """Make HTTP request to Supabase REST API."""
        url = f"{self._base_url}/{table}"
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=self._headers,
                params=params,
                json=data,
                timeout=30
            )
            response.raise_for_status()
            
            if response.text:
                return response.json()
            return None
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Database request failed: {e}")
            raise
    
    def select(
        self,
        table: str,
        columns: str = "*",
        filters: Optional[Dict[str, str]] = None,
        limit: Optional[int] = None,
        order: Optional[str] = None
    ) -> List[Dict]:
        """Select records from a table."""
        params = {"select": columns}
        
        if filters:
            params.update(filters)
        if limit:
            params["limit"] = str(limit)
        if order:
            params["order"] = order
        
        return self._make_request("GET", table, params=params) or []
    
    def insert(self, table: str, data: Dict) -> List[Dict]:
        """Insert a record into a table."""
        return self._make_request("POST", table, data=data) or []
    
    def update(
        self,
        table: str,
        data: Dict,
        filters: Dict[str, str]
    ) -> List[Dict]:
        """Update records in a table."""
        return self._make_request("PATCH", table, params=filters, data=data) or []
    
    def delete(self, table: str, filters: Dict[str, str]) -> List[Dict]:
        """Delete records from a table."""
        return self._make_request("DELETE", table, params=filters) or []
    
    def rpc(self, function_name: str, params: Optional[Dict] = None) -> Any:
        """Call a database function via RPC."""
        url = f"{self.supabase_url}/rest/v1/rpc/{function_name}"
        
        try:
            response = requests.post(
                url=url,
                headers=self._headers,
                json=params or {},
                timeout=30
            )
            response.raise_for_status()
            
            if response.text:
                return response.json()
            return None
            
        except requests.exceptions.RequestException as e:
            logger.error(f"RPC call failed: {e}")
            raise


# Global database instance
_db: Optional[DatabaseConnection] = None


def get_db() -> DatabaseConnection:
    """Get the global database connection instance."""
    global _db
    if _db is None:
        _db = DatabaseConnection()
    return _db
