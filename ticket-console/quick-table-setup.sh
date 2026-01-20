#!/bin/bash
# Quick setup script - Instructions for creating table

echo "=========================================="
echo "Device Connections Table Setup"
echo "=========================================="
echo ""
echo "To create the table, you have 2 options:"
echo ""
echo "OPTION 1: Supabase Dashboard (Easiest)"
echo "  1. Open: https://supabase.com/dashboard/project/wwdzxovkandfyohsfybm/sql"
echo "  2. Copy the SQL from: db/device_connections_complete.sql"
echo "  3. Paste and click 'Run'"
echo ""
echo "OPTION 2: psql (If you have database password)"
echo "  Connection string from Supabase Settings → Database"
echo "  Example: postgresql://postgres:[PASSWORD]@db.wwdzxovkandfyohsfybm.supabase.co:5432/postgres"
echo ""
echo "SQL file location:"
echo "  $(pwd)/db/device_connections_complete.sql"
echo ""
echo "Showing first 30 lines of SQL file:"
echo "----------------------------------------"
head -30 db/device_connections_complete.sql
