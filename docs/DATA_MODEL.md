# TCMS Data Model

> Nguồn kiểm chứng: `src/types`, `database/migrations/001-003`, repository và seed hiện tại.

## Quan hệ tổng quát

```text
Department 1 ── N User
Department N ── N Contract (qua contract_departments)
Contractor 1 ── N Contract
Contract 1 ── N ContractSupervisor
Contract 1 ── N SupervisionDecision 1 ── N SupervisionAssignment
Personnel 1 ── N SupervisionAssignment N ── 0..1 WorkScope
Contract 1 ── N ContractItem
Contract 1 ── N Milestone N ── 0..1 WorkScope/ContractItem/Personnel
Contract 1 ── N Inspection N ── 0..1 WorkScope/ContractItem/Personnel
Inspection 1 ── N TechnicalIssue N ── 0..1 WorkScope/ContractItem/Personnel
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
| Supervision Decision / Assignment | **ALREADY IMPLEMENTED** | Migration 015, validation, repository, API/UI, RLS/audit và DEV integration test |
| Department | **ALREADY IMPLEMENTED** | Bảng/seed, migration 009, validation, repository, API, UI, RLS/audit và DEV integration test |
| User / Personnel | **ALREADY IMPLEMENTED** | `app_users`, role scopes, identity resolver, migration 011, validation, repository, API/UI quản trị, audit và DEV integration test |
| Contractor | **ALREADY IMPLEMENTED** | Migration 014, mã hóa liên hệ, repository, API/UI CRUD mềm, audit, backfill Contract và DEV integration test |
| Contract Item | **IN PROGRESS** | Type, validation, repository, API, UI và PDF import source đã có; chưa kiểm chứng PostgreSQL/audit end-to-end |
| Document | **IN PROGRESS** | Migration 019–020, GET API và UI tra cứu đã có/đã kiểm chứng DEV; chưa có upload Drive/quét malware thật |
| Audit Log | **IN PROGRESS** | Bảng append-only, trigger và audit helper có; chưa có UI, log tập trung hay kiểm thử DB thật |
| Milestone | **ALREADY IMPLEMENTED** | Migration 016, validation, repository, API/UI, RLS/audit và DEV integration test |
| Inspection | **ALREADY IMPLEMENTED** | Migration 017, validation, repository, API/UI, RLS/audit và DEV integration test |
| Issue / Technical Finding | **ALREADY IMPLEMENTED** | Migration 017, validation, repository, API/UI, RLS/audit và DEV integration test |
| Acceptance | **ALREADY IMPLEMENTED** | Migration 018, validation, repository, API/UI, RLS/audit và DEV integration test |
| Payment / Settlement | **IN PROGRESS** | Hiện chỉ là trường text trên Contract và quyền finance riêng |

## Contract — ALREADY IMPLEMENTED

Type UI/API hiện có các nhóm trường: ID/version/STT, số hợp đồng, tên gói thầu, đơn vị chủ trì, nhà thầu và liên hệ, supervisors, thông tin bàn giao, các mốc ngày, gia hạn, tiến độ, ghi chú khối lượng/chi phí, chỉ đạo, thanh toán/quyết toán, trạng thái và URL/tham chiếu hồ sơ.

Database có `version` và trigger tăng version để chống ghi đè. Trường liên hệ nhà thầu và thương mại được gom vào ciphertext trong repository DEV. `created_at`/`updated_at` có trong schema nhưng chưa nằm trong interface `Contract` trả về UI.

Trạng thái hợp đồng: `DRAFT`, `ACTIVE`, `IN_PROGRESS`, `TECHNICAL_COMPLETION`, `COMPLETED`, `CLOSED`, `SUSPENDED`, `CANCELLED`.

## Supervisor — ALREADY IMPLEMENTED

Interface client: `id`, `fullName`, `department`, `role?`. Database bổ sung `user_id`, khoảng hiệu lực và audit metadata. Repository hiện thay danh sách supervisor khi có thay đổi; việc phân công yêu cầu quyền chuyên biệt.

Trường này được giữ để tương thích với dữ liệu/form hợp đồng cũ. Nguồn chính thức cho phân công có số quyết định, thời hạn và phạm vi là `SupervisionDecision`/`SupervisionAssignment`.

## Supervision Decision / Assignment — ALREADY IMPLEMENTED

Migration 015 tạo `supervision_decisions` và `supervision_assignments`. Quyết định thuộc đúng một Contract, có số/ngày/trích yếu, khoảng hiệu lực, trạng thái `DRAFT | ISSUED | SUPERSEDED | REVOKED`, version và audit metadata. Phân công liên kết Personnel, Contract và WorkScope tùy chọn; khóa ngoại kép chặn gắn WorkScope của hợp đồng khác.

Chỉ quyết định `ISSUED` còn hiệu lực và phân công còn hiệu lực mới tự cấp role `SUPERVISOR` cùng contract scope khi ánh xạ identity. Quyết định đã ban hành không được sửa nội dung; chỉ có thể chuyển sang `SUPERSEDED` hoặc `REVOKED`. API/UI `/supervision-decisions` dùng quyền `contract.assignment.manage`; RLS và trigger database kiểm tra lại quyền/phạm vi.

## Department — ALREADY IMPLEMENTED

Database: `id`, `code`, `name`, `active`, `version`, timestamps. Department được dùng cho lead department, contract participation, supervisor và data scope. Seed hiện có PXVH1, PXSCCN, PXSCĐTĐ, P.KTAT, PAT. API/UI cho phép mọi tài khoản hợp lệ đọc đơn vị hoạt động; chỉ `SYSTEM_ADMIN` có MFA và `system.configure` được thêm, sửa hoặc ngừng sử dụng. Không xóa vật lý để bảo toàn liên kết lịch sử. Ghi dữ liệu được bảo vệ đồng thời tại API, RLS/trigger database và audit append-only.

## User / Personnel — ALREADY IMPLEMENTED

Database lưu `identity_subject`, tên đăng nhập/email, họ tên hiển thị, đơn vị chính, trạng thái hoạt động, version, thời điểm đồng bộ IdP và timestamps; không lưu mật khẩu. `user_role_scopes` gán vai trò theo toàn hệ thống, đơn vị hoặc hợp đồng, có khoảng hiệu lực. Migration 011 bổ sung optimistic locking, quyền ghi tối thiểu, audit đã loại thông tin định danh, ràng buộc đúng một loại phạm vi và bảo vệ quản trị viên toàn hệ thống cuối cùng.

API/UI `/personnel` chỉ cho tài khoản có đồng thời `user.manage`, `role.manage` và MFA. Không cho tự sửa/tự khóa tài khoản đang đăng nhập. Do security context hiện tại tổng hợp role/scope, UI/API tạm thời chặn trộn vai trò toàn cục với vai trò giới hạn và chặn nhiều loại vai trò giới hạn trên các phạm vi khác nhau để tránh mở rộng quyền ngoài ý muốn.

## Contractor — ALREADY IMPLEMENTED

Migration 003 tạo master entity `contractors`; migration 014 bổ sung mã bắt buộc, mã số thuế duy nhất khi có, version, phân quyền ghi, audit an toàn và backfill `contracts.contractor_id`. API/UI `/contractors` cho phép thêm, sửa và ngừng sử dụng; không xóa vật lý. Địa chỉ, điện thoại và người đại diện được mã hóa trong `sensitive_ciphertext`; tài khoản chỉ có quyền tra cứu không nhận các trường này từ API danh mục.

Contract giữ đồng thời `contractor_id` và `contractor_name`: ID liên kết dữ liệu tập trung, còn tên là ảnh chụp pháp lý tại thời điểm lưu hợp đồng. Đổi tên master không tự sửa tên trên hợp đồng cũ. Form hợp đồng mới/chỉnh sửa bắt buộc chọn master Contractor đang hoạt động; hợp đồng đang liên kết với Contractor đã ngừng sử dụng vẫn có thể đọc/chỉnh sửa mà không phá lịch sử.

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

## Milestone — ALREADY IMPLEMENTED

Migration 016 tạo `milestones`. Mỗi mốc thuộc một Contract và có thể liên kết tùy chọn với WorkScope, ContractItem và người phụ trách. Khóa ngoại kép bảo đảm WorkScope/ContractItem phải thuộc đúng hợp đồng. Các trường chính gồm mã/tên, mô tả, ngày kế hoạch, ngày dự báo, ngày thực tế, phần trăm hoàn thành, mốc trọng yếu, ghi chú, version và audit metadata.

Trạng thái: `NOT_STARTED | IN_PROGRESS | AT_RISK | DELAYED | COMPLETED | CANCELLED`. Trạng thái `COMPLETED` bắt buộc tiến độ 100% và có ngày thực tế; các trạng thái khác không được ghi ngày thực tế. API/UI `/milestones` hiển thị tổng hợp hoàn thành, chậm, có nguy cơ và mốc trọng yếu chưa xong. Quyền ghi dùng `contract.progress.update`, được kiểm tra ở route, RLS và trigger database. Milestone không tự ghi đè tiến độ Contract/ContractItem.

## Inspection — ALREADY IMPLEMENTED

Migration 017 tạo phiếu kiểm tra thuộc một Contract, có thể liên kết WorkScope, ContractItem và người kiểm tra đang hoạt động. Trường nghiệp vụ gồm mã, tiêu đề, ngày/loại kiểm tra, vị trí, kết luận, nội dung, kiến nghị và ngày kiểm tra tiếp theo. Kết luận: `PENDING | CONFORMING | CONFORMING_WITH_FINDINGS | NONCONFORMING | CANCELLED`.

API/UI `/inspections` dùng quyền `contract.acceptance.update`; route, RLS và trigger database cùng kiểm tra quyền/phạm vi. Khóa ngoại kép chặn gắn phạm vi hoặc hạng mục của hợp đồng khác. Optimistic locking và audit append-only đã được kiểm chứng trên DEV.

## Technical Issue / Finding — ALREADY IMPLEMENTED

Migration 017 tạo vấn đề kỹ thuật thuộc Contract, tùy chọn liên kết phiếu kiểm tra, WorkScope, ContractItem và người phụ trách. Nhóm vấn đề: kỹ thuật, chất lượng, an toàn, môi trường, tiến độ hoặc khác; mức độ: thấp đến nghiêm trọng. Trạng thái: `OPEN | IN_PROGRESS | PENDING_VERIFICATION | RESOLVED | CLOSED | CANCELLED`.

`RESOLVED`/`CLOSED` bắt buộc có ngày và nội dung xử lý; trạng thái khác không được lưu kết quả xử lý. API/UI `/issues` dùng quyền `contract.progress.update`, hiển thị số đang mở, quá hạn và nghiêm trọng chưa đóng. Không xóa vật lý trong UI/API.

## Document — IN PROGRESS

## Acceptance — ALREADY IMPLEMENTED

Migration 018 tạo biên bản nghiệm thu thuộc Contract, có thể liên kết WorkScope, ContractItem, Inspection và người xác nhận đang hoạt động. Loại nghiệm thu gồm khối lượng, chất lượng, giai đoạn, hoàn thành kỹ thuật và cuối cùng. Kết quả: `DRAFT | ACCEPTED | ACCEPTED_WITH_RESERVATIONS | REJECTED | CANCELLED`.

Kết quả chính thức bắt buộc có ngày và kết luận. `ACCEPTED_WITH_RESERVATIONS` bắt buộc ghi nội dung bảo lưu; khối lượng nghiệm thu nếu có phải kèm đơn vị. API/UI `/acceptance` dùng quyền `contract.acceptance.update`; route, RLS và trigger database cùng kiểm tra quyền/phạm vi. Khóa ngoại kép chặn liên kết khác hợp đồng, optimistic locking và audit đã được kiểm chứng trên DEV.

Bảng lưu metadata, loại/số/ngày tài liệu, SHA-256, Google Drive File ID, key version, trạng thái quét malware và archive. Migration 019–020 đã được áp dụng trên DEV; RLS cho người dùng đọc file `CLEAN`, người tải chỉ thấy file `PENDING/ERROR` của mình và tác vụ quét có quyền tối thiểu để xử lý file chờ. API `GET /api/documents` và UI `/documents` đã có dashboard, bộ lọc và bảng tra cứu. Chưa có API upload, OAuth Drive và máy quét mã độc thật nên nút tải lên vẫn bị khóa.

**DECISION**: file thực tế sẽ nằm trong một thư mục Google Drive dùng chung của phân xưởng; `storage_object_id` sẽ lưu Google Drive File ID. Trình duyệt không giữ credential Drive. Upload/download phải đi qua server và kiểm tra quyền hợp đồng. Thư mục Drive không thay thế bước kiểm tra loại file, kích thước, hash và quét malware trước khi công bố file là `CLEAN`.

## Audit Event — IN PROGRESS

Bảng lưu actor, action, resource, before/after, result, reason, correlation ID, IP/user agent/app version. Trigger loại ciphertext/storage identifiers khỏi payload và cấm update/delete. Việc audit từ chối quyền và đăng nhập chưa được kiểm chứng end-to-end với DB/IdP thật.

## Tiến độ hợp đồng — DECISION NEEDED

Hiện Contract có `progressPercent` nhập trực tiếp. Contract Item có `progress_percent` và `weight_percent` trong schema nhưng chưa có logic tổng hợp.

Định hướng **PLANNED**: `weighted progress = Σ(item progress × item weight) / 100`.

**NEEDS CONFIRMATION**: có cho phép fallback manual khi thiếu trọng số hay không, cách làm tròn và điều kiện tổng trọng số bằng 100%.
