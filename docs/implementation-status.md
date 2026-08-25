# Trạng thái triển khai nền tảng ATTT

Ngày đối chiếu repository: 2026-08-25

## ALREADY IMPLEMENTED trong mã nguồn

- Permission engine deny-by-default theo role và contract scope.
- Tách vai trò quản trị hệ thống, nghiệp vụ, giám sát, tài chính và kiểm toán.
- Kiểm soát MFA/approval ở permission engine cho nhóm thao tác nhạy cảm.
- Audit sanitizer che secret và audit trigger loại ciphertext khỏi before/after payload.
- PostgreSQL schema có optimistic locking, append-only audit và RLS/FORCE RLS.
- API hợp đồng dùng server identity, server authorization, security transaction và repository.
- AES-256-GCM provider bằng key file cho DEV/TEST; code tự từ chối provider này ở production.
- Migration 001–003, seed dữ liệu giả và scripts database/backup/restore đã có trong repository.
- Security tests cho permission engine và application service.

## IN PROGRESS / chưa kiểm chứng end-to-end

- Chưa có bằng chứng PostgreSQL local đã chạy migration 001–003 thành công.
- Chưa có integration tests trên DB thật cho RLS, audit trigger, concurrency, backup/restore.
- DEV auth có code/seed nhưng chưa xác nhận luồng runtime hoàn chỉnh.
- OIDC adapter có code nhưng chưa kết nối IdP thật.
- Contractors và Contract Items có schema nhưng chưa có đầy đủ application layers.
- Document table/policies có nhưng upload/storage/malware scan chưa triển khai.
- Audit DB có nhưng chưa có UI, SIEM, retention và kiểm thử đầy đủ sự kiện từ chối/đăng nhập.

## PLANNED

- Vault/HSM/KMS production, key rotation/rewrap.
- Antivirus, quarantine và kho tài liệu được phê duyệt.
- SAST/DAST/SBOM/secret scan trong pipeline Công ty.
- TEST/UAT/PROD tách biệt, TLS/reverse proxy/rate limit/IP policy.
- PITR và restore drill theo RPO/RTO được phê duyệt.
- Checklist Phụ lục 1 và đăng ký Phụ lục 2 trước nghiệm thu.

## NEEDS CONFIRMATION

- PostgreSQL và công nghệ phụ trợ trong danh mục được phép.
- IdP/SSO, KMS/secret manager, kho file, antivirus, SIEM.
- Phân loại/retention dữ liệu và audit; RPO/RTO.
- GitHub hiện tại hay Git nội bộ cho giai đoạn chính thức.

Không dùng dữ liệu thật trong DEV/TEST và không coi các mục chỉ có schema/tài liệu là feature đã hoàn thành.
