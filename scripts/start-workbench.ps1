param(
  [int]$Port = 3002,
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

  Start-Process `
    -FilePath $nodePath `
    -ArgumentList @($vinextCli, "dev", "--port", "$Port") `
    -WorkingDirectory $projectPath `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath

  $deadline = (Get-Date).AddSeconds(35)
  while ((Get-Date) -lt $deadline -and -not (Test-WorkbenchPort -TargetPort $Port)) {
    Start-Sleep -Milliseconds 500
  }
}

if (-not (Test-WorkbenchPort -TargetPort $Port)) {
  throw "ATLAS failed to start. Check $stderrPath"
}

if (-not $NoBrowser) {
  Start-Process $url
}

Write-Host "ATLAS started: $url"
