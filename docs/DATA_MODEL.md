# TCMS Data Model

> Nguồn kiểm chứng: `src/types`, `database/migrations/001-003`, repository và seed hiện tại.

## Quan hệ tổng quát

```text
Department 1 ── N User
Department N ── N Contract (qua contract_departments)
Contractor 1 ── N Contract
Contract 1 ── N ContractSupervisor
Contract 1 ── N ContractItem
Contract 1 ── N Document
User N ── N Role/Scope
Entity thay đổi ── N AuditEvent

ContractItem ── N Milestone/Inspection/Issue/Acceptance/Document  [PLANNED]
```

## Entity status

| Entity | Trạng thái thực tế | Bằng chứng |
|---|---|---|
| Contract | **ALREADY IMPLEMENTED** | Type, migration, repository, API, UI |
| Supervisor / Contract Supervisor | **ALREADY IMPLEMENTED** | Type, migration, form, repository |
| Department | **IN PROGRESS** | Bảng/seed/RLS scope có; chưa có domain API/UI quản trị |
| User / Personnel | **IN PROGRESS** | `app_users`, role scopes và identity resolver có; chưa có UI/API quản trị |
| Contractor | **IN PROGRESS** | Bảng/seed có; Contract vẫn giữ `contractor_name` và encrypted contact adapter; chưa có CRUD riêng |
| Contract Item | **IN PROGRESS** | Type, validation, repository, API, UI và PDF import source đã có; chưa kiểm chứng PostgreSQL/audit end-to-end |
| Document | **IN PROGRESS** | Bảng metadata/RLS/malware status có; chưa có API/storage/upload UI |
| Audit Log | **IN PROGRESS** | Bảng append-only, trigger và audit helper có; chưa có UI, log tập trung hay kiểm thử DB thật |
| Milestone | **PLANNED** | Chưa có bảng/type/API/UI |
| Inspection | **PLANNED** | Chưa có bảng/type/API/UI |
| Issue / Technical Finding | **PLANNED** | Dashboard chỉ có mảng mẫu tĩnh; chưa phải domain lưu trữ |
| Acceptance | **PLANNED** | Permission có định hướng; chưa có bảng/type/API/UI |
| Payment / Settlement | **IN PROGRESS** | Hiện chỉ là trường text trên Contract và quyền finance riêng |

## Contract — ALREADY IMPLEMENTED

Type UI/API hiện có các nhóm trường: ID/version/STT, số hợp đồng, tên gói thầu, đơn vị chủ trì, nhà thầu và liên hệ, supervisors, thông tin bàn giao, các mốc ngày, gia hạn, tiến độ, ghi chú khối lượng/chi phí, chỉ đạo, thanh toán/quyết toán, trạng thái và URL/tham chiếu hồ sơ.

Database có `version` và trigger tăng version để chống ghi đè. Trường liên hệ nhà thầu và thương mại được gom vào ciphertext trong repository DEV. `created_at`/`updated_at` có trong schema nhưng chưa nằm trong interface `Contract` trả về UI.

Trạng thái hợp đồng: `DRAFT`, `ACTIVE`, `IN_PROGRESS`, `TECHNICAL_COMPLETION`, `COMPLETED`, `CLOSED`, `SUSPENDED`, `CANCELLED`.

## Supervisor — ALREADY IMPLEMENTED

Interface client: `id`, `fullName`, `department`, `role?`. Database bổ sung `user_id`, khoảng hiệu lực và audit metadata. Repository hiện thay danh sách supervisor khi có thay đổi; việc phân công yêu cầu quyền chuyên biệt.

## Department — IN PROGRESS

Database: `id`, `code`, `name`, `active`, timestamps. Department được dùng cho lead department, contract participation, supervisor và data scope. Seed hiện có PXVH1, PXSCCN, PXSCĐTĐ, PKT, PAT. Chưa có API/UI quản lý danh mục.

## Contractor — IN PROGRESS

Migration 003 tạo master entity `contractors` và thêm `contracts.contractor_id`. Repository hợp đồng hiện vẫn chủ yếu đọc/ghi `contractor_name` cùng encrypted contact payload; chưa chuyển hoàn toàn sang master contractor. Cần migration/adapter từng bước để tránh phá UI.

## Contract Item — IN PROGRESS

Schema hiện có `contract_id`, STT/code/name/type, mô tả, đơn vị, khối lượng, trọng số, ngày kế hoạch/thực tế, tiến độ, ghi chú, nghiệm thu, status, version và archive metadata. Status: `NOT_STARTED`, `IN_PROGRESS`, `ON_HOLD`, `COMPLETED`, `ACCEPTED`, `CANCELLED`.

Ràng buộc đã có cho phần trăm, khối lượng không âm, ngày kết thúc và optimistic locking. TypeScript domain, service, repository, API và tab UI đã có trong worktree nhưng database runtime chưa được xác nhận, nên vẫn là **IN PROGRESS**.

PDF Import Phase 2A–2D trong source dùng provider abstraction. Provider OpenAI gửi PDF đã được người dùng xác nhận khử nhạy cảm vào Responses API với JSON Schema nghiêm ngặt, tạo `ContractItemImportDraft`, hiển thị evidence/page/confidence để sửa, rồi validate lại và nhập nhiều hạng mục trong một transaction. OCR local chỉ trả text fallback khi AI không khả dụng; fallback không tự tạo hạng mục.

Contract draft từ PDF tách dữ liệu thời gian pháp lý thành `signedDate`, `contractDurationDays`,
`serviceProvisionDurationDays`, `unitExecutionDurationDays`, `unitExecutionContinuous`,
`unitExecutionTriggerText` và `effectiveConditionText`. `contractStartDate` là ngày hiệu lực/bắt đầu
thực tế do người dùng xác nhận, không được tự suy ra từ ngày ký. Mỗi trường Contract do AI điền
phải có `fieldEvidence` gồm trang, dẫn chứng và độ tin cậy; thiếu dẫn chứng thì mapping để trống.
Các trường quản trị nội bộ như đơn vị chủ trì, giao hợp đồng, mời triển khai, bàn giao thực tế,
gia hạn, tiến độ và nhân sự không thuộc schema trích xuất từ PDF hợp đồng.

## Document — IN PROGRESS

Bảng lưu metadata, SHA-256, storage object ID, key version, trạng thái quét malware và archive. Chỉ file `CLEAN` được policy cho đọc. Kho file, antivirus và API chưa được xây dựng.

## Audit Event — IN PROGRESS

Bảng lưu actor, action, resource, before/after, result, reason, correlation ID, IP/user agent/app version. Trigger loại ciphertext/storage identifiers khỏi payload và cấm update/delete. Việc audit từ chối quyền và đăng nhập chưa được kiểm chứng end-to-end với DB/IdP thật.

## Tiến độ hợp đồng — DECISION NEEDED

Hiện Contract có `progressPercent` nhập trực tiếp. Contract Item có `progress_percent` và `weight_percent` trong schema nhưng chưa có logic tổng hợp.

Định hướng **PLANNED**: `weighted progress = Σ(item progress × item weight) / 100`.

**NEEDS CONFIRMATION**: có cho phép fallback manual khi thiếu trọng số hay không, cách làm tròn và điều kiện tổng trọng số bằng 100%.
