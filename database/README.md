# Database TCMS

## Trạng thái

`DRAFT - CHỈ DÙNG CHO DEV/TEST VỚI DỮ LIỆU GIẢ`

Hai migration tại `migrations/001_security_foundation.sql` và `migrations/002_api_runtime.sql` tạo schema PostgreSQL, RBAC, audit append-only, RLS bắt buộc và role runtime quyền tối thiểu.

IT đã xác nhận PostgreSQL DEV. DBA vẫn cần review migration và chạy bằng tài khoản migration riêng trước khi kết nối ứng dụng.

## Nguyên tắc tài khoản database

- `migration owner`: chỉ pipeline migration sử dụng; không dùng trong runtime.
- `application role`: SELECT/INSERT/UPDATE đúng bảng; không phải owner/superuser; không có quyền sửa/xóa audit.
- `audit reader`: chỉ đọc audit theo nhiệm vụ.
- `backup role`: tài khoản riêng theo công cụ backup; App không có credential này.

Migration tạo role nhóm `tcms_app_runtime` không có quyền đăng nhập. DBA tạo login DEV riêng rồi cấp membership; tuyệt đối không dùng owner/superuser cho API.

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

## Cách chạy thử sau khi DBA cấp PostgreSQL DEV

DBA tạo database và role migration riêng, sau đó chạy bằng công cụ nội bộ được phê duyệt. Ví dụ cú pháp tham khảo:

```powershell
psql --set ON_ERROR_STOP=1 --file database/migrations/001_security_foundation.sql
psql --set ON_ERROR_STOP=1 --file database/migrations/002_api_runtime.sql
```

Không đưa connection string, mật khẩu hoặc token vào lệnh, README, mã nguồn hay lịch sử shell. Credential DEV phải được cấp qua cơ chế secret được phê duyệt.

## Việc chưa được phép coi là hoàn thành

- Chưa chạy migration trên PostgreSQL thật.
- Chưa benchmark hoặc kiểm thử restore/PITR.
- Khung OIDC đã có; chưa kiểm thử callback/token với IdP thật do chưa có cấu hình runtime trong workspace.
- Chưa tạo database role/grant production.
- Chưa được DBA/IT/ATTT review migration và chính sách RLS.
