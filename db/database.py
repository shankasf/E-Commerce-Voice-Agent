"""
Supabase REST API Client

Uses Supabase REST API instead of direct PostgreSQL connection
to avoid connection issues.
"""

import os
import requests
import json
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional

load_dotenv()


class SupabaseClient:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        # Prefer service role for writes; fall back to anon.
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, params: Optional[Dict] = None, prefer: Optional[str] = None) -> Any:
        """Make HTTP request to Supabase"""
        url = f"{self.url}/rest/v1/{endpoint}"
        headers = dict(self.headers)
        if prefer:
            headers["Prefer"] = prefer

        try:
            if method == "GET":
                response = requests.get(url, headers=headers, params=params)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data)
            elif method == "PATCH":
                response = requests.patch(url, headers=headers, json=data)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            response.raise_for_status()
            return response.json() if response.text else {}
        except requests.exceptions.RequestException as e:
            body = ""
            if e.response is not None:
                try:
                    body = e.response.text
                except Exception:
                    body = ""
            print(f"❌ Request failed: {e} | Response body: {body}")
            raise
    
    def get_all(self, table: str, select: str = "*", filters: Optional[Dict] = None) -> List[Dict]:
        """Fetch all records from a table"""
        endpoint = f"{table}?select={select}"
        if filters:
            for key, value in filters.items():
                endpoint += f"&{key}={value}"
        return self._make_request("GET", endpoint)
    
    def get_by_id(self, table: str, id_column: str, id_value: Any) -> Optional[Dict]:
        """Fetch a single record by ID"""
        endpoint = f"{table}?{id_column}=eq.{id_value}"
        result = self._make_request("GET", endpoint)
        return result[0] if result else None
    
    def get_by_filter(self, table: str, filters: Dict[str, Any], select: str = "*") -> List[Dict]:
        """Fetch records by filter conditions"""
        endpoint = f"{table}?select={select}"
        for key, value in filters.items():
            endpoint += f"&{key}=eq.{value}"
        return self._make_request("GET", endpoint)
    
    def search(self, table: str, column: str, query: str, select: str = "*") -> List[Dict]:
        """Search records using ILIKE (case-insensitive)"""
        endpoint = f"{table}?select={select}&{column}=ilike.*{query}*"
        return self._make_request("GET", endpoint)
    
    def insert(self, table: str, data: Dict) -> List[Dict]:
        """Insert a new record and return the created record"""
        return self._make_request("POST", table, data)
    
    def update(self, table: str, id_column: str, id_value: Any, data: Dict) -> List[Dict]:
        """Update a record by ID"""
        endpoint = f"{table}?{id_column}=eq.{id_value}"
        return self._make_request("PATCH", endpoint, data)
    
    def delete(self, table: str, id_column: str, id_value: Any) -> None:
        """Delete a record by ID"""
        endpoint = f"{table}?{id_column}=eq.{id_value}"
        self._make_request("DELETE", endpoint)
    
    def rpc(self, function_name: str, params: Optional[Dict] = None) -> Any:
        """Call a Supabase RPC function"""
        url = f"{self.url}/rest/v1/rpc/{function_name}"
        try:
            response = requests.post(url, headers=self.headers, json=params or {})
            response.raise_for_status()
            return response.json() if response.text else {}
        except requests.exceptions.RequestException as e:
            print(f"❌ RPC call failed: {e}")
            raise
    
    def test_connection(self) -> bool:
        """Test if connection works"""
        try:
            response = requests.get(f"{self.url}/rest/v1/", headers=self.headers)
            return response.status_code == 200
        except:
            return False


# Initialize global client
db = SupabaseClient()
