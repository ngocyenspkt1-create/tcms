# Web quản lý hợp đồng VH1

Ứng dụng theo dõi hợp đồng, tiến độ, thời hạn, nhà thầu, nhân sự giám sát và hồ sơ của Phân xưởng Vận hành 1.

## Chức năng hiện có

- Trang tổng quan và các chỉ số theo dữ liệu hợp đồng hiện tại.
- Danh sách hợp đồng, tìm kiếm, lọc và sắp xếp.
- Trang chi tiết từng hợp đồng.
- Thêm hợp đồng mới.
- Chỉnh sửa hợp đồng và nhân sự giám sát.
- Tự tính thời gian còn lại và mức cảnh báo.
- API server-side và PostgreSQL repository; giao diện không còn lưu hợp đồng trong `localStorage`.
- Khung đăng nhập SSO/OIDC, phân quyền theo vai trò/phạm vi và audit ở PostgreSQL.

## Cấu hình DEV

### 1. Cài Node.js và PostgreSQL

Máy hiện dùng Node.js 24. PostgreSQL local chưa được cài. Mở PowerShell bằng quyền Administrator và chạy:

```powershell
winget install --source winget --id PostgreSQL.PostgreSQL.17 --exact
```

Trình cài đặt sẽ yêu cầu đặt mật khẩu cho tài khoản quản trị `postgres`. Không gửi hoặc commit mật khẩu này. Sau khi cài, đóng và mở lại PowerShell rồi kiểm tra `psql --version`.

### 2. Tạo cấu hình local

Sao chép `.env.example` thành `.env.local`. `.env.local` đã bị Git bỏ qua. Với local DEV có thể khai báo:

- `POSTGRES_ADMIN_URL`: chỉ dùng khi tạo database/role và cấp quyền.
- `MIGRATION_DATABASE_URL`: tài khoản owner chỉ chạy migration/seed.
- `DATABASE_URL`: tài khoản runtime quyền tối thiểu mà ứng dụng sử dụng.
- `DEV_AUTH_ENABLED=true` và chọn `DEV_AUTH_SUBJECT` từ dữ liệu seed.

Không dùng dữ liệu thật của Công ty trong DEV.

### 3. Tạo database, migration và seed

```powershell
npm.cmd install
npm.cmd run db:setup
npm.cmd run db:check
```

`db:setup` tạo database có hậu tố `_dev`, chạy các migration theo thứ tự, cấp role runtime và seed dữ liệu giả. Script từ chối thao tác nếu database không kết thúc bằng `_dev` hoặc `_test`.

## Chạy trên máy tính

Mở PowerShell tại thư mục dự án và chạy:

```powershell
npm.cmd install
npm.cmd run dev
```

Sau đó mở địa chỉ [http://localhost:3000](http://localhost:3000).

## Kiểm tra bản production

```powershell
npm.cmd run build
npm.cmd run start
```

Các lệnh kiểm tra mã nguồn:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:security
npm.cmd run build
```

## Backup và restore PostgreSQL DEV

Tạo backup:

```powershell
npm.cmd run db:backup
```

Backup được đặt trong `database/backups` và bị Git bỏ qua. Khôi phục vào database DEV/test đã cấu hình:

```powershell
npm.cmd run db:restore -- -BackupFile database/backups/tcms-dev-YYYYMMDD-HHMMSS.dump
```

Restore bị chặn nếu tên database không có hậu tố `_dev` hoặc `_test`.

## Lưu ý về dữ liệu

Chỉ dùng dữ liệu giả/ẩn danh trong DEV. Mã hiện đã dùng API và PostgreSQL tập trung, nhưng chưa được coi là sẵn sàng production cho đến khi IT/ATTT kiểm thử SSO, RLS, audit, backup/restore và tích hợp Vault/KMS/HSM.

Kiến trúc ATTT đích và checklist triển khai được quản lý tại [docs/README.md](docs/README.md). Các tài liệu này đang ở trạng thái chờ Chủ hệ thống và Bộ phận IT/ATTT phê duyệt.

Xem [trạng thái triển khai](docs/implementation-status.md) để phân biệt rõ phần đã kiểm tra trong mã nguồn và phần còn phải xác nhận trên hạ tầng DEV.
