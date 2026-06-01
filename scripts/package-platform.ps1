# Build a free unsigned installer for the current platform or the requested target.

param(
    [ValidateSet("auto", "win", "mac", "linux")]
    [string]$Platform = "auto"
)

$ErrorActionPreference = "Stop"

$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$desktopDir = Join-Path $rootDir "apps\desktop"

function Resolve-NodeCommand {
    param([string]$Name)

    if ($env:OS -eq "Windows_NT") {
        return "$Name.cmd"
    }

    return $Name
}

function Resolve-Platform {
    if ($Platform -ne "auto") {
        return $Platform
    }

    if ($env:OS -eq "Windows_NT") {
        return "win"
    }

    if ($IsMacOS) {
        return "mac"
    }

    return "linux"
}

$targetPlatform = Resolve-Platform
$builderTarget = @{
    win = "--win"
    mac = "--mac"
    linux = "--linux"
}[$targetPlatform]
$npm = Resolve-NodeCommand "npm"
$npx = Resolve-NodeCommand "npx"

Write-Host "Building SubLocal installer for $targetPlatform"

& (Join-Path $PSScriptRoot "build-worker.ps1")

Push-Location $rootDir
try {
    & $npm install
    & $npm run build
}
finally {
    Pop-Location
}

Push-Location $desktopDir
try {
    $env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
    & $npx electron-builder $builderTarget --config ../../electron-builder.yml --publish never
}
finally {
    Pop-Location
}

Write-Host "Installer artifacts are in apps/desktop/release"
