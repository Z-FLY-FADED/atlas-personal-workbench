param([switch]$Launch)
$ErrorActionPreference = "Stop"
$projectPath = Split-Path -Parent $PSScriptRoot
$executablePath = Join-Path $projectPath "release\flutter\windows\WorkSpace.exe"
if (-not (Test-Path -LiteralPath $executablePath)) {
  throw "WorkSpace executable not found. Run scripts/flutter-app.ps1 -Action build-windows -Config prod first."
}
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "WorkSpace.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $executablePath
$shortcut.WorkingDirectory = Split-Path -Parent $executablePath
$shortcut.IconLocation = "$executablePath,0"
$shortcut.Arguments = ""
$shortcut.WindowStyle = 1
$shortcut.Description = "WorkSpace"
$shortcut.Save()
$verify = $shell.CreateShortcut($shortcutPath)
if ($verify.TargetPath -ne $executablePath -or -not (Test-Path -LiteralPath $shortcutPath)) { throw "Shortcut verification failed." }

# Retire only the managed shortcut for this project; preserve its rollback copy.
$legacyName = "ATLAS " + [char]0x4E2A + [char]0x4EBA + [char]0x5DE5 + [char]0x4F5C + [char]0x53F0 + ".lnk"
$legacyShortcut = Join-Path $desktopPath $legacyName
if (Test-Path -LiteralPath $legacyShortcut) {
  $old = $shell.CreateShortcut($legacyShortcut)
  $legacyExecutable = Join-Path $projectPath "release\flutter\windows\ATLAS.exe"
  if ($old.TargetPath -eq $legacyExecutable -or $old.TargetPath -eq $executablePath) {
    $backup = Join-Path $projectPath ".runtime/backups/before-workspace-brand-20261026"
    New-Item -ItemType Directory -Path $backup -Force | Out-Null
    $saved = Join-Path $backup $legacyName
    Copy-Item -LiteralPath $legacyShortcut -Destination $saved -Force
    if ((Get-FileHash -LiteralPath $legacyShortcut).Hash -ne (Get-FileHash -LiteralPath $saved).Hash) { throw "Shortcut backup mismatch." }
    Remove-Item -LiteralPath $legacyShortcut
  }
}
Write-Host "Desktop shortcut ready: $shortcutPath"
if ($Launch) { Start-Process -FilePath $shortcutPath }
