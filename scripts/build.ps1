#!/usr/bin/env pwsh
# AsukaCode Cross-Platform Build Script
# Usage: .\scripts\build.ps1 [-Target <platform>] [-All]

param(
    [ValidateSet("win-x64", "linux-x64", "all")]
    [string]$Target = "win-x64",
    [switch]$All,
    [switch]$NoIcon
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EntryFile = "./tui/entry.tsx"
$DistDir = "$ProjectRoot/dist"

# Create dist directory
New-Item -ItemType Directory -Force -Path $DistDir | Out-Null

function Build-Binary {
    param(
        [string]$Platform,
        [string]$TargetTriple,
        [string]$Ext = ""
    )
    
    $OutputName = "asukacode-$Platform"
    $OutputPath = "$DistDir/$OutputName$Ext"
    
    Write-Host "Building for $Platform..." -ForegroundColor Cyan
    
    # Check if target is linux and WSL is available
    if ($Platform -like "linux-*" -and $IsWindows) {
        Write-Host "  Using WSL for Linux build..." -ForegroundColor Yellow
        $wslOutput = wsl bash -c "cd /mnt/d/asukacode && bun build --compile --target=$TargetTriple $EntryFile --outfile /mnt/d/asukacode/dist/$OutputName"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  WSL build failed!" -ForegroundColor Red
            return $false
        }
    } else {
        # Native build
        bun build --compile --target=$TargetTriple $EntryFile --outfile $OutputPath
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Build failed!" -ForegroundColor Red
            return $false
        }
    }
    
    # Set icon for Windows
    if ($Platform -eq "win-x64" -and -not $NoIcon) {
        Write-Host "  Setting icon..." -ForegroundColor Yellow
        node scripts/set-icon.mjs $OutputPath ./docs/icon.ico
    }
    
    $Size = (Get-Item $OutputPath).Length / 1MB
    Write-Host "  Built: $OutputPath ($([math]::Round($Size, 2)) MB)" -ForegroundColor Green
    return $true
}

# Build targets
$Success = $true

if ($All -or $Target -eq "all") {
    $Success = $Success -and (Build-Binary "win-x64" "bun-windows-x64" ".exe")
    $Success = $Success -and (Build-Binary "linux-x64" "bun-linux-x64")
} else {
    switch ($Target) {
        "win-x64"     { Build-Binary "win-x64" "bun-windows-x64" ".exe" }
        "linux-x64"   { Build-Binary "linux-x64" "bun-linux-x64" }
    }
}

if ($Success) {
    Write-Host "`nBuild complete! Binaries in: $DistDir" -ForegroundColor Green
    Get-ChildItem $DistDir | ForEach-Object {
        $Size = $_.Length / 1MB
        Write-Host "  $($_.Name) - $([math]::Round($Size, 2)) MB"
    }
} else {
    Write-Host "`nSome builds failed!" -ForegroundColor Red
    exit 1
}
