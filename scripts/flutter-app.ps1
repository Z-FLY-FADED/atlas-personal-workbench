param(
  [ValidateSet('doctor','get','analyze','test','run-windows','run-android','build-windows','build-apk')]
  [string]$Action='doctor',
  [string]$Config='dev',
  [string]$Device='',
  [string]$FlutterSdk='',
  [string]$AndroidSdk='',
  [string]$JavaHome='',
  [string]$MigrationArchives=''
)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$appRoot=Join-Path $projectRoot 'apps/atlas'
$temporaryTools=Join-Path ([IO.Path]::GetTempPath()) 'atlas-toolchains-20261026'
$savedPaths=Join-Path $projectRoot '.runtime/toolchains/paths.json'
$toolPaths=if(Test-Path -LiteralPath $savedPaths){Get-Content -LiteralPath $savedPaths -Raw|ConvertFrom-Json}else{$null}
if(!$FlutterSdk -and $toolPaths){$FlutterSdk=$toolPaths.flutter}
if(!$FlutterSdk){
  foreach($candidate in @($env:FLUTTER_ROOT,(Join-Path $temporaryTools 'flutter'),(Join-Path $projectRoot '.runtime/toolchains/flutter'))){
    if($candidate -and (Test-Path -LiteralPath (Join-Path $candidate 'bin/flutter.bat'))){$FlutterSdk=$candidate;break}
  }
}
if(!$FlutterSdk){$command=Get-Command flutter -ErrorAction SilentlyContinue;if($command){$FlutterSdk=Split-Path -Parent (Split-Path -Parent $command.Source)}}
if(!$FlutterSdk){throw 'Flutter SDK not found. Install Flutter or pass -FlutterSdk.'}
$flutter=Join-Path $FlutterSdk 'bin/flutter.bat'
$env:PUB_CACHE=if($toolPaths){$toolPaths.pubCache}else{Join-Path $temporaryTools 'pub-cache'}
$env:FLUTTER_SUPPRESS_ANALYTICS='true'
$env:CI='true'
if(!$AndroidSdk -and $toolPaths){$AndroidSdk=$toolPaths.android}
if(!$AndroidSdk){foreach($candidate in @((Join-Path $temporaryTools 'android'),$env:ANDROID_HOME,(Join-Path $env:LOCALAPPDATA 'Android/Sdk'))){if($candidate -and (Test-Path -LiteralPath $candidate)){$AndroidSdk=$candidate;break}}}
if($AndroidSdk){$env:ANDROID_HOME=$AndroidSdk;$env:ANDROID_SDK_ROOT=$AndroidSdk}
if(!$JavaHome -and $toolPaths){$JavaHome=$toolPaths.java}
if(!$JavaHome){$jdk=Get-ChildItem -LiteralPath $temporaryTools -Directory -Filter 'jdk-*' -ErrorAction SilentlyContinue|Select-Object -First 1;if($jdk){$JavaHome=$jdk.FullName}}
if($JavaHome){$env:JAVA_HOME=$JavaHome;$env:PATH=(Join-Path $JavaHome 'bin')+';'+$env:PATH}
$env:GRADLE_USER_HOME=Join-Path (Split-Path -Parent $FlutterSdk) 'gradle-cache'
$configPath=Join-Path $appRoot "config/$Config.json"
if($Action -match '^(run|build)-'){
  if(!(Test-Path -LiteralPath $configPath)){throw "Missing config: $configPath"}
  $settings=Get-Content -LiteralPath $configPath -Raw|ConvertFrom-Json
  if($settings.SUPABASE_URL -notmatch '^https://' -or $settings.SUPABASE_PUBLISHABLE_KEY -notlike 'sb_publishable_*'){throw 'Use an HTTPS project URL and Publishable Key. Secret keys are forbidden in app builds.'}
}

