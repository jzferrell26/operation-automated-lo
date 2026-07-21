[CmdletBinding()]
param(
  [string]$SupabaseRoot
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($SupabaseRoot)) {
  $SupabaseRoot = Split-Path -Parent $PSScriptRoot
}

function Assert-Phase0 {
  param(
    [bool]$Condition,
    [string]$Message
  )

  if (-not $Condition) {
    throw "Phase 0 Supabase validation failed: $Message"
  }
}

$requiredPaths = @(
  'config.toml',
  'seed.sql',
  'migrations/.gitkeep',
  'tests/phase0_scaffold.pgtap.sql',
  'environment-contract.md'
)

foreach ($relativePath in $requiredPaths) {
  Assert-Phase0 (Test-Path (Join-Path $SupabaseRoot $relativePath)) "missing $relativePath"
}

$config = Get-Content -Raw (Join-Path $SupabaseRoot 'config.toml')
$seed = Get-Content -Raw (Join-Path $SupabaseRoot 'seed.sql')
$environmentContract = Get-Content -Raw (Join-Path $SupabaseRoot 'environment-contract.md')

Assert-Phase0 ($config -match '(?m)^project_id\s*=\s*"operation-automated-lo-phase-0"\s*$') 'unexpected local project id'
Assert-Phase0 ($config -match '(?m)^major_version\s*=\s*17\s*$') 'Postgres 17 is not pinned for local development'
Assert-Phase0 ($config -match '(?m)^pool_mode\s*=\s*"transaction"\s*$') 'transaction pooling is not configured'
Assert-Phase0 ($config -match '(?m)^sql_paths\s*=\s*\["\./seed\.sql"\]\s*$') 'local reset does not use the Phase 0 seed contract'
Assert-Phase0 (-not [regex]::IsMatch($config, '(?im)^\s*(project_ref|access_token|db_url|password)\s*=')) 'config.toml contains an external-project or credential setting'

$configuredPorts = @(
  [regex]::Matches($config, '(?m)^\s*(?:port|shadow_port|smtp_port|pop3_port)\s*=\s*(\d+)\s*$') |
    ForEach-Object { [int]$_.Groups[1].Value } |
    Sort-Object -Unique
)
$expectedPorts = @(55420, 55421, 55422, 55423, 55424, 55425, 55426, 55429)
Assert-Phase0 (($configuredPorts -join ',') -eq ($expectedPorts -join ',')) 'local services must use only the reserved 5542x port block'

$migrationFiles = @(Get-ChildItem -File (Join-Path $SupabaseRoot 'migrations'))
Assert-Phase0 ($migrationFiles.Count -eq 1 -and $migrationFiles[0].Name -eq '.gitkeep') 'Phase 0 must not contain production migrations'

$forbiddenSeedPatterns = @(
  '(?im)^\s*(insert|copy|update|delete|merge|create\s+table|alter\s+table|drop\s+table)\b',
  '(?i)(service_role|access_token|refresh_token|password\s*=|postgres(ql)?://|https?://)'
)

foreach ($pattern in $forbiddenSeedPatterns) {
  Assert-Phase0 (-not [regex]::IsMatch($seed, $pattern)) "seed.sql matches forbidden pattern $pattern"
}

Assert-Phase0 ($seed -match "set_config\('app\.phase0_seed_classification', 'synthetic-only', true\)") 'seed is not marked synthetic-only'
Assert-Phase0 ($environmentContract -match '(?s)\| Local \|.*\| Preview \|.*\| Staging \|.*\| Production \|') 'environment contract does not enumerate all four environments'
Assert-Phase0 ($environmentContract -match 'Production data must never be copied, restored, or seeded') 'environment contract does not prohibit production-data seeding'
Assert-Phase0 ($environmentContract -match 'G1 through G8') 'environment contract does not preserve the external gate boundary'

Write-Output 'Phase 0 Supabase scaffold validation passed.'
