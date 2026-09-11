# TCMS Roadmap

> Đây là nguồn chính để biết dự án đang ở đâu. Chỉ chuyển mục sang Completed khi có code và kiểm chứng phù hợp.

## Completed

- [x] Khung Next.js App Router + TypeScript + Tailwind CSS.
- [x] UI tổng quan, danh sách, lọc/sắp xếp và cảnh báo hợp đồng.
- [x] UI xem chi tiết, thêm và chỉnh sửa hợp đồng/supervisor.
- [x] Client store đọc/ghi hợp đồng qua API; không còn dùng `localStorage`/mock contract làm kho nghiệp vụ.
- [x] Route API hợp đồng: `GET/POST /api/contracts`, `GET/PUT /api/contracts/[id]`.
- [x] PostgreSQL contract repository, parameterized queries, transaction security context và optimistic locking.
- [x] Permission engine deny-by-default theo role/scope; security unit tests hiện có.
- [x] Audit sanitizer và migration nền cho append-only audit/RLS.
- [x] Bộ script create/migrate/seed/check/backup/restore cho local DEV đã có trong repository.
- [x] Migration 001–008 và seed dữ liệu DEV giả đã được áp dụng trên PostgreSQL local.
- [x] Contract Item CRUD, tracking/checklist/daily log, PDF preview/import và OCR fallback đã có code/test.
- [x] Quy tắc thời gian, WorkScope và Contract Goods Item CRUD đã có schema/API/UI.
- [x] RLS, audit append-only, optimistic conflict và chống truy cập chéo hợp đồng đã được kiểm chứng trên DEV.
- [x] Backup tạo được; restore drill khôi phục đủ schema vào database `_test` rồi tự dọn sạch.
- [x] Lint, typecheck, security tests, route tests và production build đạt ngày 07/09/2026.
- [x] Font production không còn phụ thuộc tải từ Internet; HTTP security headers nền đã được cấu hình.
- [x] Department CRUD theo hướng soft-deactivate: migration 009, API/UI, quyền `system.configure`, RLS/audit và DEV integration test.
- [x] Runtime audit read grant tối thiểu qua migration 010; quyền xem vẫn bị RLS giới hạn bởi `audit.read.*`.
- [x] Personnel/User và role scope: migration 011–013, API/UI quản trị, MFA, optimistic locking, audit, chống tự khóa và bảo vệ vòng đời quản trị viên cuối cùng.
- [x] Contractor CRUD và liên kết Contract: migration 014, mã hóa liên hệ, API/UI, soft-deactivate, audit, backfill và DEV integration test.
- [x] Quyết định giám sát và phân công nhân sự: migration 015, liên kết Contract/Personnel/WorkScope, API/UI, RLS/audit, optimistic locking và DEV integration test.
- [x] Milestone và theo dõi tiến độ: migration 016, liên kết Contract/WorkScope/ContractItem/Personnel, ngày kế hoạch-dự báo-thực tế, cảnh báo trễ, RLS/audit, optimistic locking và DEV integration test.
- [x] Inspection và Technical Issue/Finding: migration 017, liên kết Contract/WorkScope/ContractItem/Personnel/Inspection, kết luận kiểm tra, mức độ-thời hạn-khắc phục, RLS/audit, optimistic locking và DEV integration test.
- [x] Acceptance theo Contract/Contract Item: migration 018, liên kết phạm vi/hạng mục/phiếu kiểm tra/người xác nhận, kết quả và bảo lưu, RLS/audit, optimistic locking và DEV integration test.
- [x] Documents metadata và màn hình tra cứu: migration 019–020, API `GET /api/documents`, dashboard/bộ lọc/bảng hồ sơ, liên kết thư mục Google Drive, RLS/audit và DEV integration test.

Lưu ý: “Completed” ở đây nghĩa là phần mã/tài liệu đã tồn tại; không đồng nghĩa đã nghiệm thu trên hạ tầng thật.

## In Progress

- [ ] Chốt phạm vi MVP chính thức và thay/ẩn các trang đang chỉ có dữ liệu mẫu.
- [ ] Hoàn thiện kiểm thử giao diện theo từng role và UAT nghiệp vụ.
- [ ] Chuẩn bị cấu hình/hướng dẫn bàn giao TEST/UAT/PROD cho IT.
- [ ] Chuẩn hóa validation server; hiện validation hợp đồng mới ở mức thủ công và chưa bao phủ đầy đủ ngày/status/nội dung.
- [ ] Kiểm chứng PDF/AI end-to-end bằng file đã ẩn danh với provider thật; tests hiện dùng provider giả lập.
- [ ] Hoàn thiện upload Google Drive phía server, kiểm tra loại/kích thước/hash và quét mã độc trước khi chuyển file sang trạng thái `CLEAN`.

## Next

### Phạm vi bắt buộc trước khi bàn giao IT

Chủ dự án đã xác nhận ngày 07/09/2026: phiên bản vận hành chính thức phải có đầy đủ các phân hệ, không bàn giao một MVP chỉ có Contract.

Thứ tự triển khai tiếp theo:

