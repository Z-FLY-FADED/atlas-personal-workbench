#requires -Version 7.0
param([switch]$Apply, [string]$PlanPath='outputs/cleanup-20261026/cleanup-plan.json')
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd('\')
$prefix=$root+'\'
$evidence=Join-Path $root 'outputs/cleanup-20261026'
New-Item -ItemType Directory -Path $evidence -Force | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Resolve-SafePath([string]$Relative) {
  $full=[IO.Path]::GetFullPath((Join-Path $root $Relative))
  if(!$full.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){throw "Outside workspace: $Relative"}
  $current=$full
  while($current -ne $root){
    if(Test-Path -LiteralPath $current){
      if((Get-Item -LiteralPath $current -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Linked target or ancestor: $Relative"}
    }
    $current=Split-Path -Parent $current
  }
  return $full
}
function Relative-Path([string]$Full){return [IO.Path]::GetRelativePath($root,$Full).Replace('\','/')}
function Get-Tree([string]$Full) {
  $item=Get-Item -LiteralPath $Full -Force
  $stack=[Collections.Generic.Stack[object]]::new()
  $stack.Push($item)
  while($stack.Count){
    $next=$stack.Pop()
    if($next.Attributes -band [IO.FileAttributes]::ReparsePoint){$next;continue}
    if($next.PSIsContainer){foreach($child in Get-ChildItem -LiteralPath $next.FullName -Force){$stack.Push($child)}}else{$next}
  }
}
function File-Sha([string]$Full){return (Get-FileHash -LiteralPath $Full -Algorithm SHA256).Hash.ToLowerInvariant()}
function Write-VerifiedZip([string]$Relative, [object[]]$Files, [object[]]$Links=@()) {
  $destination=Resolve-SafePath $Relative
  if(Test-Path -LiteralPath $destination){throw "Archive already exists: $Relative"}
  New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
  $expected=@{}
  $archive=[IO.Compression.ZipFile]::Open($destination,[IO.Compression.ZipArchiveMode]::Create)
  try{
    foreach($file in ($Files | Sort-Object FullName -Unique)){
      $name=Relative-Path $file.FullName
      $expected[$name]=File-Sha $file.FullName
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$file.FullName,$name,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
    if($Links.Count){
      $entry=$archive.CreateEntry('__atlas_archive_links.json')
      $writer=[IO.StreamWriter]::new($entry.Open(),[Text.UTF8Encoding]::new($false))
      try{$writer.Write(($Links | ConvertTo-Json -Depth 4))}finally{$writer.Dispose()}
    }
  }finally{$archive.Dispose()}
  $archive=[IO.Compression.ZipFile]::OpenRead($destination)
  try{
    foreach($name in $expected.Keys){
      $entry=$archive.GetEntry($name)
      if(!$entry){throw "Missing archived file: $name"}
      $stream=$entry.Open();$sha=[Security.Cryptography.SHA256]::Create()
      try{$actual=[Convert]::ToHexString($sha.ComputeHash($stream)).ToLowerInvariant()}finally{$stream.Dispose();$sha.Dispose()}
      if($actual -ne $expected[$name]){throw "Archive content mismatch: $name"}
    }
  }finally{$archive.Dispose()}
  return [pscustomobject]@{path=$Relative;files=$expected.Count;bytes=(Get-Item -LiteralPath $destination).Length;sha256=(File-Sha $destination);verified=$true;links=$Links.Count}
}

$planFile=Resolve-SafePath $PlanPath
if(!$Apply){
  $manifest=Get-Content -LiteralPath (Join-Path $root 'release/flutter/build-manifest.json') -Raw | ConvertFrom-Json
  $version=(Select-String -LiteralPath (Join-Path $root 'apps/atlas/pubspec.yaml') -Pattern '^version:').Line.Split(':',2)[1].Trim()
  if($manifest.version -ne $version){throw 'Build manifest does not match the latest source version.'}
  foreach($artifact in $manifest.artifacts){if((File-Sha (Resolve-SafePath $artifact.file)) -ne $artifact.sha256){throw "Artifact mismatch: $($artifact.file)"}}
  $latestZip=($manifest.artifacts | Where-Object {$_.file -like 'release/flutter/ATLAS-Windows-*.zip'}).file
  if(!$latestZip){throw 'No current Windows distribution recorded.'}
  $targets=[Collections.Generic.List[object]]::new()
  function Add-Target([string]$Relative,[string]$Action,[string]$Reason){
    $full=Resolve-SafePath $Relative
    if(!(Test-Path -LiteralPath $full)){return}
    $tree=@(Get-Tree $full)
    $files=@($tree | Where-Object {!($_.Attributes -band [IO.FileAttributes]::ReparsePoint)})
    $links=@($tree | Where-Object {$_.Attributes -band [IO.FileAttributes]::ReparsePoint})
    $targets.Add([pscustomobject]@{path=$Relative.Replace('\','/');action=$Action;reason=$Reason;bytes=[long](($files | Measure-Object Length -Sum).Sum);files=$files.Count;links=$links.Count})
  }
  foreach($path in @('.runtime/toolchains/flutter','.runtime/toolchains/android','.runtime/toolchains/pub-cache','.runtime/toolchains/flutter.zip','.runtime/toolchains/android-tools.zip','.runtime/toolchains/jdk.zip','.runtime/toolchains/vs_BuildTools.exe')){Add-Target $path 'delete' 'Unused duplicate SDK or downloaded installer; configured SDK lives outside this workspace.'}
  foreach($path in @('.runtime/desktop-update-build-20261021','release/win-unpacked','release/builder-debug.yml','.runtime/offline-verify-state','.runtime/phase2-verify-state','.runtime/refactor-verify-state','.runtime/round2-verify-state','.runtime/testing-state-20261021','.runtime/verify-state','.vinext','node_modules/.vite','dist','tsconfig.tsbuildinfo','.codex-dev.log')){Add-Target $path 'delete' 'Obsolete generated build, isolated test state or regenerable cache.'}
  foreach($file in Get-ChildItem -LiteralPath (Join-Path $root 'release') -File -Filter 'ATLAS-Workspace-*.exe'){Add-Target (Relative-Path $file.FullName) 'delete' 'Superseded Electron installer.'}
  foreach($file in Get-ChildItem -LiteralPath (Join-Path $root 'release/flutter') -File -Filter 'ATLAS-Windows-*.zip'){if((Relative-Path $file.FullName) -ne $latestZip){Add-Target (Relative-Path $file.FullName) 'delete' 'Superseded native Windows distribution.'}}
  foreach($path in @('.build_midterm','.github-upload','doc-build','output','tmp','ui-research','outputs/audit-20261010','outputs/framework-refactor-20261012','outputs/offline-20261013','outputs/testing-20261021')){Add-Target $path 'archive' 'Historical source materials or reports; preserve verified ZIP contents before removing loose copies.'}
  foreach($name in @('本轮修改与验收-2026-09-15.md','第二阶段更新与验收-2026-09-16.md','工作台改进与GitHub项目建议-2026-09-15.md','工作台检查与优化建议-2026-09-14.md','检查与优化更新-2026-10-10.md','修复与验收记录-2026-09-14.md','修改建议.md')){Add-Target $name 'archive' 'Historical planning or acceptance notes.'}
  foreach($item in Get-ChildItem -LiteralPath (Join-Path $root '.runtime') -File){Add-Target (Relative-Path $item.FullName) 'archive' 'Historical one-time helper or log.'}
  foreach($item in Get-ChildItem -LiteralPath (Join-Path $root '.runtime/backups') -Directory){if($item.Name -notin @('before-flutter-data-20261026','data-before-cleanup-20261026')){Add-Target (Relative-Path $item.FullName) 'archive-backup' 'Preserve historical source and database contents in ZIP; discard superseded executable/ZIP/APK copies.'}}
  foreach($name in @('tests-initial.log','tests-layout.log','tests.log','analyze-final.log')){Add-Target ('outputs/ui-20261026/'+$name) 'delete' 'Intermediate UI validation log superseded by final passing logs.'}
  $sourceRoots=@('app','apps','db','desktop','docs','migrations','public','scripts','supabase','tests','worker','build','examples','.github','.openai')
  $sourceFiles=@(foreach($sourceRoot in $sourceRoots){Get-Tree (Resolve-SafePath $sourceRoot) | Where-Object {!($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -and $_.FullName -notmatch '[\\/](\.dart_tool|ephemeral|\.gradle|\.cxx)[\\/]'}})
  $sourceFiles+=@(Get-ChildItem -LiteralPath $root -File -Force | Where-Object {$_.Name -notin @('tsconfig.tsbuildinfo','.codex-dev.log') -and $_.Name -notin ($targets | Where-Object {$_.action -eq 'archive'}).path})
  $protectedFiles=@($sourceFiles)
  foreach($keep in @('.runtime/flutter-migration','.runtime/signing-backup-20261026-113516','.runtime/backups/before-flutter-data-20261026','.runtime/backups/data-before-cleanup-20261026','.runtime/sites-data-sync','release/flutter/windows',$latestZip,'release/flutter/ATLAS-Android.apk','release/flutter/build-manifest.json','.runtime/toolchains/paths.json','.runtime/toolchains/gradle-9.3.1-bin.zip','.runtime/toolchains/gradle.sha256')){$protectedFiles+=@(Get-Tree (Resolve-SafePath $keep) | Where-Object {!($_.Attributes -band [IO.FileAttributes]::ReparsePoint)})}
  $protected=@($protectedFiles | Sort-Object FullName -Unique | ForEach-Object {[pscustomobject]@{path=(Relative-Path $_.FullName);sha256=(File-Sha $_.FullName)}})
  $toolPaths=Get-Content -LiteralPath (Join-Path $root '.runtime/toolchains/paths.json') -Raw | ConvertFrom-Json
  foreach($property in $toolPaths.PSObject.Properties){if(!(Test-Path -LiteralPath $property.Value)){throw "Configured tool path missing: $($property.Name)"};foreach($target in $targets){$candidate=Resolve-SafePath $target.path;if($property.Value.StartsWith($candidate,[StringComparison]::OrdinalIgnoreCase)){throw "Configured SDK overlaps a cleanup target: $($target.path)"}}}
  $stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
  $plan=[pscustomobject]@{root=$root;version=$version;createdAt=(Get-Date).ToString('o');latestWindowsArchive=$latestZip;sourceArchive=".runtime/backups/latest-source-$stamp.zip";historyArchive=".runtime/archives/history-$stamp.zip";sourceFiles=@($sourceFiles | ForEach-Object {Relative-Path $_.FullName} | Sort-Object -Unique);protected=$protected;targets=@($targets)}
  $plan | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath $planFile -Encoding utf8
  [pscustomobject]@{version=$version;targets=$targets.Count;bytesBeforeCompression=($targets | Measure-Object bytes -Sum).Sum;protectedFiles=$protected.Count;latestWindowsArchive=$latestZip;plan=$planFile} | ConvertTo-Json
  return
}

$plan=Get-Content -LiteralPath $planFile -Raw | ConvertFrom-Json
if($plan.root -ne $root){throw 'Plan belongs to a different workspace.'}
foreach($target in $plan.targets){
  $null=Resolve-SafePath $target.path
  foreach($protected in $plan.protected){if($protected.path -eq $target.path -or $protected.path.StartsWith($target.path.TrimEnd('/')+'/',[StringComparison]::OrdinalIgnoreCase)){throw "Cleanup target overlaps protected files: $($target.path)"}}
}
foreach($file in $plan.protected){if((File-Sha (Resolve-SafePath $file.path)) -ne $file.sha256){throw "Protected file changed since plan: $($file.path)"}}
$archives=[Collections.Generic.List[object]]::new()
$archives.Add((Write-VerifiedZip $plan.sourceArchive @($plan.sourceFiles | ForEach-Object {Get-Item -LiteralPath (Resolve-SafePath $_) -Force})))
$historyFiles=[Collections.Generic.List[object]]::new()
$historyLinks=[Collections.Generic.List[object]]::new()
foreach($target in $plan.targets | Where-Object {$_.action -like 'archive*'}){
  foreach($item in Get-Tree (Resolve-SafePath $target.path)){
    if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){$historyLinks.Add([pscustomobject]@{path=(Relative-Path $item.FullName);target=$item.Target});continue}
    if($target.action -eq 'archive-backup' -and $item.Extension -in @('.exe','.dll','.apk','.zip')){continue}
    $historyFiles.Add($item)
  }
}
$archives.Add((Write-VerifiedZip $plan.historyArchive @($historyFiles) @($historyLinks)))
$archives | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $evidence 'verified-archives.json') -Encoding utf8
$results=[Collections.Generic.List[object]]::new()
foreach($target in $plan.targets){
  try{
    $full=Resolve-SafePath $target.path
    $links=@(Get-Tree $full | Where-Object {$_.Attributes -band [IO.FileAttributes]::ReparsePoint} | Sort-Object { $_.FullName.Length } -Descending)
    foreach($link in $links){if($link.PSIsContainer){[IO.Directory]::Delete($link.FullName)}else{[IO.File]::Delete($link.FullName)}}
    Remove-Item -LiteralPath $full -Recurse -Force
    if(Test-Path -LiteralPath $full){throw 'Target still exists.'}
    $results.Add([pscustomobject]@{path=$target.path;action=$target.action;status='removed';bytes=$target.bytes})
  }catch{$results.Add([pscustomobject]@{path=$target.path;action=$target.action;status='failed';bytes=0;error=$_.Exception.Message})}
}
$issues=@(foreach($file in $plan.protected){try{if((File-Sha (Resolve-SafePath $file.path)) -ne $file.sha256){$file.path}}catch{$file.path}})
$summary=[pscustomobject]@{version=$plan.version;completedAt=(Get-Date).ToString('o');results=@($results);removedBytes=($results | Measure-Object bytes -Sum).Sum;archiveBytes=($archives | Measure-Object bytes -Sum).Sum;netBytesFreed=(($results | Measure-Object bytes -Sum).Sum-($archives | Measure-Object bytes -Sum).Sum);protectedFiles=$plan.protected.Count;preservationIssues=$issues;failedTargets=@($results | Where-Object {$_.status -eq 'failed'});archives=@($archives)}
$summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $evidence 'cleanup-result.json') -Encoding utf8
$summary | Select-Object version,removedBytes,archiveBytes,netBytesFreed,protectedFiles,preservationIssues,failedTargets | ConvertTo-Json -Depth 5
if($issues.Count -or $summary.failedTargets.Count){throw 'Review cleanup-result.json for incomplete cleanup or preservation failures.'}
