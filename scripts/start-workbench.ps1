param(
  [ValidateRange(1, 65535)][int]$Port = 3002,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$projectPath = Split-Path -Parent $PSScriptRoot
$runtimePath = Join-Path $projectPath ".runtime"
$stdoutPath = Join-Path $runtimePath "workbench.out.log"
$stderrPath = Join-Path $runtimePath "workbench.err.log"
$url = "http://localhost:$Port/"

function Test-WorkbenchPort {
  param([int]$TargetPort)

  return [bool](Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue)
}

function Test-WorkbenchReady {
  try {
    $health = Invoke-RestMethod -Uri "http://localhost:$Port/api/health" -TimeoutSec 2
    return ($health.service -eq 'atlas-workspace' -and $health.ready -eq $true)
  } catch { return $false }
}

$startedServer = $false

if (-not (Test-WorkbenchPort -TargetPort $Port)) {
  New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
  $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  $nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:ProgramFiles "nodejs\node.exe" }
  $vinextCli = Join-Path $projectPath "node_modules\vinext\dist\cli.js"

  if (-not (Test-Path -LiteralPath $nodePath)) {
    throw "Node.js is not installed. ATLAS cannot start."
  }
  if (-not (Test-Path -LiteralPath $vinextCli)) {
    throw "Workspace dependencies are missing. Run pnpm install first."
  }
  $vinextArgument = '"' + $vinextCli + '"'

  Start-Process `
    -FilePath $nodePath `
    -ArgumentList @($vinextArgument, "dev", "--port", "$Port", "--strictPort") `
    -WorkingDirectory $projectPath `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath

  $startedServer = $true
}

if (-not $startedServer -and -not (Test-WorkbenchReady)) {
  throw "Port $Port is occupied, but a ready ATLAS service was not found. Check $stderrPath or choose another port."
}

$deadline = (Get-Date).AddSeconds(45)
while (-not (Test-WorkbenchReady)) {
  if ((Get-Date) -ge $deadline) { throw "ATLAS failed to become ready. Check $stderrPath and apply local database migrations if needed." }
  Start-Sleep -Milliseconds 500
}

if (-not $NoBrowser) {
  Start-Process $url
}

Write-Host "ATLAS started: $url"
