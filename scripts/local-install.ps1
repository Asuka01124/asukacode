$InstallDir = "$env:LOCALAPPDATA\asukacode\bin"
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

$Src = Join-Path $PSScriptRoot "..\asukacode-win32-x64.exe"
if (-not (Test-Path $Src)) {
  Write-Host "Error: asukacode-win32-x64.exe not found. Run 'bun run compile' first." -ForegroundColor Red
  exit 1
}

Copy-Item $Src "$InstallDir\asukacode.exe" -Force

$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
  $env:Path = "$env:Path;$InstallDir"
}

Write-Host "AsukaCode installed! Run: asukacode" -ForegroundColor Green
