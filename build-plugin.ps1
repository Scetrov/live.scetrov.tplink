# TP-Link Stream Deck Plugin Build Script
# Creates a distributable .streamDeckPlugin file for Elgato Marketplace submission

param(
    [string]$OutputDir = ".\dist",
    [switch]$Clean = $false
)

Write-Host "=== TP-Link Stream Deck Plugin Build Script ===" -ForegroundColor Cyan
Write-Host ""

# Get plugin directory and info
$pluginDir = $PSScriptRoot
$manifestPath = Join-Path $pluginDir "manifest.json"

if (-not (Test-Path $manifestPath)) {
    Write-Error "manifest.json not found in $pluginDir"
    exit 1
}

# Read manifest to get plugin name and version
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$pluginName = $manifest.Name
$pluginVersion = $manifest.Version
$pluginUUID = $manifest.UUID

Write-Host "Plugin Name: $pluginName" -ForegroundColor Green
Write-Host "Version: $pluginVersion" -ForegroundColor Green
Write-Host "UUID: $pluginUUID" -ForegroundColor Green
Write-Host ""

# Create output directory
if ($Clean -and (Test-Path $OutputDir)) {
    Write-Host "Cleaning output directory..." -ForegroundColor Yellow
    Remove-Item $OutputDir -Recurse -Force
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# Create temp build directory
$tempDir = Join-Path $OutputDir "temp_build"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Step 1: Installing dependencies..." -ForegroundColor Cyan
Push-Location $pluginDir
npm install --production --no-optional --ignore-scripts 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Error "npm install failed"
    exit 1
}
Pop-Location

Write-Host "Step 2: Copying plugin files..." -ForegroundColor Cyan

# Files and directories to include
$includeItems = @(
    "manifest.json",
    "package.json",
    "plugin.js",
    "property-inspector.html",
    "README.md",
    "LICENSE",
    "images",
    "lib",
    "node_modules"
)

foreach ($item in $includeItems) {
    $sourcePath = Join-Path $pluginDir $item
    if (Test-Path $sourcePath) {
        $destPath = Join-Path $tempDir $item
        if (Test-Path $sourcePath -PathType Container) {
            Copy-Item $sourcePath -Destination $destPath -Recurse -Force
            Write-Host "  ✓ Copied $item/" -ForegroundColor Gray
        } else {
            Copy-Item $sourcePath -Destination $destPath -Force
            Write-Host "  ✓ Copied $item" -ForegroundColor Gray
        }
    } else {
        if ($item -ne "LICENSE") {  # LICENSE might not exist yet
            Write-Warning "  ⚠ $item not found, skipping"
        }
    }
}

Write-Host "Step 3: Cleaning up unnecessary files..." -ForegroundColor Cyan

# Remove test files and dev dependencies from temp directory
$excludePatterns = @(
    "node_modules\jest*",
    "node_modules\@jest*",
    "node_modules\*\test",
    "node_modules\*\tests",
    "node_modules\*\*.test.js",
    "node_modules\*\*.spec.js",
    "node_modules\*\.github",
    "node_modules\*\README.md",
    "node_modules\*\CHANGELOG.md",
    "__tests__",
    "docs",
    "tests",
    ".git*",
    "*.log"
)

foreach ($pattern in $excludePatterns) {
    $itemsToRemove = Get-ChildItem -Path $tempDir -Recurse -Force -Filter $pattern -ErrorAction SilentlyContinue
    foreach ($item in $itemsToRemove) {
        Remove-Item $item -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Step 4: Creating .streamDeckPlugin package..." -ForegroundColor Cyan

# Output filename
$outputFile = Join-Path $OutputDir "$pluginUUID.v$pluginVersion.streamDeckPlugin"

# Remove existing package if it exists
if (Test-Path $outputFile) {
    Remove-Item $outputFile -Force
}

# Create ZIP archive (streamDeckPlugin is just a ZIP file)
try {
    Add-Type -Assembly System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $outputFile, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    Write-Host "  ✓ Package created successfully" -ForegroundColor Green
} catch {
    Write-Error "Failed to create package: $_"
    exit 1
}

# Clean up temp directory
Remove-Item $tempDir -Recurse -Force

# Display results
Write-Host ""
Write-Host "=== Build Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Package: $outputFile" -ForegroundColor White
$fileSize = (Get-Item $outputFile).Length / 1MB
Write-Host "Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Test the plugin by double-clicking the .streamDeckPlugin file" -ForegroundColor Gray
Write-Host "  2. Verify all features work correctly" -ForegroundColor Gray
Write-Host "  3. Submit to Elgato Marketplace at https://developer.elgato.com" -ForegroundColor Gray
Write-Host ""

# Restore dev dependencies
Write-Host "Restoring development dependencies..." -ForegroundColor Yellow
Push-Location $pluginDir
npm install 2>&1 | Out-Null
Pop-Location

exit 0
