param([string]$Source = '')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
if (!$Source) { $Source = Join-Path $projectRoot 'apps/atlas/assets/branding/workspace-logo.png' }
$artwork = [Drawing.Bitmap]::FromFile($Source)
$warm = [Drawing.ColorTranslator]::FromHtml('#FFF7EB')
$res = Join-Path $projectRoot 'apps/atlas/android/app/src/main/res'

function New-BrandImage([int]$Size, [string]$Kind) {
  $bitmap = [Drawing.Bitmap]::new($Size, $Size, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $brush = [Drawing.SolidBrush]::new($warm)
  if ($Kind -eq 'round') {
    $graphics.FillEllipse($brush, 0, 0, $Size, $Size)
  } elseif ($Kind -eq 'plate') {
    $shape = [Drawing.Drawing2D.GraphicsPath]::new()
    $radius = [single]($Size * 0.24)
    $shape.AddArc(0, 0, $radius, $radius, 180, 90)
    $shape.AddArc($Size - $radius, 0, $radius, $radius, 270, 90)
    $shape.AddArc($Size - $radius, $Size - $radius, $radius, $radius, 0, 90)
    $shape.AddArc(0, $Size - $radius, $radius, $radius, 90, 90)
    $shape.CloseFigure()
    $graphics.FillPath($brush, $shape)
    $shape.Dispose()
  }
  # Preserve the provided transparent artwork. Adaptive foreground margins keep
  # the complete book and pen inside Android's central safe area.
  $ratio = if ($Kind -eq 'foreground') { 84.0 / 108.0 } else { 1.0 }
  $side = [single]($Size * $ratio)
  $offset = [single](($Size - $side) / 2)
  $graphics.DrawImage($artwork, [Drawing.RectangleF]::new($offset, $offset, $side, $side))
  $brush.Dispose()
  $graphics.Dispose()
  return ,$bitmap
}

function Save-BrandPng([int]$Size, [string]$Kind, [string]$Path) {
  New-Item -ItemType Directory -Path (Split-Path -Parent $Path) -Force | Out-Null
  $bitmap = New-BrandImage $Size $Kind
  try { $bitmap.Save($Path, [Drawing.Imaging.ImageFormat]::Png) } finally { $bitmap.Dispose() }
}

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$images = [Collections.Generic.List[byte[]]]::new()
foreach ($size in $sizes) {
  $bitmap = New-BrandImage $size 'plate'
  $stream = [IO.MemoryStream]::new()
  $bitmap.Save($stream, [Drawing.Imaging.ImageFormat]::Png)
  $images.Add($stream.ToArray())
  $stream.Dispose(); $bitmap.Dispose()
}
$iconPath = Join-Path $projectRoot 'apps/atlas/windows/runner/resources/app_icon.ico'
$writer = [IO.BinaryWriter]::new([IO.File]::Create($iconPath))
try {
  $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$sizes.Count)
  $offset = 6 + 16 * $sizes.Count
  for ($i = 0; $i -lt $sizes.Count; $i++) {
    $dimension = if ($sizes[$i] -eq 256) { 0 } else { $sizes[$i] }
    $writer.Write([byte]$dimension); $writer.Write([byte]$dimension)
    $writer.Write([byte]0); $writer.Write([byte]0)
    $writer.Write([uint16]1); $writer.Write([uint16]32)
    $writer.Write([uint32]$images[$i].Length); $writer.Write([uint32]$offset)
    $offset += $images[$i].Length
  }
  foreach ($bytes in $images) { $writer.Write($bytes) }
} finally { $writer.Dispose() }

foreach ($density in @(@('mdpi',48,108), @('hdpi',72,162), @('xhdpi',96,216), @('xxhdpi',144,324), @('xxxhdpi',192,432))) {
  $folder = Join-Path $res ('mipmap-' + $density[0])
  Save-BrandPng $density[1] 'plate' (Join-Path $folder 'ic_launcher.png')
  Save-BrandPng $density[1] 'round' (Join-Path $folder 'ic_launcher_round.png')
  Save-BrandPng $density[2] 'foreground' (Join-Path $folder 'ic_launcher_foreground.png')
}
Save-BrandPng 288 'foreground' (Join-Path $res 'drawable-nodpi/workspace_splash.png')
Save-BrandPng 256 'plate' (Join-Path $projectRoot 'outputs/branding-20261026/workspace-icon-preview.png')
$artwork.Dispose()
Write-Output 'Generated WorkSpace Windows ICO, Android launcher/adaptive/splash PNGs from the unchanged source artwork.'
