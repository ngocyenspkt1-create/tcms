param([Parameter(Mandatory=$true)][string]$BackupFile)
$ErrorActionPreference = "Stop"

function Resolve-PostgresTool([string]$Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  $root = Join-Path $env:ProgramFiles "PostgreSQL"
  if (Test-Path -LiteralPath $root) {
    $versions = Get-ChildItem -LiteralPath $root -Directory | Sort-Object Name -Descending
    foreach ($version in $versions) {
      $candidate = Join-Path $version.FullName "bin\$Name.exe"
      if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
  }
  throw "Không tìm thấy $Name trong PATH hoặc thư mục cài PostgreSQL chuẩn."
}

if (-not $env:DATABASE_URL) { throw "Thiếu DATABASE_URL. Chạy script qua npm để nạp .env.local." }
if (-not (Test-Path -LiteralPath $BackupFile)) { throw "Không tìm thấy tệp backup." }
$pgRestore = Resolve-PostgresTool "pg_restore"
$databaseUri = [uri]$env:DATABASE_URL
$dbName = $databaseUri.AbsolutePath.TrimStart('/')
if ($dbName -notmatch '(_dev|_test)$') { throw "Chỉ cho phép restore vào database có hậu tố _dev hoặc _test." }
$credentials = $databaseUri.UserInfo.Split(':', 2)
if ($credentials.Count -ne 2) { throw "Maintenance database URL phải có username và password." }

try {
  $env:PGHOST = $databaseUri.Host
  $env:PGPORT = $databaseUri.Port
  $env:PGDATABASE = $dbName
  $env:PGUSER = [uri]::UnescapeDataString($credentials[0])
  $env:PGPASSWORD = [uri]::UnescapeDataString($credentials[1])

  # Restore ownership and ACL from the archive. A maintenance/admin role is
  # required so original owners and grants can be restored safely.
  & $pgRestore --dbname=$dbName --clean --if-exists --exit-on-error --no-password $BackupFile
  if ($LASTEXITCODE -ne 0) { throw "Restore thất bại." }
  Write-Output "Restore DEV hoàn tất từ: $BackupFile"
} finally {
  $env:PGPASSWORD = $null
}
