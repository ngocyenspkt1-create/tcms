# Database TCMS

## Trạng thái

`DRAFT - CHỈ DÙNG CHO DEV/TEST VỚI DỮ LIỆU GIẢ`

Ba migration tại `migrations/001_security_foundation.sql`, `migrations/002_api_runtime.sql` và `migrations/003_contract_domain.sql` tạo schema PostgreSQL, RBAC, audit append-only, RLS bắt buộc, role runtime quyền tối thiểu và nền dữ liệu Contract/Contract Item.

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

`db:migrate` chạy migration 001, 002 và 003 theo thứ tự tên file bằng tài khoản trong `MIGRATION_DATABASE_URL`. `db:check` dùng tài khoản runtime trong `DATABASE_URL` và chỉ được đọc bảng theo dõi `tcms.schema_migrations`; quyền này không cho phép sửa hoặc xóa lịch sử migration.

Không đưa connection string, mật khẩu hoặc token vào lệnh, README, mã nguồn hay lịch sử shell. Credential DEV phải được cấp qua cơ chế secret được phê duyệt.

## Việc chưa được phép coi là hoàn thành

- Chưa chạy migration trên PostgreSQL thật.
- Chưa benchmark hoặc kiểm thử restore/PITR.
- Khung OIDC đã có; chưa kiểm thử callback/token với IdP thật do chưa có cấu hình runtime trong workspace.
- Chưa tạo database role/grant production.
- Chưa được DBA/IT/ATTT review migration và chính sách RLS.
