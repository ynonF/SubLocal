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

function Invoke-Checked {
    param(
        [string]$Command,
        [string[]]$Arguments
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command failed with exit code $LASTEXITCODE"
    }
}

Write-Host "Building SubLocal installer for $targetPlatform"

& (Join-Path $PSScriptRoot "build-worker.ps1")

Push-Location $rootDir
try {
    Invoke-Checked $npm @("install")
    Invoke-Checked $npm @("run", "build")
}
finally {
    Pop-Location
}

Push-Location $desktopDir
try {
    $env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
    Invoke-Checked $npx @("electron-builder", $builderTarget, "--config", "../../electron-builder.yml", "--publish", "never")

    if ($targetPlatform -eq "linux") {
        $releaseDir = Join-Path $desktopDir "release"
        $linuxOutputs = @(
            @{ Pattern = "SubLocal-Linux-*.AppImage"; Name = "SubLocal-Linux-x64.AppImage" },
            @{ Pattern = "SubLocal-Linux-*.deb"; Name = "SubLocal-Linux-x64.deb" }
        )

        foreach ($output in $linuxOutputs) {
            $file = Get-ChildItem $releaseDir -Filter $output.Pattern -File | Select-Object -First 1
            if ($file -and $file.Name -ne $output.Name) {
                Move-Item -LiteralPath $file.FullName -Destination (Join-Path $releaseDir $output.Name) -Force
            }
        }
    }
}
finally {
    Pop-Location
}

Write-Host "Installer artifacts are in apps/desktop/release"
