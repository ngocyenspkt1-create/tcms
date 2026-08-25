param([string]$OutputDirectory = "database/backups")
$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) { throw "Thiếu DATABASE_URL. Chạy script qua npm để nạp .env.local." }
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) { throw "Không tìm thấy pg_dump. Hãy cài PostgreSQL và mở terminal mới." }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$databaseUri = [uri]$env:DATABASE_URL
$credentials = $databaseUri.UserInfo.Split(':', 2)
$env:PGHOST = $databaseUri.Host
$env:PGPORT = $databaseUri.Port
$env:PGDATABASE = $databaseUri.AbsolutePath.TrimStart('/')
$env:PGUSER = [uri]::UnescapeDataString($credentials[0])
$env:PGPASSWORD = [uri]::UnescapeDataString($credentials[1])
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $OutputDirectory "tcms-dev-$stamp.dump"
& pg_dump --format=custom --no-owner --no-acl --file=$target
if ($LASTEXITCODE -ne 0) { throw "Backup thất bại." }
Write-Output "Đã tạo backup: $target"
$env:PGPASSWORD = $null
