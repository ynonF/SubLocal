# Convenience wrapper for building the Windows NSIS installer.

$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "package-platform.ps1") -Platform win
