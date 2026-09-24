param([switch]$Zip)

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$output = Join-Path $PSScriptRoot 'tenno-link'
$files = @('manifest.json', 'background.js', 'content.js', 'offscreen.html', 'offscreen.js', 'popup.html', 'popup.js', 'popup.css', 'visual.css', 'overlay-mode.css', 'prompts.js', 'catalog.js', 'progression.js', 'inventory.js', 'insights.js', 'farming.js')
$assets = @('icon-16.png', 'icon-32.png', 'icon-48.png', 'icon-128.png', 'tenno-link-logo-animated.svg')

New-Item -ItemType Directory -Force -Path $output, (Join-Path $output 'assets') | Out-Null
foreach ($file in $files) { Copy-Item -LiteralPath (Join-Path $repo $file) -Destination (Join-Path $output $file) -Force }
foreach ($asset in $assets) { Copy-Item -LiteralPath (Join-Path $repo "assets/$asset") -Destination (Join-Path $output "assets/$asset") -Force }

if ($Zip) {
  $version = (Get-Content -Raw -LiteralPath (Join-Path $output 'manifest.json') | ConvertFrom-Json).version
  $archive = Join-Path $PSScriptRoot "tenno-link-$version.zip"
  if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive }
  Compress-Archive -LiteralPath $output -DestinationPath $archive
  Write-Output "Created $archive"
}
Write-Output "Release folder: $output"
