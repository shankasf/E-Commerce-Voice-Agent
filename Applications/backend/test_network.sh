#!/bin/bash
# Quick test script for network configuration listing

BACKEND_URL="http://localhost:9000"
USER_ID="user_1234567890"  # Replace with your actual user_id

echo "=== Testing Network Configuration Listing ==="
echo ""

echo "1. Health Check..."
curl -s "$BACKEND_URL/api/health" | python -m json.tool
echo ""
echo ""

echo "2. Solving Network Configuration Problem..."
curl -X POST "$BACKEND_URL/api/problem/solve" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"problem_description\": \"I need to list and check my network configurations, interface status, IP addresses, and connection speeds\"
  }" | python -m json.tool

echo ""
echo "=== Test Complete ==="









