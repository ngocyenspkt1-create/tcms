param([string]$OutputDirectory = "database/backups")
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
$pgDump = Resolve-PostgresTool "pg_dump"
$pgRestore = Resolve-PostgresTool "pg_restore"
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$databaseUri = [uri]$env:DATABASE_URL
$credentials = $databaseUri.UserInfo.Split(':', 2)
if ($credentials.Count -ne 2) { throw "Maintenance database URL phải có username và password." }

try {
  $env:PGHOST = $databaseUri.Host
  $env:PGPORT = $databaseUri.Port
  $env:PGDATABASE = [uri]::UnescapeDataString($databaseUri.AbsolutePath.TrimStart('/'))
  $env:PGUSER = [uri]::UnescapeDataString($credentials[0])
  $env:PGPASSWORD = [uri]::UnescapeDataString($credentials[1])
  $stamp = Get-Date -Format "yyyyMMdd-HHmmssfff"
  $target = Join-Path $OutputDirectory "tcms-dev-$stamp.dump"

  # Keep ownership and ACL entries so a restore preserves the migration owner,
  # runtime grants and security posture. The maintenance role bypasses FORCE RLS.
  & $pgDump --format=custom --no-password --file=$target
  if ($LASTEXITCODE -ne 0) { throw "Backup thất bại." }

  $backup = Get-Item -LiteralPath $target
  if ($backup.Length -le 0) { throw "Backup tạo ra file rỗng." }

  & $pgRestore --list --no-password $backup.FullName | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "File backup không đọc được bằng pg_restore --list." }

  Write-Output "Đã tạo và kiểm tra backup: $($backup.FullName)"
  Write-Output "Kích thước backup (bytes): $($backup.Length)"
} finally {
  $env:PGPASSWORD = $null
}
