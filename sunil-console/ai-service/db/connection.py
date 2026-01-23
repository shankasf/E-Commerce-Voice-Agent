"""
Supabase REST API Database Interface for URackIT AI Service.

Provides a simple interface to interact with Supabase via REST API.
"""

import os
import logging
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class SupabaseDB:
    """Supabase REST API client for database operations."""
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.service_key = (
            os.getenv("SUPABASE_SERVICE_ROLE_KEY", "") or 
            os.getenv("SUPABASE_SERVICE_KEY", "")
        )
        
        if not self.url or not self.service_key:
            logger.warning("Supabase configuration incomplete. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
        
        self.headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    def _get_endpoint(self, table: str) -> str:
        """Get the REST endpoint URL for a table."""
        return f"{self.url}/rest/v1/{table}"
    
    def _make_request(
        self,
        method: str,
        table: str,
        params: Optional[Dict] = None,
        data: Optional[Dict | List] = None,
        prefer: Optional[str] = None,
    ) -> List[Dict]:
        """Make a request to the Supabase REST API."""
        url = self._get_endpoint(table)
        headers = self.headers.copy()
        
        if prefer:
            headers["Prefer"] = prefer
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=data,
                timeout=30,
            )
            response.raise_for_status()
            
            if response.text:
                return response.json()
            return []
        except requests.exceptions.RequestException as e:
            logger.error(f"Database request error: {e}")
            raise
    
    def select(
        self,
        table: str,
        columns: str = "*",
        filters: Optional[Dict] = None,
        limit: Optional[int] = None,
        order: Optional[str] = None,
    ) -> List[Dict]:
        """Select rows from a table."""
        params = {"select": columns}
        
        if filters:
            params.update(filters)
        if limit:
            params["limit"] = str(limit)
        if order:
            params["order"] = order
        
        return self._make_request("GET", table, params=params)
    
    def insert(self, table: str, data: Dict | List[Dict]) -> List[Dict]:
        """Insert one or more rows into a table."""
        return self._make_request(
            "POST",
            table,
            data=data if isinstance(data, list) else [data],
            prefer="return=representation",
        )
    
    def update(
        self,
        table: str,
        data: Dict,
        filters: Dict,
    ) -> List[Dict]:
        """Update rows matching filters."""
        return self._make_request(
            "PATCH",
            table,
            params=filters,
            data=data,
            prefer="return=representation",
        )
    
    def delete(self, table: str, filters: Dict) -> List[Dict]:
        """Delete rows matching filters."""
        return self._make_request(
            "DELETE",
            table,
            params=filters,
            prefer="return=representation",
        )
    
    def rpc(self, function_name: str, params: Optional[Dict] = None) -> Any:
        """Call a PostgreSQL function via RPC."""
        url = f"{self.url}/rest/v1/rpc/{function_name}"
        
        try:
            response = requests.post(
                url,
                headers=self.headers,
                json=params or {},
                timeout=30,
            )
            response.raise_for_status()
            
            if response.text:
                return response.json()
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"RPC error: {e}")
            raise


# Global database instance
_db: Optional[SupabaseDB] = None


def get_db() -> SupabaseDB:
    """Get the global database instance."""
    global _db
    if _db is None:
        _db = SupabaseDB()
    return _db


# Convenience alias
db = get_db()
