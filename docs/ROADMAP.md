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
- [x] Migration 001–003 và seed dữ liệu DEV giả đã được viết.

Lưu ý: “Completed” ở đây nghĩa là phần mã/tài liệu đã tồn tại; không đồng nghĩa đã nghiệm thu trên hạ tầng thật.

## In Progress

- [ ] Cài/cấu hình PostgreSQL local và chạy kiểm chứng migration 001–003, seed, RLS, audit, backup/restore.
- [ ] Xác nhận DEV auth hoạt động end-to-end với các identity seed.
- [ ] Hoàn thiện Contract Item từ schema thành type → validation → repository → service → API → tab UI.
- [ ] Đồng bộ master Contractor với Contract hiện tại bằng adapter/migration tương thích.
- [ ] Chuẩn hóa validation server; hiện validation hợp đồng mới ở mức thủ công và chưa bao phủ đầy đủ ngày/status/nội dung.
- [ ] PDF Import Phase 2A–2D: provider AI, Structured Outputs, preview/edit và confirm import đã có trong source; còn cần cấu hình API key, chạy thử với PDF giả/đã ẩn danh và kiểm chứng PostgreSQL/audit end-to-end.
- [ ] PDF Contract mapping P0: source đã tách ngày ký, 210/150/20 ngày, điều kiện hiệu lực và evidence theo field; migration 006 đã viết. Còn cần chạy migration trên PostgreSQL DEV và kiểm chứng lại bằng PDF 117 đã ẩn danh trước khi coi là end-to-end.

## Next

### Milestone kế tiếp: xác nhận nền PostgreSQL local

1. Xác nhận PostgreSQL/CLI đã được cài.
2. Tạo `.env.local` không commit và chạy `db:setup`, `db:check` với dữ liệu giả.
3. Kiểm thử API list/detail/create/update bằng DEV identity.
4. Kiểm thử optimistic conflict, quyền chéo đơn vị, RLS và audit row.
5. Tạo backup DEV rồi restore vào database `_test`; ghi nhận kết quả.

### Sau khi database foundation đạt

Thực hiện Contract Item theo lát cắt nhỏ, luôn giữ UI hợp đồng hiện tại hoạt động:

1. Type/domain và validation.
2. Repository + service + tests.
3. API read-only trước.
4. Tab “Hạng mục hợp đồng” chỉ đọc.
5. CRUD từng bước với authorization/audit.
6. Logic tiến độ có fallback manual sau khi chốt quy tắc nghiệp vụ.

## Planned

1. Departments, personnel và contractors CRUD.
2. Milestones.
3. Inspections.
4. Technical issues/findings.
5. Acceptance theo Contract Item.
6. Documents metadata → storage/quarantine/malware scan.
7. Payment/settlement domain chi tiết và audit UI.
8. Hoàn thiện role administration và production OIDC/SSO adapter.
9. TEST/UAT, CI security checks, backup/PITR, KMS/Vault/HSM và production pilot sau phê duyệt.

## Known Issues / Technical Debt

- PostgreSQL/migration chưa có bằng chứng chạy thành công trên máy hiện tại: **NEEDS CONFIRMATION**.
- Worktree có nhiều thay đổi chưa commit; cần tránh reset hoặc ghi đè.
- `ContractApplicationService` và API route/repository hiện chưa dùng chung hoàn toàn một interface/luồng cho mọi thao tác.
- `requireContractPermission` đang tạo security resource từ department IDs của principal thay vì department IDs thật của contract; cần review trước mở rộng API.
- Update hợp đồng gửi cả object và re-encrypt payload nhạy cảm; cần kiểm thử field-level authorization kỹ.
- Chuyển trạng thái yêu cầu MFA + approval trong permission engine nhưng API chưa có approval workflow hoàn chỉnh.
- Trang chi tiết còn nội dung loading cũ nhắc dữ liệu trình duyệt.
- Dashboard `issues` là dữ liệu mẫu tĩnh.
- `Contract` TypeScript chưa có `createdAt`/`updatedAt` dù schema có.
- Contractor master và trường `contracts.contractor_name` đang tồn tại song song.
- Contract Item có schema/seed nhưng chưa có code ứng dụng.
- Chưa có integration test với PostgreSQL thật; tests hiện tại tập trung permission/service giả lập.
- Chưa có UI báo người dùng hiện tại/role thực tế; header còn nhãn tĩnh.

## Important Decisions

- **DECISION**: phát triển local DEV ổn định trước; chưa triển khai production.
- **DECISION**: giữ UI/chức năng đang hoạt động, migration từng bước, không rewrite toàn bộ.
- **DECISION**: Browser không truy cập database; mọi nghiệp vụ quan trọng qua server.
- **DECISION**: PostgreSQL là target persistent database.
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
