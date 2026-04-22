param(
    [double]$MinimumLineCoverage = 70,
    [string]$TestConnectionString = 'Host=localhost;Port=5433;Database=agendamentos;Username=postgres;Password=postgres'
)

$ErrorActionPreference = 'Stop'

$testsDir = $PSScriptRoot
$projectPath = Join-Path $testsDir 'Tests.csproj'
$runSettingsPath = Join-Path $testsDir 'coverage.runsettings'
$resultsRoot = Join-Path $testsDir 'TestResults\coverage-gate'
$stableCoverageFile = Join-Path $resultsRoot 'coverage.cobertura.xml'
$summaryFile = Join-Path $resultsRoot 'coverage-summary.json'

if (!(Test-Path $projectPath)) {
    throw "Arquivo de projeto de testes nao encontrado: $projectPath"
}

if (!(Test-Path $runSettingsPath)) {
    throw "Arquivo de configuracao de cobertura nao encontrado: $runSettingsPath"
}

if (Test-Path $resultsRoot) {
    Remove-Item $resultsRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $resultsRoot -Force | Out-Null

Write-Host 'Executando testes com coleta de cobertura...'
$previousConnectionString = $env:ConnectionStrings__DefaultConnection
$env:ConnectionStrings__DefaultConnection = $TestConnectionString

try {
    dotnet test $projectPath --settings $runSettingsPath --collect:"XPlat Code Coverage" --results-directory $resultsRoot --logger "console;verbosity=minimal"
    if ($LASTEXITCODE -ne 0) {
        throw 'Falha ao executar testes. O gate de cobertura foi interrompido.'
    }
}
finally {
    if ($null -eq $previousConnectionString) {
        Remove-Item Env:ConnectionStrings__DefaultConnection -ErrorAction SilentlyContinue
    }
    else {
        $env:ConnectionStrings__DefaultConnection = $previousConnectionString
    }
}

$latestCoverage = Get-ChildItem -Path $resultsRoot -Recurse -Filter 'coverage.cobertura.xml' |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if ($null -eq $latestCoverage) {
    throw "Arquivo coverage.cobertura.xml nao encontrado em $resultsRoot"
}

Copy-Item $latestCoverage.FullName $stableCoverageFile -Force

[xml]$coverageXml = Get-Content $stableCoverageFile
$lineRate = [double]::Parse($coverageXml.coverage.'line-rate', [System.Globalization.CultureInfo]::InvariantCulture)
$lineCoveragePercent = [Math]::Round($lineRate * 100, 2)

$summary = [ordered]@{
    generatedAt = (Get-Date).ToString('s')
    minimumLineCoveragePercent = $MinimumLineCoverage
    lineCoveragePercent = $lineCoveragePercent
    sourceCoverageFile = $latestCoverage.FullName
    stableCoverageFile = $stableCoverageFile
}

$summary | ConvertTo-Json | Set-Content -Path $summaryFile

Write-Host ("Cobertura de linhas: {0}% (minimo exigido: {1}%)" -f $lineCoveragePercent, $MinimumLineCoverage)
Write-Host ("Artefato de cobertura: {0}" -f $stableCoverageFile)
Write-Host ("Resumo: {0}" -f $summaryFile)

if ($lineCoveragePercent -lt $MinimumLineCoverage) {
    throw ("Gate de cobertura reprovado: {0}% < {1}%" -f $lineCoveragePercent, $MinimumLineCoverage)
}

Write-Host 'Gate de cobertura aprovado.'
