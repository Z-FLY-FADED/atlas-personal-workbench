param([string]$VisualStudioRoot = '', [string]$WindowsSdkRoot = '')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (!$VisualStudioRoot) {
  $paths = Get-Content (Join-Path $projectRoot '.runtime/toolchains/paths.json') -Raw | ConvertFrom-Json
  $VisualStudioRoot = Join-Path (Split-Path -Parent $paths.flutter) 'vs'
}
if (!$WindowsSdkRoot) { $WindowsSdkRoot = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits/10' }
$msvc = Get-ChildItem (Join-Path $VisualStudioRoot 'VC/Tools/MSVC') -Directory | Sort-Object Name -Descending | Select-Object -First 1
$sdk = Get-ChildItem (Join-Path $WindowsSdkRoot 'Include') -Directory | Sort-Object Name -Descending | Select-Object -First 1
$sdkLib = Join-Path $WindowsSdkRoot "Lib/$($sdk.Name)"
$env:INCLUDE = @((Join-Path $msvc.FullName 'include'), (Join-Path $sdk.FullName 'ucrt'), (Join-Path $sdk.FullName 'shared'), (Join-Path $sdk.FullName 'um')) -join ';'
$env:LIB = @((Join-Path $msvc.FullName 'lib/x64'), (Join-Path $sdkLib 'ucrt/x64'), (Join-Path $sdkLib 'um/x64')) -join ';'
$compiler = Join-Path $msvc.FullName 'bin/Hostx64/x64/cl.exe'
$output = Join-Path $projectRoot '.runtime/native-caption-test'
New-Item -ItemType Directory -Path $output -Force | Out-Null
$runner = Join-Path $projectRoot 'apps/atlas/windows/runner'
$executable = Join-Path $output 'atlas-caption-test.exe'
Push-Location $output
try {
  & $compiler /nologo /std:c++17 /W4 /WX /wd4100 /EHsc /DUNICODE /D_UNICODE /D_WIN32_WINNT=0x0A00 /DNOMINMAX (Join-Path $runner 'atlas_title_bar.cpp') (Join-Path $runner 'tests/atlas_title_bar_test.cpp') "/Fe$executable" /link user32.lib gdi32.lib comctl32.lib
  if ($LASTEXITCODE -ne 0) { throw 'Native caption test compilation failed.' }
  & $executable
  if ($LASTEXITCODE -ne 0) { throw 'Native caption checks failed.' }
} finally { Pop-Location }
