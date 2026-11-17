param(
    [switch]$Startup
)

$ErrorActionPreference = "Stop"

Write-Host "=== Desk Telemetry Daemon Setup ===" -ForegroundColor Cyan

# 1. Verify Python is available on PATH
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python is not found on PATH. Please install Python 3.10+ and ensure it is added to PATH."
    exit 1
}

$pythonVersion = & python --version 2>&1
Write-Host "Found Python: $pythonVersion" -ForegroundColor Green

$repoRoot = $PSScriptRoot

# 2. Create virtual environment if it does not exist
$venvPath = Join-Path $repoRoot "venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "Creating virtual environment in $venvPath..." -ForegroundColor Yellow
    python -m venv venv
} else {
    Write-Host "Virtual environment already exists at $venvPath." -ForegroundColor Green
}

$pipPath = Join-Path $venvPath "Scripts\pip.exe"
$pythonwPath = Join-Path $venvPath "Scripts\pythonw.exe"
$trayScriptPath = Join-Path $repoRoot "tray.py"

# 3. Upgrade pip and install requirements
Write-Host "Upgrading pip and installing dependencies from requirements.txt..." -ForegroundColor Yellow
& $pipPath install --upgrade pip --quiet
& $pipPath install -r (Join-Path $repoRoot "requirements.txt")

# 4. Create shortcut
$targetFolder = if ($Startup) {
    [Environment]::GetFolderPath("Startup")
} else {
    [Environment]::GetFolderPath("Desktop")
}

$shortcutPath = Join-Path $targetFolder "Desk Telemetry.lnk"
Write-Host "Creating shortcut at: $shortcutPath" -ForegroundColor Yellow

$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $pythonwPath
$Shortcut.Arguments = "`"$trayScriptPath`""
$Shortcut.WorkingDirectory = $repoRoot
$Shortcut.Description = "Desk Telemetry Daemon System Tray"
$Shortcut.Save()

Write-Host "`nSetup completed successfully!" -ForegroundColor Green
if ($Startup) {
    Write-Host "Desk Telemetry has been configured to start automatically on Windows startup." -ForegroundColor Cyan
} else {
    Write-Host "Desk Telemetry shortcut has been created on your Desktop." -ForegroundColor Cyan
}
Write-Host "You can now launch Desk Telemetry from your Desktop shortcut or run setup with -Startup to run at boot." -ForegroundColor Cyan
