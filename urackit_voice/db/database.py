"""
Supabase REST API Database Interface for U Rack IT.

Provides a simple interface to interact with Supabase via REST API.
"""

import os
import requests
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()


class SupabaseDB:
    """Supabase REST API client for database operations."""
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "").rstrip("/")
        # Use service role key for full table access (bypasses RLS)
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "") or os.getenv("SUPABASE_SERVICE_KEY", "")
        
        if not self.service_key:
            raise ValueError("No Supabase API key configured. Set SUPABASE_SERVICE_ROLE_KEY.")
        
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
        """Update rows matching the filters."""
        return self._make_request(
            "PATCH",
            table,
            params=filters,
            data=data,
            prefer="return=representation",
        )
    
    def delete(self, table: str, filters: Dict) -> List[Dict]:
        """Delete rows matching the filters."""
        return self._make_request("DELETE", table, params=filters)
    
    def get_by_id(self, table: str, id_column: str, id_value: int) -> Optional[Dict]:
        """Get a single row by ID."""
        params = {f"{id_column}": f"eq.{id_value}"}
        results = self._make_request("GET", table, params=params)
        return results[0] if results else None


# Global database instance
db = SupabaseDB()