1. Hoàn thiện Documents upload: OAuth Google Drive phía server, vùng cách ly/quét mã độc, ghi metadata và công bố file an toàn.
2. Payment/Settlement reference, Audit Log UI và quản trị role/scope.
3. Dashboard/report dùng dữ liệu tập trung; loại bỏ toàn bộ dữ liệu mẫu có thể gây hiểu nhầm.
4. Browser E2E theo từng role, UAT, smoke test production, runbook triển khai/rollback.
5. Bàn giao [PRODUCTION_HANDOFF.md](PRODUCTION_HANDOFF.md) cho IT dựng TEST/UAT/PROD.

## Planned

1. Departments, personnel và contractors CRUD.
2. Inspections.
3. Technical issues/findings.
4. Acceptance theo Contract Item.
5. Documents metadata → storage/quarantine/malware scan. *(Metadata/UI tra cứu đã có; upload thật còn IN PROGRESS.)*
6. Payment/settlement domain chi tiết và audit UI.
7. Hoàn thiện role administration và production OIDC/SSO adapter.
8. TEST/UAT, CI security checks, backup/PITR, KMS/Vault/HSM và production pilot sau phê duyệt.

## Known Issues / Technical Debt

- Worktree có nhiều thay đổi chưa commit; cần tránh reset hoặc ghi đè.
- `ContractApplicationService` và API route/repository hiện chưa dùng chung hoàn toàn một interface/luồng cho mọi thao tác.
- `requireContractPermission` đang tạo security resource từ department IDs của principal thay vì department IDs thật của contract; cần review trước mở rộng API.
- Update hợp đồng gửi cả object và re-encrypt payload nhạy cảm; cần kiểm thử field-level authorization kỹ.
- Chuyển trạng thái yêu cầu MFA + approval trong permission engine nhưng API chưa có approval workflow hoàn chỉnh.
- Dashboard `issues` là dữ liệu mẫu tĩnh.
- `Contract` TypeScript chưa có `createdAt`/`updatedAt` dù schema có.
- Contractor master và trường `contracts.contractor_name` đang tồn tại song song.
- Trường `Contract.supervisors` cũ vẫn được giữ để tương thích; quyết định giám sát mới là nguồn chính thức cho phân công có hiệu lực.
- Chưa có UI báo người dùng hiện tại/role thực tế; header còn nhãn tĩnh.
- Trang danh sách hiển thị trạng thái 0 trong vài giây trước khi API tải xong; nên bổ sung loading state rõ ràng.
- Production OIDC chưa thể smoke test vì chưa có IdP/client secret thật; chạy production cục bộ sẽ từ chối DEV auth và API lỗi cấu hình secret.
- Chưa có dependency vulnerability scan trực tuyến trong phiên kiểm chứng gần nhất.
- Chưa có malware scanner, log tập trung, Vault/KMS/HSM, TLS production hoặc PITR; đây là điều kiện bàn giao IT, không phải chức năng đã hoàn thành.

## Important Decisions

- **DECISION**: bản bàn giao vận hành chính thức phải có đầy đủ các phân hệ TCMS đã xác định; không coi bản chỉ có Contract/Contract Item là hoàn thành.
- **DECISION**: phát triển local DEV ổn định trước; chưa triển khai production.
- **DECISION**: giữ UI/chức năng đang hoạt động, migration từng bước, không rewrite toàn bộ.
- **DECISION**: Browser không truy cập database; mọi nghiệp vụ quan trọng qua server.
- **DECISION**: PostgreSQL là target persistent database.
- **DECISION**: hồ sơ/tài liệu hợp đồng lưu trong một thư mục Google Drive dùng chung của phân xưởng (shared folder, không phải Shared Drive); PostgreSQL chỉ lưu metadata và Google Drive File ID. Tích hợp phải đi qua server, dùng `GOOGLE_DRIVE_FOLDER_ID` và danh tính dịch vụ được cấp quyền vào thư mục.
- **DECISION**: không lưu dữ liệu nghiệp vụ lâu dài bằng `localStorage`.
- **DECISION**: authorization phía server, deny-by-default, scope theo đơn vị/hợp đồng/phân công.
- **DECISION**: SYSTEM_ADMIN không mặc định có quyền sửa nghiệp vụ.
- **DECISION**: DEV auth phải bật rõ và không bao giờ hoạt động trong production.
- **DECISION**: production dùng SSO/OIDC khi IT cung cấp cấu hình; TCMS không lưu mật khẩu người dùng.
- **DECISION**: secret không hardcode/commit; production key thuộc KMS/Vault/HSM được phê duyệt.
- **DECISION**: DEV/TEST chỉ dùng dữ liệu giả hoặc đã ẩn danh.
- **DECISION**: không kết nối trực tiếp TCMS với OT/DCS/PLC trong phạm vi hiện tại.
- **DECISION**: PDF Import chỉ gửi PDF đã loại thông tin nhạy cảm tới AI; OpenAI Responses API là provider đầu tiên nhưng đi qua abstraction để có thể thay thế.
- **DECISION**: Structured Outputs chỉ tạo bản nháp; người dùng phải kiểm tra/sửa và xác nhận trước khi ghi DB. Trường không có căn cứ để trống, không cho AI tự suy đoán.
- **DECISION**: OCR local là fallback có cấu hình, không phải luồng phân tích chính.
