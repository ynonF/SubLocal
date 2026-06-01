# Build the Python worker into a single executable for the current OS.

param(
    [string]$OutputDir = (Join-Path $PSScriptRoot "..\worker\dist")
)

$ErrorActionPreference = "Stop"

$workerDir = Resolve-Path (Join-Path $PSScriptRoot "..\worker")
$resolvedOutputDir = $OutputDir

function Resolve-Python {
    $candidates = @(
        @{ Command = "python"; Args = @() },
        @{ Command = "python3"; Args = @() },
        @{ Command = "py"; Args = @("-3") }
    )

    foreach ($candidate in $candidates) {
        $cmd = Get-Command $candidate.Command -ErrorAction SilentlyContinue
        if ($cmd) {
            & $candidate.Command @($candidate.Args) --version | Out-Host
            if ($LASTEXITCODE -eq 0) {
                return $candidate
            }
        }
    }

    throw "Python 3.10 or newer was not found."
}

$python = Resolve-Python
$pythonCommand = $python.Command
$pythonArgs = @($python.Args)

New-Item -ItemType Directory -Force $resolvedOutputDir | Out-Null

Push-Location $workerDir
try {
    & $pythonCommand @pythonArgs -m pip install --upgrade pip
    & $pythonCommand @pythonArgs -m pip install -r requirements.txt pyinstaller

    $hiddenImports = @(
        "faster_whisper",
        "ctranslate2",
        "argostranslate",
        "argostranslate.package",
        "argostranslate.translate",
        "tokenize"
    )

    $args = @(
        "--onefile",
        "--name", "sublocal_worker",
        "--distpath", $resolvedOutputDir,
        "--workpath", (Join-Path $workerDir "build"),
        "--specpath", $workerDir,
        "--noconfirm"
    )

    foreach ($import in $hiddenImports) {
        $args += @("--hidden-import", $import)
    }

    $args += "sublocal_worker/__main__.py"

    & $pythonCommand @pythonArgs -m PyInstaller @args
}
finally {
    Pop-Location
}

Write-Host "Worker binary ready in $resolvedOutputDir"
