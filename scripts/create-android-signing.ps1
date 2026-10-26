param([string]$Alias='atlas')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$tools=Get-Content -LiteralPath (Join-Path $projectRoot '.runtime/toolchains/paths.json') -Raw|ConvertFrom-Json
$androidRoot=Join-Path $projectRoot 'apps/atlas/android'
$keyFile=Join-Path $androidRoot 'atlas-release.jks'
$propertiesFile=Join-Path $androidRoot 'key.properties'
if((Test-Path -LiteralPath $keyFile) -or (Test-Path -LiteralPath $propertiesFile)){throw 'Signing material already exists; nothing was overwritten.'}
$backup=Join-Path $projectRoot ('.runtime/signing-backup-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
$env:ATLAS_SIGNING_PASSWORD=[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(30))
try{
  & "$($tools.java)/bin/keytool.exe" -genkeypair -keystore $keyFile -storetype JKS -keyalg RSA -keysize 3072 -validity 10000 -alias $Alias -storepass:env ATLAS_SIGNING_PASSWORD -keypass:env ATLAS_SIGNING_PASSWORD -dname 'CN=ATLAS Workspace, OU=Personal Apps, O=ATLAS, C=CN'
  if($LASTEXITCODE -ne 0){throw 'Signing key generation failed.'}
  $properties="storePassword=$env:ATLAS_SIGNING_PASSWORD`nkeyPassword=$env:ATLAS_SIGNING_PASSWORD`nkeyAlias=$Alias`nstoreFile=../atlas-release.jks`n"
  [IO.File]::WriteAllText($propertiesFile,$properties,[Text.UTF8Encoding]::new($false))
  New-Item -ItemType Directory -Path $backup -Force|Out-Null
  Copy-Item -LiteralPath $keyFile,$propertiesFile -Destination $backup
  Write-Output "Android release signing created. Local backup: $backup"
  Write-Output 'Keep the key and password for future updates. They are ignored by Git. Do not share them.'
}finally{Remove-Item Env:\ATLAS_SIGNING_PASSWORD -ErrorAction SilentlyContinue}