# Use ASCII paths for Dart's LSP and Android/Windows native build tools.
$executionRoot=$appRoot
if($Action -notin @('doctor','get')){
  $executionRoot=Join-Path ([IO.Path]::GetTempPath()) ('at-'+[guid]::NewGuid().ToString('N').Substring(0,8))
  New-Item -ItemType Directory -Path $executionRoot|Out-Null
  foreach($name in @('lib','test','config','assets','integration_test','pubspec.yaml','pubspec.lock','analysis_options.yaml','.flutter-plugins-dependencies')){
    $item=Join-Path $appRoot $name
    if(Test-Path -LiteralPath $item){Copy-Item -LiteralPath $item -Destination $executionRoot -Recurse -Force}
  }
  New-Item -ItemType Directory -Path (Join-Path $executionRoot '.dart_tool'),(Join-Path $executionRoot 'windows/flutter') -Force|Out-Null
  foreach($name in @('package_config.json','package_graph.json')){if(Test-Path -LiteralPath "$appRoot/.dart_tool/$name"){Copy-Item -LiteralPath "$appRoot/.dart_tool/$name" -Destination "$executionRoot/.dart_tool"}}
  Copy-Item -LiteralPath "$appRoot/android" -Destination $executionRoot -Recurse -Force
  $gradleZip=Join-Path $projectRoot '.runtime/toolchains/gradle-9.3.1-bin.zip'
  if(Test-Path -LiteralPath $gradleZip){
    if((Get-FileHash -LiteralPath $gradleZip -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'b266d5ff6b90eada6dc3b20cb090e3731302e553a27c5d3e4df1f0d76beaff06'){throw 'Cached Gradle checksum mismatch.'}
    $wrapper=Join-Path $executionRoot 'android/gradle/wrapper/gradle-wrapper.properties'
    $wrapperText=Get-Content -LiteralPath $wrapper -Raw
    $wrapperText=$wrapperText -replace 'distributionUrl=.*',('distributionUrl='+([Uri]$gradleZip).AbsoluteUri)
    [IO.File]::WriteAllText($wrapper,$wrapperText,[Text.UTF8Encoding]::new($false))
  }
  Copy-Item -LiteralPath "$appRoot/windows/CMakeLists.txt","$appRoot/windows/runner" -Destination "$executionRoot/windows" -Recurse -Force
  Get-ChildItem -LiteralPath "$appRoot/windows/flutter" -File|ForEach-Object{Copy-Item -LiteralPath $_.FullName -Destination "$executionRoot/windows/flutter"}
  if(Test-Path -LiteralPath "$executionRoot/.flutter-plugins-dependencies"){
    $plugins=Get-Content -LiteralPath "$executionRoot/.flutter-plugins-dependencies" -Raw|ConvertFrom-Json
    $linkRoot=Join-Path $executionRoot 'windows/flutter/ephemeral/.plugin_symlinks'
    New-Item -ItemType Directory -Path $linkRoot -Force|Out-Null
    foreach($plugin in $plugins.plugins.windows){New-Item -ItemType Junction -Path (Join-Path $linkRoot $plugin.name) -Target $plugin.path|Out-Null}
  }
}
Push-Location $executionRoot
try{
  if($Action -eq 'doctor'){& $flutter --suppress-analytics doctor -v}
  elseif($Action -eq 'get'){& $flutter --suppress-analytics pub get}
  elseif($Action -eq 'analyze'){& $flutter --suppress-analytics analyze --no-pub}
  elseif($Action -eq 'test'){
    if($MigrationArchives){& $flutter --suppress-analytics test --no-pub "--dart-define=ATLAS_MIGRATION_ARCHIVES=$MigrationArchives"}
    else{& $flutter --suppress-analytics test --no-pub}
  }
  elseif($Action -like 'run-*'){
    $target=if($Action -eq 'run-windows'){'windows'}elseif($Device){$Device}else{throw 'Pass -Device from flutter devices for Android.'}
    & $flutter --suppress-analytics run --no-pub -d $target "--dart-define-from-file=$configPath"
  }else{
    # Native build tools need an ASCII source path on Windows. Stage only app inputs.
    $buildRoot=$executionRoot
    $releaseRoot=Join-Path $projectRoot 'release/flutter'
    New-Item -ItemType Directory -Path $releaseRoot -Force|Out-Null
    if($Action -eq 'build-windows'){
      & $flutter --suppress-analytics build windows --no-pub --release "--dart-define-from-file=$configPath"
      if($LASTEXITCODE -ne 0){throw 'Windows build failed.'}
      $bundle=Join-Path $buildRoot 'build/windows/x64/runner/Release'
      $zip=Join-Path $releaseRoot ('WorkSpace-Windows-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.zip')
      Compress-Archive -LiteralPath (Get-ChildItem -LiteralPath $bundle | Select-Object -ExpandProperty FullName) -DestinationPath $zip
      $unpacked=Join-Path $releaseRoot 'windows'
      New-Item -ItemType Directory -Path $unpacked -Force|Out-Null
      Get-ChildItem -LiteralPath $bundle|ForEach-Object{Copy-Item -LiteralPath $_.FullName -Destination $unpacked -Recurse -Force}
      Write-Output "Windows bundle: $zip"
    }else{
      if(!(Test-Path -LiteralPath (Join-Path $appRoot 'android/key.properties'))){throw 'Release signing is required. Configure apps/atlas/android/key.properties first.'}
      & $flutter --suppress-analytics build apk --no-pub --release "--dart-define-from-file=$configPath"
      if($LASTEXITCODE -ne 0){throw 'Android build failed.'}
      $apk=Join-Path $releaseRoot 'WorkSpace-Android.apk'
      Copy-Item -LiteralPath (Join-Path $buildRoot 'build/app/outputs/flutter-apk/app-release.apk') -Destination $apk -Force
      Write-Output "Signed Android APK: $apk"
    }
  }
  if($LASTEXITCODE -ne 0){throw "Flutter command failed with exit code $LASTEXITCODE"}
}finally{Pop-Location}
