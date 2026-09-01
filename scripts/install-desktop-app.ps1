param(
  [switch]$Launch
)

$ErrorActionPreference = "Stop"
$projectPath = Split-Path -Parent $PSScriptRoot
$packageJsonPath = Join-Path $projectPath "package.json"
$packageJson = [IO.File]::ReadAllText($packageJsonPath, [Text.Encoding]::UTF8) | ConvertFrom-Json
$executablePath = Join-Path $projectPath "release\ATLAS-Workspace-$($packageJson.version).exe"

if (-not (Test-Path -LiteralPath $executablePath)) {
  throw "Desktop executable not found. Run pnpm desktop:build first."
}

$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutName = "ATLAS " + [char]0x4E2A + [char]0x4EBA + [char]0x5DE5 + [char]0x4F5C + [char]0x53F0 + ".lnk"
$shortcutPath = Join-Path $desktopPath $shortcutName
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $executablePath
$shortcut.WorkingDirectory = $projectPath
$shortcut.IconLocation = "$executablePath,0"
$shortcut.WindowStyle = 1
$shortcut.Description = "ATLAS Workspace Desktop"
$shortcut.Save()

Write-Host "Desktop shortcut created: $shortcutPath"

if ($Launch) {
  Start-Process -FilePath $executablePath -WorkingDirectory $projectPath
}
