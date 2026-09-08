# pnpm standalone 在 Windows 上跑 lifecycle 脚本时 PATH 常不含 node，本脚本手动补跑 postinstall
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

$node = (Get-Command node -ErrorAction Stop).Source
$nodeDir = Split-Path $node -Parent
$env:PATH = "$nodeDir;$env:PATH"

Write-Host "=== wxapp-backend install-deps ===" -ForegroundColor Cyan
Write-Host "Node: $node"
Write-Host ""

function Invoke-NodeScript {
    param(
        [string]$Label,
        [string]$ScriptPath,
        [string]$WorkingDirectory
    )
    if (-not (Test-Path $ScriptPath)) { return }
    Write-Host ">> $Label"
    Push-Location $WorkingDirectory
    try {
        & $node $ScriptPath
        if ($LASTEXITCODE -ne 0) { throw "$Label failed (exit $LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
}

Write-Host ">> pnpm install --ignore-scripts"
pnpm install --ignore-scripts
if ($LASTEXITCODE -ne 0) { throw 'pnpm install failed' }

$pnpRoot = Join-Path $root 'node_modules\.pnpm'
if (-not (Test-Path $pnpRoot)) { throw 'node_modules/.pnpm not found' }

Get-ChildItem $pnpRoot -Directory -Filter '@prisma+engines@*' | ForEach-Object {
    $pkg = Join-Path $_.FullName 'node_modules\@prisma\engines'
    Invoke-NodeScript '@prisma/engines postinstall' (Join-Path $pkg 'scripts\postinstall.js') $pkg
}

Get-ChildItem $pnpRoot -Directory -Filter 'sharp@*' | ForEach-Object {
    $pkg = Join-Path $_.FullName 'node_modules\sharp'
    Invoke-NodeScript 'sharp install' (Join-Path $pkg 'install\check.js') $pkg
}

$prismaCli = Join-Path $root 'node_modules\prisma\build\index.js'
if (-not (Test-Path $prismaCli)) { throw 'prisma CLI not found' }

Write-Host '>> prisma generate'
& $node $prismaCli generate
if ($LASTEXITCODE -ne 0) { throw 'prisma generate failed' }

Write-Host ''
Write-Host 'Done. Next: pnpm run db:push && pnpm run dev' -ForegroundColor Green
