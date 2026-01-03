@echo off
REM Windows MCP Agent Build Script (Batch version)
echo Windows MCP Agent - Build Script
echo ================================
echo.

REM Check if .NET SDK is installed
echo Checking .NET SDK...
dotnet --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: .NET SDK not found. Please install .NET 8 SDK.
    exit /b 1
)
echo Found .NET SDK
echo.

REM Restore packages
echo Restoring NuGet packages...
dotnet restore WindowsMcpAgent.sln
if errorlevel 1 (
    echo ERROR: Package restore failed!
    exit /b 1
)
echo Packages restored successfully.
echo.

REM Clean previous builds
echo Cleaning previous builds...
dotnet clean WindowsMcpAgent.sln --configuration Release
echo.

REM Build the solution
echo Building solution (Release configuration)...
dotnet build WindowsMcpAgent.sln --configuration Release --no-incremental
if errorlevel 1 (
    echo ERROR: Build failed!
    exit /b 1
)
echo.
echo Build completed successfully!
echo.
echo Executable location: src\WindowsMcpAgent\bin\Release\net8.0-windows\WindowsMcpAgent.exe
echo.









