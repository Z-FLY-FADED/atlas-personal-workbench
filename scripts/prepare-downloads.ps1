param([string]$WindowsRuntimeDirectory = '')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
  & node (Join-Path $PSScriptRoot 'write-native-build-manifest.mjs') --check | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Native build verification failed.' }
  $manifest = Get-Content -LiteralPath 'release/flutter/build-manifest.json' -Raw | ConvertFrom-Json
  $version = ($manifest.version -split '\+')[0]
  if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Unsupported distribution version.' }
  if (!$WindowsRuntimeDirectory) {
    $pathsFile = Join-Path $projectRoot '.runtime/toolchains/paths.json'
    if (Test-Path -LiteralPath $pathsFile) {
      $tools = Get-Content -LiteralPath $pathsFile -Raw | ConvertFrom-Json
      $redistRoot = Join-Path (Split-Path -Parent $tools.flutter) 'vs/VC/Redist/MSVC'
      if (Test-Path -LiteralPath $redistRoot) {
        foreach ($toolVersion in (Get-ChildItem -LiteralPath $redistRoot -Directory | Sort-Object Name -Descending)) {
          $x64 = Join-Path $toolVersion.FullName 'x64'
          if (!(Test-Path -LiteralPath $x64)) { continue }
          $crt = Get-ChildItem -LiteralPath $x64 -Directory -Filter 'Microsoft.VC*.CRT' | Select-Object -First 1
          if ($crt) { $WindowsRuntimeDirectory = $crt.FullName; break }
        }
      }
    }
  }
  if (!$WindowsRuntimeDirectory) { throw 'Pass -WindowsRuntimeDirectory with the installed licensed MSVC x64 CRT redist folder.' }
  $runtimeFiles = @('msvcp140.dll','vcruntime140.dll','vcruntime140_1.dll')
  $runtimeEvidence = @()
  foreach ($name in $runtimeFiles) {
    $path = Join-Path $WindowsRuntimeDirectory $name
    $signature = Get-AuthenticodeSignature -LiteralPath $path
    if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation') {
      throw "Unverified Microsoft runtime: $name"
    }
    $runtimeEvidence += [pscustomobject]@{file=$name;version=(Get-Item -LiteralPath $path).VersionInfo.FileVersion;sha256=(Get-FileHash -LiteralPath $path).Hash.ToLowerInvariant();signature='Microsoft Corporation / Valid'}
  }
  $output = Join-Path $projectRoot "release/downloads/v$version"
  if (Test-Path -LiteralPath $output) { throw "Distribution already exists; preserve published bytes: $output" }
  $staging = Join-Path $projectRoot ('.runtime/distribution/' + $version + '-' + [guid]::NewGuid().ToString('N').Substring(0,8))
  $windows = Join-Path $staging 'windows'
  New-Item -ItemType Directory -Path $windows,$output -Force | Out-Null
  $windowsArtifact = $manifest.artifacts | Where-Object { $_.file -like '*WorkSpace-Windows-*.zip' } | Select-Object -First 1
  if (!$windowsArtifact) { throw 'Windows build archive missing from manifest.' }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [IO.Compression.ZipFile]::OpenRead((Join-Path $projectRoot $windowsArtifact.file))
  $originalFileCount = 0
  try {
    foreach ($entry in $archive.Entries) {
      $target = [IO.Path]::GetFullPath((Join-Path $windows $entry.FullName))
      if (!$target.StartsWith([IO.Path]::GetFullPath($windows) + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Archive entry outside staging folder.' }
      if (!$entry.Name) { New-Item -ItemType Directory -Path $target -Force | Out-Null; continue }
      if ($entry.FullName -match '(?i)(flutter_secure_storage\.dat|key\.properties|\.jks$|\.keystore$|\.sqlite|config/(prod|dev)\.json)') { throw 'Private file in build archive.' }
      New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
      [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$target,$false)
      $originalFileCount++
    }
  } finally { $archive.Dispose() }
  foreach ($name in $runtimeFiles) { Copy-Item -LiteralPath (Join-Path $WindowsRuntimeDirectory $name) -Destination (Join-Path $windows $name) }
  $guideName = 'WorkSpace-Quickstart.txt'
  Copy-Item -LiteralPath 'docs/download-and-use.md' -Destination (Join-Path $windows $guideName)
  Copy-Item -LiteralPath 'docs/download-and-use.md' -Destination (Join-Path $output $guideName)
  $zipPath = Join-Path $output "WorkSpace-$version-Windows-x64.zip"
  Compress-Archive -LiteralPath (Get-ChildItem -LiteralPath $windows | Select-Object -ExpandProperty FullName) -DestinationPath $zipPath
  $apkPath = Join-Path $output "WorkSpace-$version-Android.apk"
  Copy-Item -LiteralPath 'release/flutter/WorkSpace-Android.apk' -Destination $apkPath
  $assets = @(Get-ChildItem -LiteralPath $output -File | Sort-Object Name | ForEach-Object {
    [pscustomobject]@{file=$_.Name;bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName).Hash.ToLowerInvariant()}
  })
  $downloadManifest = [pscustomobject]@{version=$manifest.version;nativeSourceSha256=$manifest.sourceSha256;originalWindowsFiles=$originalFileCount;windowsRuntime=$runtimeEvidence;assets=$assets;note='Public test release. Android physical-device and cross-device synchronization acceptance is pending.'}
  $utf8 = [Text.UTF8Encoding]::new($false)
  [IO.File]::WriteAllText((Join-Path $output 'download-manifest.json'),($downloadManifest | ConvertTo-Json -Depth 7),$utf8)
  $checksums = @(Get-ChildItem -LiteralPath $output -File | Sort-Object Name | ForEach-Object { (Get-FileHash -LiteralPath $_.FullName).Hash.ToLowerInvariant() + '  ' + $_.Name })
  [IO.File]::WriteAllText((Join-Path $output 'SHA256SUMS.txt'),(($checksums -join "`n") + "`n"),$utf8)
  Write-Output "Public download files prepared: $output"
  $downloadManifest | ConvertTo-Json -Depth 7
} finally { Pop-Location }
