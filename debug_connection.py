"""
Debug script to diagnose Supabase PostgreSQL connection issues.
Tests: DNS resolution, TCP connectivity, SSL, and psycopg2 connection.
"""

import os
import socket
import sys
from pathlib import Path
from urllib.parse import urlparse

# Load .env
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

uri = os.getenv("PG_CONNECTION_URI") or os.getenv("DATABASE_URL")
if not uri:
    print("ERROR: PG_CONNECTION_URI not found in .env")
    sys.exit(1)

parsed = urlparse(uri)
host = parsed.hostname
port = parsed.port or 5432

print("=" * 60)
print("SUPABASE CONNECTION DIAGNOSTIC")
print("=" * 60)
print(f"Host: {host}")
print(f"Port: {port}")
print(f"Database: {parsed.path.lstrip('/')}")
print(f"User: {parsed.username}")
print()

# Step 1: DNS Resolution
print("[1/4] DNS Resolution...")
try:
    ips = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
    ip_list = list(set(ip[4][0] for ip in ips))
    print(f"      OK - Resolved to: {', '.join(ip_list)}")
except socket.gaierror as e:
    print(f"      FAILED - DNS error: {e}")
    sys.exit(1)

# Step 2: TCP Connectivity (with timeout)
print("[2/4] TCP Connectivity (5s timeout)...")
connected = False
for ip in ip_list:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((ip, port))
        sock.close()
        if result == 0:
            print(f"      OK - Connected to {ip}:{port}")
            connected = True
            break
        else:
            print(f"      FAILED - {ip}:{port} returned error code {result}")
    except socket.timeout:
        print(f"      FAILED - {ip}:{port} timed out (port likely blocked by firewall)")
    except Exception as e:
        print(f"      FAILED - {ip}:{port} error: {e}")

if not connected:
    print()
    print("=" * 60)
    print("DIAGNOSIS: Network/Firewall is blocking port 5432")
    print("=" * 60)
    print("Your network does not allow outbound TCP connections to port 5432.")
    print()
    print("SOLUTIONS:")
    print("  1. Try a different network (mobile hotspot, VPN)")
    print("  2. Check Windows Firewall - allow outbound 5432")
    print("  3. Check router/corporate firewall settings")
    print("  4. Use Supabase REST API (HTTPS) instead of direct PostgreSQL")
    sys.exit(1)

# Step 3: SSL/TLS Test
print("[3/4] SSL/TLS Handshake...")
try:
    import ssl
    context = ssl.create_default_context()
    with socket.create_connection((host, port), timeout=10) as sock:
        with context.wrap_socket(sock, server_hostname=host) as ssock:
            print(f"      OK - SSL version: {ssock.version()}")
except Exception as e:
    print(f"      WARNING - SSL test failed: {e}")
    print("      (This may be OK - PostgreSQL handles SSL differently)")

# Step 4: psycopg2 Connection
print("[4/4] PostgreSQL Connection (psycopg2)...")
try:
    import psycopg2
    conn = psycopg2.connect(uri, connect_timeout=10)
    cur = conn.cursor()
    cur.execute("SELECT version()")
    version = cur.fetchone()[0]
    cur.execute("SELECT current_database(), current_user")
    db, user = cur.fetchone()
    cur.close()
    conn.close()
    print(f"      OK - Connected!")
    print(f"      Database: {db}")
    print(f"      User: {user}")
    print(f"      Server: {version[:60]}...")
    print()
    print("=" * 60)
    print("SUCCESS: Connection to Supabase is working!")
    print("=" * 60)
except ImportError:
    print("      FAILED - psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)
except Exception as e:
    print(f"      FAILED - {e}")
    print()
    print("=" * 60)
    print("DIAGNOSIS: Connection failed at PostgreSQL protocol level")
    print("=" * 60)
    print("Possible causes:")
    print("  - Wrong password (check URL-encoding of special chars like @)")
    print("  - Database paused (check Supabase dashboard)")
    print("  - SSL mode issue (try adding ?sslmode=require to URI)")
    sys.exit(1)
