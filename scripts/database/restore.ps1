param([Parameter(Mandatory=$true)][string]$BackupFile)
$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) { throw "Thiếu DATABASE_URL. Chạy script qua npm để nạp .env.local." }
if (-not (Test-Path -LiteralPath $BackupFile)) { throw "Không tìm thấy tệp backup." }
if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) { throw "Không tìm thấy pg_restore. Hãy cài PostgreSQL và mở terminal mới." }
$databaseUri = [uri]$env:DATABASE_URL
$dbName = $databaseUri.AbsolutePath.TrimStart('/')
if ($dbName -notmatch '(_dev|_test)$') { throw "Chỉ cho phép restore vào database có hậu tố _dev hoặc _test." }
$credentials = $databaseUri.UserInfo.Split(':', 2)
$env:PGHOST = $databaseUri.Host
$env:PGPORT = $databaseUri.Port
$env:PGDATABASE = $dbName
$env:PGUSER = [uri]::UnescapeDataString($credentials[0])
$env:PGPASSWORD = [uri]::UnescapeDataString($credentials[1])
& pg_restore --clean --if-exists --no-owner --no-acl $BackupFile
if ($LASTEXITCODE -ne 0) { throw "Restore thất bại." }
Write-Output "Restore DEV hoàn tất từ: $BackupFile"
$env:PGPASSWORD = $null
