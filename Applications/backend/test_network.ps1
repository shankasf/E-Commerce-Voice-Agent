# PowerShell script to test network configuration listing

$BackendUrl = "http://localhost:9000"
$UserId = "user_1234567890"  # Replace with your actual user_id

Write-Host "=== Testing Network Configuration Listing ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Health Check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$BackendUrl/api/health" -Method Get
$health | ConvertTo-Json
Write-Host ""

Write-Host "2. Solving Network Configuration Problem..." -ForegroundColor Yellow
$body = @{
    user_id = $UserId
    problem_description = "I need to list and check my network configurations, interface status, IP addresses, and connection speeds"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$BackendUrl/api/problem/solve" -Method Post -Body $body -ContentType "application/json"
$response | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Green









