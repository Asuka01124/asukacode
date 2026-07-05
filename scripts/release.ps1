#!/usr/bin/env pwsh
# AsukaCode GitHub Release Script
# Usage: .\scripts\release.ps1 [-Version <version>] [-Draft] [-Prerelease]

param(
    [string]$Version,
    [switch]$Draft,
    [switch]$Prerelease,
    [switch]$AutoNotes
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$DistDir = "$ProjectRoot/dist"

# Get version from package.json if not specified
if (-not $Version) {
    $PackageJson = Get-Content "$ProjectRoot/package.json" | ConvertFrom-Json
    $Version = $PackageJson.version
}

Write-Host "Creating release v$Version..." -ForegroundColor Cyan

# Check if binaries exist
$Binaries = @(
    "asukacode-win32-x64.exe",
    "asukacode-linux-x64",
    "asukacode-linux-arm64"
)

$Missing = @()
foreach ($Binary in $Binaries) {
    $Path = "$DistDir/$Binary"
    if (-not (Test-Path $Path)) {
        $Missing += $Binary
    }
}

if ($Missing.Count -gt 0) {
    Write-Host "Missing binaries:" -ForegroundColor Red
    $Missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host "Run '.\scripts\build.ps1 -All' first." -ForegroundColor Yellow
    exit 1
}

# Generate release notes from git log
$LastTag = git describe --tags --abbrev=0 HEAD~1 2>$null
if ($LastTag) {
    $GitLog = git log "$LastTag..HEAD" --pretty=format:"- %s" --no-merges
} else {
    $GitLog = git log --pretty=format:"- %s" --no-merges -20
}

$ReleaseNotes = @"
## AsukaCode v$Version

### Changes
$GitLog

### Installation

**Windows (PowerShell):**
``````powershell
irm https://raw.githubusercontent.com/Asuka01124/asukacode/main/scripts/install.ps1 | iex
``````

**Windows (CMD):**
``````cmd
curl -o install.ps1 https://raw.githubusercontent.com/Asuka01124/asukacode/main/scripts/install.ps1 && powershell -ExecutionPolicy Bypass -File install.ps1
``````

**Linux x64:**
``````bash
curl -fsSL https://raw.githubusercontent.com/Asuka01124/asukacode/main/scripts/install.sh | bash
``````

### Assets
- ``asukacode-win32-x64.exe`` - Windows x64
- ``asukacode-linux-x64`` - Linux x64
- ``asukacode-linux-arm64`` - Linux ARM64
"@

# Create release
$ReleaseArgs = @(
    "release",
    "create",
    "v$Version",
    "--title", "v$Version",
    "--notes", $ReleaseNotes
)

if ($Draft) {
    $ReleaseArgs += "--draft"
}

if ($Prerelease) {
    $ReleaseArgs += "--prerelease"
}

# Add binaries as release assets
foreach ($Binary in $Binaries) {
    $Path = "$DistDir/$Binary"
    $ReleaseArgs += $Path
}

Write-Host "Creating GitHub release..." -ForegroundColor Yellow
Write-Host "  Tag: v$Version" -ForegroundColor Gray
Write-Host "  Assets: $($Binaries.Count) binaries" -ForegroundColor Gray

# Execute gh release create
& gh @ReleaseArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nRelease v$Version created successfully!" -ForegroundColor Green
    Write-Host "View at: https://github.com/Asuka01124/asukacode/releases/tag/v$Version" -ForegroundColor Cyan
} else {
    Write-Host "`nFailed to create release!" -ForegroundColor Red
    exit 1
}
