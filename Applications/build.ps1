# Windows MCP Agent Build Script
# This script builds the solution and checks for common issues

Write-Host "Windows MCP Agent - Build Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if .NET SDK is installed
Write-Host "Checking .NET SDK..." -ForegroundColor Yellow
$dotnetVersion = dotnet --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: .NET SDK not found. Please install .NET 8 SDK." -ForegroundColor Red
    exit 1
}
Write-Host "Found .NET SDK: $dotnetVersion" -ForegroundColor Green
Write-Host ""

# Check if solution file exists
if (-not (Test-Path "WindowsMcpAgent.sln")) {
    Write-Host "ERROR: Solution file not found!" -ForegroundColor Red
    exit 1
}

# Restore packages
Write-Host "Restoring NuGet packages..." -ForegroundColor Yellow
dotnet restore WindowsMcpAgent.sln
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Package restore failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Packages restored successfully." -ForegroundColor Green
Write-Host ""

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
dotnet clean WindowsMcpAgent.sln --configuration Release
Write-Host ""

# Build the solution
Write-Host "Building solution (Release configuration)..." -ForegroundColor Yellow
dotnet build WindowsMcpAgent.sln --configuration Release --no-incremental
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Show output location
$outputPath = "src\WindowsMcpAgent\bin\Release\net8.0-windows\WindowsMcpAgent.exe"
if (Test-Path $outputPath) {
    Write-Host "Executable location: $outputPath" -ForegroundColor Cyan
    $fileInfo = Get-Item $outputPath
    Write-Host "File size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Build completed successfully! You can now run the application." -ForegroundColor Green
} else {
    Write-Host "WARNING: Expected output file not found at: $outputPath" -ForegroundColor Yellow
}









