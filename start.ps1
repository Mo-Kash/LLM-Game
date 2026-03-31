# Start all services in the current IDE terminal as background jobs
# Combined output with prefixes, colors, and clean UTF-8 formatting

# Force UTF-8 at the system level
chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$RootPath = $PSScriptRoot

# Colors for each service
$Colors = @{
    "Backend-API"   = "Cyan"
    "Frontend"      = "Blue"
}

# Cleanup function to stop background jobs when this script exits
function Stop-All-Jobs {
    Write-Host "`nStopping all background services..." -ForegroundColor Red
    Get-Job | Stop-Job
    Get-Job | Remove-Job -Force
    Write-Host "All jobs stopped." -ForegroundColor Green
}

# Trap Ctrl+C (SIGINT) and other termination to clean up
trap { Stop-All-Jobs; exit }

Write-Host "Cleaning up old processes and ports..." -ForegroundColor Gray
Get-Job | Remove-Job -Force

# Kill processes on port 8000 (Backend)
$BackendPort = 8000
$BackendPID = Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1
if ($BackendPID) {
    Write-Host "Killing process $BackendPID on port $BackendPort..." -ForegroundColor Yellow
    Stop-Process -Id $BackendPID -Force -ErrorAction SilentlyContinue
}

# Kill processes on port 8080 (Frontend)
$FrontendPort = 8080
$FrontendPID = Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1
if ($FrontendPID) {
    Write-Host "Killing process $FrontendPID on port $FrontendPort..." -ForegroundColor Yellow
    Stop-Process -Id $FrontendPID -Force -ErrorAction SilentlyContinue
}

Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray
Write-Host "Starting LLM Game Services" -ForegroundColor White
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray

# Define services
$Services = @(
    @{ Name = "Backend-API";   Path = "$RootPath\Backend";       Cmd = "..\.venv\Scripts\python.exe server.py 2>&1" },
    @{ Name = "Frontend";      Path = "$RootPath\Frontend";      Cmd = "npm run dev 2>&1" }
)

# Launch each service as a background job
foreach ($Service in $Services) {
    Write-Host "Launching [$($Service.Name)]..." -ForegroundColor Gray
    Start-Job -Name $Service.Name -ScriptBlock {
        Param($Path, $Cmd)
        # Force UTF-8 encoding INSIDE the job process
        chcp 65001 | Out-Null
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $OutputEncoding = [System.Text.Encoding]::UTF8
        
        # Ensure common dev tools use UTF-8/Colors
        $env:PYTHONIOENCODING = "utf-8"
        $env:FORCE_COLOR = "1"
        
        Set-Location $Path
        Invoke-Expression $Cmd
    } -ArgumentList $Service.Path, $Service.Cmd | Out-Null
}

# Automatically open the browser for the frontend
Write-Host "`nOpening browser at http://localhost:8080..." -ForegroundColor Gray
Start-Process "http://localhost:8080"

Write-Host "`nReady! Combined logs below (Ctrl+C to quit):" -ForegroundColor White
Write-Host "----------------------------------------------------------------------`n"

# Real-time combined output loop with prefixes
try {
    while ($true) {
        foreach ($Service in $Services) {
            $Job = Get-Job -Name $Service.Name
            $Outputs = $Job | Receive-Job
            if ($Outputs) {
                foreach ($Line in $Outputs) {
                    # Filter out the messy PowerShell 'NativeCommandError' / RemoteException wrappers
                    if ($Line -is [System.Management.Automation.ErrorRecord]) {
                        $ActualMsg = $Line.Exception.Message
                        if ($ActualMsg) { $Line = $ActualMsg }
                    }
                    
                    if ($Line.ToString().Trim()) {
                        Write-Host "[$($Service.Name)] " -NoNewline -ForegroundColor $Colors[$Service.Name]
                        Write-Host $Line
                    }
                }
            }
        }
        Start-Sleep -Milliseconds 100
    }
}
finally {
    Stop-All-Jobs
}
