param([string]$Repository = 'Z-FLY-FADED/atlas-personal-workbench')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if ($Repository -notmatch '^[A-Za-z0-9][A-Za-z0-9_.-]*/[A-Za-z0-9][A-Za-z0-9_.-]*$') { throw 'Invalid repository.' }
$versionLine = [regex]::Match((Get-Content -LiteralPath (Join-Path $projectRoot 'apps/atlas/pubspec.yaml') -Raw),'(?m)^version:\s*(\d+\.\d+\.\d+)\+(\d+)\s*$')
if (!$versionLine.Success) { throw 'Missing source version and build number.' }
$version = $versionLine.Groups[1].Value
$buildNumber = [int]$versionLine.Groups[2].Value
$source = Join-Path $projectRoot "release/downloads/v$version/update.json"
$text = Get-Content -LiteralPath $source -Raw -Encoding UTF8
$update = $text | ConvertFrom-Json
if ($update.schemaVersion -ne 1 -or $update.version -ne $version -or $update.buildNumber -ne $buildNumber) { throw 'Update metadata does not match source version.' }
if ($update.channel -notin @('preview','stable') -or $update.notes.Length -gt 8000 -or !$update.notes.Trim()) { throw 'Invalid update content.' }
if ($update.releaseUrl -cne "https://github.com/$Repository/releases/tag/v$version") { throw 'Unexpected release URL.' }
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repository/releases/tags/v$version" -Headers @{Accept='application/vnd.github+json';'User-Agent'='WorkSpace-release-validator'} -TimeoutSec 30
if ($release.draft -or $release.tag_name -ne "v$version" -or !$release.published_at) { throw 'Release is not public. Leave the update endpoint unchanged.' }
if (($update.channel -eq 'preview') -ne [bool]$release.prerelease) { throw 'Update channel and release visibility differ.' }
foreach ($platform in @('windows','android')) {
  $fileName = if ($platform -eq 'windows') { "WorkSpace-$version-Windows-x64.zip" } else { "WorkSpace-$version-Android.apk" }
  $entry = $update.platforms.$platform
  $url = "https://github.com/$Repository/releases/download/v$version/$fileName"
  $remote = @($release.assets | Where-Object { $_.name -eq $fileName -and $_.browser_download_url -ceq $url })
  if ($remote.Count -ne 1 -or $entry.url -cne $url -or $entry.sha256 -notmatch '^[a-f0-9]{64}$' -or $entry.sizeBytes -le 0) { throw 'Platform package metadata is missing or invalid.' }
  if ($remote[0].digest -ne "sha256:$($entry.sha256)" -or $remote[0].size -ne $entry.sizeBytes) { throw 'Public package differs from the prepared update.' }
}
$manifestAsset = @($release.assets | Where-Object { $_.name -eq 'update.json' })
if ($manifestAsset.Count -ne 1 -or $manifestAsset[0].digest -ne ('sha256:' + (Get-FileHash -LiteralPath $source).Hash.ToLowerInvariant())) { throw 'Public update.json differs from the local manifest.' }
$folder = Join-Path $projectRoot 'updates'
$target = Join-Path $folder 'latest.json'
if (Test-Path -LiteralPath $target) {
  $old = Get-Content -LiteralPath $target -Raw -Encoding UTF8 | ConvertFrom-Json
  if ([int]$old.buildNumber -gt $buildNumber) { throw 'Refusing to roll the update endpoint back to an older build.' }
  if ($old.dataCompatibility) {
    foreach ($field in @('dataSchema','backendSha256','androidApplicationId','androidSigningSha256','windowsProductName','windowsCompanyName')) {
      if ($old.dataCompatibility.$field -ne $update.dataCompatibility.$field) { throw "Data compatibility mismatch: $field" }
    }
  }
}
New-Item -ItemType Directory -Path $folder -Force | Out-Null
$temporary = Join-Path $folder ('latest-' + [guid]::NewGuid().ToString('N') + '.tmp')
[IO.File]::WriteAllText($temporary,$text,[Text.UTF8Encoding]::new($false))
Move-Item -LiteralPath $temporary -Destination $target -Force
Write-Output "Update endpoint prepared for v$version. Commit and push updates/latest.json to make it live."
