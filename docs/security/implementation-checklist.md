# Checklist triển khai an toàn TCMS

Tài liệu này là checklist kỹ thuật nội bộ của dự án, không thay thế Phụ lục 1 chính thức của CS-ATTT-KTAT-21.

## A. Phê duyệt và dữ liệu

- [ ] Có Chủ hệ thống, Chủ dữ liệu và đầu mối IT/ATTT.
- [ ] Có quyết định Git nội bộ và repository production.
- [ ] Công nghệ đã đối chiếu 1826/QĐ-EVN và 1248/QĐ-EVN.
- [ ] Hoàn thành phân loại từng nhóm dữ liệu/trường dữ liệu.
- [ ] Xác định thời hạn lưu, xóa, archive và quyền xuất dữ liệu.
- [ ] DEV/TEST chỉ có dữ liệu giả hoặc đã ẩn danh được phê duyệt.
- [ ] Không còn dữ liệu nội bộ trong localStorage, mã nguồn, log hoặc repository bên ngoài.

## B. Xác thực và phân quyền

- [ ] Dùng SSO Công ty qua OIDC/SAML hoặc broker AD/LDAP được phê duyệt.
- [ ] TCMS không lưu mật khẩu người dùng.
- [ ] MFA bắt buộc cho trang/vai trò quản trị.
- [ ] Phiên, cookie, CSRF, timeout và thu hồi phiên được kiểm thử.
- [ ] RBAC/ABAC deny-by-default được thực thi phía server.
- [ ] Kiểm thử IDOR/quyền chéo đơn vị/quyền theo trường.
- [ ] Quy trình cấp, rà soát định kỳ và thu hồi quyền được ban hành.
- [ ] Tài khoản break-glass có kiểm soát hai người và audit.

## C. Database và audit

- [ ] Mỗi môi trường có database, credential và network policy riêng.
- [ ] App không dùng superuser/owner database.
- [ ] Schema có foreign key, unique, check, transaction và optimistic locking.
- [ ] RLS/defense-in-depth được kiểm thử; backup không bị thiếu dòng do RLS.
- [ ] Audit ghi đủ create/update/delete/status/role/file/export/admin.
- [ ] Audit không chứa mật khẩu, token, khóa hoặc nội dung nhạy cảm không cần thiết.
- [ ] App không có quyền sửa/xóa audit.
- [ ] Log tập trung được bảo vệ, đồng bộ thời gian và có retention phê duyệt.

## D. Mã hóa và secret

- [ ] TLS cho mọi kết nối; chứng thư và cipher theo chuẩn IT.
- [ ] Field/file nhạy cảm dùng AES-GCM/envelope encryption theo thiết kế.
- [ ] Khóa nằm trong HSM/Vault/KMS, không nằm trong source/env production.
- [ ] Có quyền quản lý khóa tách biệt, rotation, rewrap, backup và recovery procedure.
- [ ] Backup được mã hóa bằng khóa tách khỏi nơi lưu backup.
- [ ] Secret scan không phát hiện credential trong toàn bộ lịch sử chuẩn bị phát hành.

## E. File upload

- [ ] Allowlist loại file, kiểm tra MIME/signature, dung lượng và tên file.
- [ ] Vùng cách ly không thực thi và không truy cập công khai.
- [ ] Quét malware trước khi đưa vào kho chính thức.
- [ ] File có hash, version, quyền download và audit.
- [ ] Signed URL có thời hạn ngắn hoặc tải qua API kiểm tra quyền.
- [ ] Kiểm thử file giả mạo, path traversal, zip bomb và file độc hại mẫu an toàn.

## F. DevSecOps và phát hành

- [ ] Git nội bộ, branch protection và review bắt buộc.
- [ ] CI chạy secret scan, SAST, dependency/license scan, SBOM và test.
- [ ] DAST/security test ở TEST/UAT trước nghiệm thu.
- [ ] Artifact production là artifact đã kiểm thử, không build thủ công trên PROD.
- [ ] Migration, backup/restore point và rollback plan được phê duyệt trước release.
- [ ] Không sửa trực tiếp code/schema/data PROD ngoài quy trình khẩn cấp có audit.
- [ ] Có source-code review và đánh giá ATTT độc lập trước nghiệm thu.

## G. Backup, khôi phục và vận hành

- [ ] RPO/RTO được Chủ hệ thống và IT phê duyệt.
- [ ] PostgreSQL base backup + WAL/PITR được cấu hình và giám sát.
- [ ] Database, file, audit và cấu hình cần thiết được backup đồng bộ.
- [ ] App không có quyền xóa backup; có bản tách biệt/immutable nếu khả thi.
- [ ] Có cảnh báo backup thất bại và kiểm tra manifest/hash.
- [ ] Restore drill đạt RPO/RTO, có biên bản và hành động khắc phục.
- [ ] Có runbook sự cố, lỗ hổng, thu hồi khóa/secret và rollback.
- [ ] Có theo dõi bản vá hệ điều hành, framework và thư viện.

## H. Phân tách môi trường

- [ ] DEV, TEST/UAT, PROD có domain, IdP client, database, key và storage riêng.
- [ ] Developer không truy cập trực tiếp dữ liệu PROD.
- [ ] Pipeline PROD dùng identity riêng và phê duyệt tối thiểu hai bước.
- [ ] Network allowlist chỉ mở các luồng trong sơ đồ kiến trúc.
- [ ] TCMS không có kết nối trực tiếp đến OT/DCS/PLC.

## I. Điều kiện nghiệm thu

- [ ] Phụ lục 1 CS-ATTT-KTAT-21 hoàn tất theo biểu mẫu chính thức.
- [ ] TCMS được ghi nhận trong danh mục theo Phụ lục 2.
- [ ] Không còn lỗ hổng nghiêm trọng/cao chưa xử lý, trừ rủi ro được chấp nhận bằng văn bản.
- [ ] Danh sách rủi ro còn lại, chủ sở hữu và hạn xử lý được phê duyệt.
- [ ] Tài liệu vận hành, backup/restore, phân quyền và ứng cứu sự cố đã bàn giao.
