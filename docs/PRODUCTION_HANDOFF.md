# TCMS - Điều kiện bàn giao production cho IT

## Trạng thái hiện tại

Ngày kiểm chứng gần nhất: **07/09/2026**.

Local DEV đã đạt: migration `001`–`008`, seed giả, API Contract/Contract Item/WorkScope/TimeRule/Goods Item, RLS, audit append-only, optimistic locking, backup/restore drill, lint, typecheck, security tests, route tests và production build.

Kết quả này là bằng chứng kỹ thuật trên máy DEV, **không phải phê duyệt vận hành production**.

## Phạm vi chức năng phải hoàn thành

Chủ dự án yêu cầu bản bàn giao phải có đầy đủ: danh mục Department/Personnel/Contractor, Contract, Contract Item, WorkScope, TimeRule, Goods Item, quyết định giám sát, Milestone, Inspection, Technical Issue/Finding, Acceptance, Documents, Payment/Settlement reference, Audit Log UI, quản trị role/scope và dashboard/report từ dữ liệu tập trung.

Không được hiển thị dữ liệu mẫu như dữ liệu vận hành thật. Phân hệ chưa hoàn thành phải được đánh dấu rõ và không được đưa vào nghiệm thu.

## Điều kiện IT phải cung cấp

1. Máy chủ TEST/UAT/PROD tách biệt và tài khoản dịch vụ riêng cho từng môi trường.
2. DNS nội bộ, HTTPS/TLS và reverse proxy; chỉ mở cổng cần thiết qua firewall.
3. PostgreSQL production có TLS, role migration/runtime/backup tách biệt và quyền tối thiểu.
4. SSO/OIDC thật, MFA, redirect URI, client ID/secret và ánh xạ nhóm người dùng sang role TCMS.
5. Vault/KMS/HSM hoặc kho bí mật được phê duyệt; không dùng secret file DEV trong production.
6. Backup mã hóa, lưu ngoài máy chủ ứng dụng, lịch backup, retention, RPO/RTO và diễn tập restore/PITR.
7. Log tập trung/SIEM, thời hạn lưu log và quy trình truy xuất audit.
8. Thành phần quét virus/malware cho file tải lên trước khi bật luồng tài liệu production.
9. Git/CI được bảo vệ: review, build, test, dependency/SAST scan và lưu artifact triển khai.
10. Danh sách người dùng, đơn vị, vai trò, phạm vi dữ liệu; quy trình cấp/thu hồi quyền và tài khoản khẩn cấp.

Không gửi mật khẩu, khóa mã hóa hoặc OIDC client secret qua chat, Git hoặc tài liệu này. IT cấu hình trực tiếp bằng biến môi trường hoặc kho bí mật.

## Cấu hình production bắt buộc

- `NODE_ENV=production`.
- `DEV_AUTH_ENABLED` không được đặt `true`.
- `DATABASE_URL` trỏ tới runtime role, không phải owner/superuser.
- `MIGRATION_DATABASE_URL` chỉ cấp cho pipeline migration.
- `AUTH_OIDC_ISSUER`, `AUTH_OIDC_CLIENT_ID` và OIDC client secret thật.
- `TCMS_DB_SSL` không được đặt `disable`.
- Khóa mã hóa production phải đến từ Vault/KMS/HSM; cơ chế file hiện tại chỉ dành cho DEV/TEST.

## Trình tự bàn giao

1. IT dựng TEST và cấu hình secret/SSO/TLS.
2. Chạy migration bằng migration role, sau đó cấp grant runtime.
3. Chạy smoke test đăng nhập, phân quyền chéo đơn vị, CRUD, audit và upload an toàn.
4. Nghiệp vụ thực hiện UAT bằng dữ liệu giả hoặc đã ẩn danh.
5. Diễn tập backup/restore và phương án rollback.
6. ATTT/IT/nghiệp vụ ký checklist nghiệm thu trước khi nạp dữ liệu thật.

## Tiêu chí không được bỏ qua

- DEV auth không hoạt động trong production.
- Không truy cập PostgreSQL trực tiếp từ trình duyệt.
- Không dùng dữ liệu sản xuất thật trong DEV/TEST.
- Không vận hành qua HTTP hoặc kết nối PostgreSQL không mã hóa.
- Không bật upload tài liệu nếu chưa có kiểm soát loại/kích thước và quét malware.
- Không coi build/test local là bằng chứng SSO, TLS, backup hoặc giám sát production đã đạt.
