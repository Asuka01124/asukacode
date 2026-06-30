# AsukaCode Windows Installer
# Usage: irm https://raw.githubusercontent.com/Asuka01124/asukacode/main/scripts/install.ps1 | iex

$ErrorActionPreference = "Stop"
$Repo = "Asuka01124/asukacode"
$Version = "latest"
$InstallDir = "$env:LOCALAPPDATA\asukacode\bin"

Write-Host "Installing AsukaCode..." -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

if ($Version -eq "latest") {
  $Url = "https://github.com/$Repo/releases/latest/download/asukacode-win32-x64.exe"
} else {
  $Url = "https://github.com/$Repo/releases/download/$Version/asukacode-win32-x64.exe"
}

Write-Host "Downloading $Url ..."
$ExePath = "$InstallDir\asukacode.exe"
Invoke-WebRequest -Uri $Url -OutFile $ExePath -UseBasicParsing

$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
  $env:Path = "$env:Path;$InstallDir"
  Write-Host "Added to PATH. Restart your terminal or run:" -ForegroundColor Yellow
  Write-Host "  `$env:Path = [Environment]::GetEnvironmentVariable('Path', 'User')" -ForegroundColor Yellow
}

Write-Host "AsukaCode installed! Run: asukacode" -ForegroundColor Green
