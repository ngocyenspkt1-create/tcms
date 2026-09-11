# Database TCMS

## Trạng thái

`DEV ĐÃ KIỂM CHỨNG - CHỈ DÙNG DỮ LIỆU GIẢ/ĐÃ ẨN DANH`

Các migration `001` đến `020` đã được áp dụng trên `tcms_dev`. Chúng tạo nền RBAC, audit append-only, RLS, role runtime quyền tối thiểu và các miền Department, Personnel/User, Contractor, Contract, Contract Item, tracking, quy tắc thời gian, WorkScope, Contract Goods Item, quyết định giám sát, Milestone, Inspection, Technical Issue, Acceptance và Documents metadata. Migration 019–020 bổ sung metadata Google Drive và quyền tối thiểu để tác vụ quét xử lý file chờ.

IT đã xác nhận PostgreSQL DEV. DBA vẫn cần review migration và chạy bằng tài khoản migration riêng trước khi kết nối ứng dụng.

## Nguyên tắc tài khoản database

- `migration owner`: chỉ pipeline migration sử dụng; không dùng trong runtime.
- `application role`: SELECT/INSERT/UPDATE đúng bảng; không phải owner/superuser; không có quyền sửa/xóa audit.
- `audit reader`: chỉ đọc audit theo nhiệm vụ.
- `backup role`: tài khoản riêng theo công cụ backup; App không có credential này.

Migration tạo role nhóm `tcms_app_runtime` không có quyền đăng nhập. Quy trình DEV trong repository dùng `scripts/database/create.mjs` để tạo login owner/runtime từ các URL đã cấu hình và `scripts/database/grant-runtime.mjs` để cấp membership; tuyệt đối không dùng owner/superuser cho API.

## Security context cho mỗi transaction

Sau khi xác thực và kiểm tra token ở backend, API phải đặt context bằng câu lệnh có tham số trong **cùng transaction**:

```sql
SELECT set_config('app.actor_id', $1, true);
SELECT set_config('app.environment', $2, true);
SELECT set_config('app.department_ids', $3, true); -- JSON array UUID
SELECT set_config('app.assigned_contract_ids', $4, true); -- JSON array UUID
SELECT set_config('app.permissions', $5, true); -- JSON array permission
SELECT set_config('app.global_contract_scope', $6, true);
SELECT set_config('app.correlation_id', $7, true);
SELECT set_config('app.app_version', $8, true);
```

Không ghép chuỗi SQL từ dữ liệu người dùng. RLS chỉ là lớp phòng vệ bổ sung; backend vẫn phải gọi permission engine trước mọi thao tác.

## Quy trình setup PostgreSQL DEV

Sau khi cấu hình `.env.local` hoặc secret file ngoài repository, chạy quy trình theo đúng thứ tự:

```powershell
npm.cmd run db:create
npm.cmd run db:migrate
npm.cmd run db:grant
npm.cmd run db:seed
npm.cmd run db:check
```

`db:migrate` chạy mọi migration theo thứ tự tên file bằng tài khoản trong `MIGRATION_DATABASE_URL`. `db:check` dùng tài khoản runtime trong `DATABASE_URL` và chỉ được đọc bảng theo dõi `tcms.schema_migrations`; quyền này không cho phép sửa hoặc xóa lịch sử migration.

Kiểm chứng backup và restore tự động vào database `_test` tạm thời:

```powershell
npm.cmd run db:backup
npm.cmd run db:verify-restore
npm.cmd run db:verify-personnel
npm.cmd run db:verify-contractors
npm.cmd run db:verify-supervision
npm.cmd run db:verify-milestones
npm.cmd run db:verify-inspections-issues
npm.cmd run db:verify-acceptances
npm.cmd run db:verify-documents
```

`db:verify-restore` chọn backup mới nhất, tạo `tcms_restore_readiness_test`, khôi phục và kiểm tra schema/migration, sau đó luôn xóa database tạm. Không chạy script này với credential production.

Không đưa connection string, mật khẩu hoặc token vào lệnh, README, mã nguồn hay lịch sử shell. Credential DEV phải được cấp qua cơ chế secret được phê duyệt.

## Việc chưa được phép coi là hoàn thành

- Migration `001`–`020`, seed, RLS, audit và restore đã được kiểm chứng trên PostgreSQL local DEV; Documents verifier kiểm chứng ngày 10/09/2026 và rollback sạch dữ liệu giả.
- Chưa kiểm thử PITR, mã hóa backup, lưu bản sao ngoài máy DEV hoặc RPO/RTO trên hạ tầng production.
- Khung OIDC đã có; chưa kiểm thử callback/token với IdP thật do chưa có cấu hình runtime trong workspace.
- Chưa tạo database role/grant production.
- Chưa được DBA/IT/ATTT review migration và chính sách RLS.
