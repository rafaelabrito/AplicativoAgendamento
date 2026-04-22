param(
    [ValidateSet('core', 'full')]
    [string]$Mode = 'full'
)

$ErrorActionPreference = 'Stop'

$previousNodeOptions = $env:NODE_OPTIONS
if ([string]::IsNullOrWhiteSpace($env:NODE_OPTIONS)) {
    $env:NODE_OPTIONS = '--max-old-space-size=8192 --max-semi-space-size=256'
}

$frontendDir = $PSScriptRoot
$summaryDir = Join-Path $frontendDir 'quality-gate-results'
$summaryFile = if ($Mode -eq 'core') {
    Join-Path $summaryDir 'quality-gate-core-summary.json'
} else {
    Join-Path $summaryDir 'quality-gate-full-summary.json'
}

if (!(Test-Path (Join-Path $frontendDir 'package.json'))) {
    throw 'package.json nao encontrado na pasta frontend.'
}

if (!(Test-Path $summaryDir)) {
    New-Item -ItemType Directory -Path $summaryDir -Force | Out-Null
}

function Invoke-Step {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    $start = Get-Date
    & $Action
    $end = Get-Date

    return [ordered]@{
        name = $Name
        startedAt = $start.ToString('s')
        finishedAt = $end.ToString('s')
        durationSeconds = [Math]::Round(($end - $start).TotalSeconds, 2)
        status = 'passed'
    }
}

function Invoke-NpmScript {
    param(
        [string]$Script,
        [string[]]$Args = @(),
        [int]$TimeoutSeconds = 0
    )

    $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($null -eq $npmCmd) {
        throw 'npm.cmd nao encontrado no PATH.'
    }

    $previousNodeOptions = $env:NODE_OPTIONS
    if ([string]::IsNullOrWhiteSpace($env:NODE_OPTIONS)) {
        $env:NODE_OPTIONS = '--max-old-space-size=4096'
    }

    try {
    if ($TimeoutSeconds -gt 0) {
        $argumentList = @('run', $Script, '--') + $Args
        $process = Start-Process -FilePath $npmCmd.Path -ArgumentList $argumentList -NoNewWindow -PassThru

        if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
            try {
                $process.Kill()
            }
            catch {
            }

            throw ("Timeout ao executar script npm '{0}' apos {1}s." -f $Script, $TimeoutSeconds)
        }

        $exitCode = if ($null -eq $process.ExitCode) { 0 } else { [int]$process.ExitCode }
        if ($exitCode -ne 0) {
            throw ("Falha no script npm '{0}' (exit code: {1})." -f $Script, $exitCode)
        }
    }
    else {
        & $npmCmd.Path run $Script -- @Args

        if ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) {
            throw ("Falha no script npm '{0}' (exit code: {1})." -f $Script, $LASTEXITCODE)
        }

        if (-not $?) {
            throw ("Falha no script npm '{0}'." -f $Script)
        }
    }
    }
    finally {
        $env:NODE_OPTIONS = $previousNodeOptions
    }
}

$steps = @()
$gateStart = Get-Date

Push-Location $frontendDir
try {
    Write-Host ("Executando gate de qualidade do frontend (modo: {0})..." -f $Mode)

    $steps += Invoke-Step -Name 'lint' -Action {
        Invoke-NpmScript -Script 'lint'
    }

    $steps += Invoke-Step -Name 'unit-tests' -Action {
        Invoke-NpmScript -Script 'test' -Args @('--watchAll=false', '--runInBand', '--maxWorkers=1', '--no-cache')
    }

    if ($Mode -eq 'full') {
        $steps += Invoke-Step -Name 'e2e-tests' -Action {
            Invoke-NpmScript -Script 'test:e2e' -Args @('--reporter=line', '--workers=1', '--timeout=30000', '--global-timeout=180000') -TimeoutSeconds 240
        }
    }

    $gateEnd = Get-Date

    $summary = [ordered]@{
        generatedAt = $gateEnd.ToString('s')
        status = 'passed'
        durationSeconds = [Math]::Round(($gateEnd - $gateStart).TotalSeconds, 2)
        steps = $steps
    }

    $summary | ConvertTo-Json -Depth 5 | Set-Content -Path $summaryFile

    Write-Host 'Gate de qualidade do frontend aprovado.'
    Write-Host ("Resumo: {0}" -f $summaryFile)
}
catch {
    $gateEnd = Get-Date

    $summary = [ordered]@{
        generatedAt = $gateEnd.ToString('s')
        status = 'failed'
        durationSeconds = [Math]::Round(($gateEnd - $gateStart).TotalSeconds, 2)
        steps = $steps
        error = $_.Exception.Message
    }

    $summary | ConvertTo-Json -Depth 5 | Set-Content -Path $summaryFile

    Write-Host ("Gate de qualidade do frontend reprovado. Resumo: {0}" -f $summaryFile)
    throw
}
finally {
    if ($null -eq $previousNodeOptions) {
        Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
    }
    else {
        $env:NODE_OPTIONS = $previousNodeOptions
    }

    Pop-Location
}
