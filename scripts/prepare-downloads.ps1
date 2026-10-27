param(
  [string]$WindowsRuntimeDirectory = '',
  [string]$Repository = 'Z-FLY-FADED/atlas-personal-workbench',
  [ValidateSet('preview','stable')][string]$Channel = 'preview',
  [string]$UpdateNotesFile = ''
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$originalJavaHome = $env:JAVA_HOME
$originalExecutablePath = $env:PATH
Push-Location $projectRoot
try {
  & node (Join-Path $PSScriptRoot 'write-native-build-manifest.mjs') --check | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Native build verification failed.' }
  $manifest = Get-Content -LiteralPath 'release/flutter/build-manifest.json' -Raw | ConvertFrom-Json
  $version = ($manifest.version -split '\+')[0]
  if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Unsupported distribution version.' }
  if ($Repository -notmatch '^[A-Za-z0-9][A-Za-z0-9_.-]*/[A-Za-z0-9][A-Za-z0-9_.-]*$') { throw 'Invalid update repository.' }
  $buildNumber = [int](($manifest.version -split '\+')[1])
  if ($buildNumber -lt 1) { throw 'Update metadata requires a build number.' }
  $tools = Get-Content -LiteralPath (Join-Path $projectRoot '.runtime/toolchains/paths.json') -Raw | ConvertFrom-Json
  $env:JAVA_HOME = $tools.java
  $env:PATH = (Join-Path $tools.java 'bin') + ';' + $env:PATH
  $buildTools = Get-ChildItem -LiteralPath (Join-Path $tools.android 'build-tools') -Directory | Sort-Object Name -Descending | Select-Object -First 1
  $verifyFolder = Join-Path ([IO.Path]::GetTempPath()) ('workspace-update-verifier-' + [guid]::NewGuid().ToString('N').Substring(0,8))
  New-Item -ItemType Directory -Path $verifyFolder | Out-Null
  $verifyApk = Join-Path $verifyFolder 'app.apk'
  Copy-Item -LiteralPath 'release/flutter/WorkSpace-Android.apk' -Destination $verifyApk
  if ((Get-FileHash -LiteralPath $verifyApk).Hash -ne (Get-FileHash -LiteralPath 'release/flutter/WorkSpace-Android.apk').Hash) { throw 'APK verifier staging mismatch.' }
  $badging = & (Join-Path $buildTools.FullName 'aapt.exe') dump badging $verifyApk
  if ($LASTEXITCODE -ne 0) { throw 'Cannot read package identity.' }
  $package = ($badging | Where-Object { $_ -like 'package:*' } | Select-Object -First 1)
  $applicationId = [regex]::Match($package,"name='([^']+)'").Groups[1].Value
  $packageVersion = [regex]::Match($package,"versionName='([^']+)'").Groups[1].Value
  $packageBuild = [regex]::Match($package,"versionCode='([^']+)'").Groups[1].Value
  $signature = & (Join-Path $buildTools.FullName 'apksigner.bat') verify --print-certs $verifyApk
  if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
  $signingHash = [regex]::Match(($signature -join "`n"),'certificate SHA-256 digest: ([a-f0-9]{64})').Groups[1].Value
  if ($applicationId -ne 'com.compus.atlas_workspace' -or $signingHash -ne 'f08c5e9dae09c634aaf57cf441fbb1dee53e5840267369e87a2f9022c4aa85ad') { throw 'Android application identity changed. Refusing an incompatible update.' }
  if ($packageVersion -ne $version -or [int]$packageBuild -ne $buildNumber) { throw 'APK version differs from source version.' }
  $windowsInfo = (Get-Item -LiteralPath 'release/flutter/windows/WorkSpace.exe').VersionInfo
  if ($windowsInfo.ProductName -ne 'WorkSpace' -or $windowsInfo.CompanyName -ne 'com.compus') { throw 'Windows data-directory identity changed.' }
  if ($windowsInfo.ProductVersion -ne $manifest.version) { throw 'Windows runtime version differs from the verified source version.' }
  $clientConfig = Get-Content -LiteralPath 'apps/atlas/config/prod.json' -Raw | ConvertFrom-Json
  $backend = ([Uri]$clientConfig.SUPABASE_URL).GetLeftPart([UriPartial]::Authority).ToLowerInvariant()
  $hasher = [Security.Cryptography.SHA256]::Create()
  try { $backendHash = [BitConverter]::ToString($hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($backend))).Replace('-','').ToLowerInvariant() } finally { $hasher.Dispose() }
  $compatibility = [ordered]@{dataSchema=1;backendSha256=$backendHash;androidApplicationId=$applicationId;androidSigningSha256=$signingHash;windowsProductName=$windowsInfo.ProductName;windowsCompanyName=$windowsInfo.CompanyName}
  $currentManifest = Join-Path $projectRoot 'updates/latest.json'
  if (Test-Path -LiteralPath $currentManifest) {
    $previous = (Get-Content -LiteralPath $currentManifest -Raw -Encoding UTF8 | ConvertFrom-Json).dataCompatibility
    if ($previous) { foreach ($field in $compatibility.Keys) { if ($previous.$field -ne $compatibility[$field]) { throw "Update data compatibility changed: $field" } } }
  }
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
  if (!$UpdateNotesFile) { $UpdateNotesFile = Join-Path $projectRoot "docs/release-$version.md" }
  $notes = if (Test-Path -LiteralPath $UpdateNotesFile) { (Get-Content -LiteralPath $UpdateNotesFile -Raw -Encoding UTF8) -replace '(?m)^#.*\r?\n','' } else { "WorkSpace $version" }
  $notes = $notes.Trim()
  if (!$notes -or $notes.Length -gt 8000) { throw 'Update notes must contain 1-8000 characters.' }
  $platforms = [ordered]@{}
  foreach ($platform in @('windows','android')) {
    $fileName = if ($platform -eq 'windows') { "WorkSpace-$version-Windows-x64.zip" } else { "WorkSpace-$version-Android.apk" }
    $asset = $assets | Where-Object { $_.file -eq $fileName } | Select-Object -First 1
    if (!$asset) { throw 'Update package missing.' }
    $platforms[$platform] = [ordered]@{url="https://github.com/$Repository/releases/download/v$version/$fileName";sha256=$asset.sha256;sizeBytes=$asset.bytes}
  }
  $update = [ordered]@{schemaVersion=1;channel=$Channel;version=$version;buildNumber=$buildNumber;publishedAt=[DateTime]::UtcNow.ToString('o');notes=$notes;releaseUrl="https://github.com/$Repository/releases/tag/v$version";dataCompatibility=$compatibility;platforms=$platforms}
  [IO.File]::WriteAllText((Join-Path $output 'update.json'),($update | ConvertTo-Json -Depth 7),$utf8)
  $checksums = @(Get-ChildItem -LiteralPath $output -File | Sort-Object Name | ForEach-Object { (Get-FileHash -LiteralPath $_.FullName).Hash.ToLowerInvariant() + '  ' + $_.Name })
  [IO.File]::WriteAllText((Join-Path $output 'SHA256SUMS.txt'),(($checksums -join "`n") + "`n"),$utf8)
  Write-Output "Public download files prepared: $output"
  $downloadManifest | ConvertTo-Json -Depth 7
} finally { $env:JAVA_HOME=$originalJavaHome; $env:PATH=$originalExecutablePath; Pop-Location }
