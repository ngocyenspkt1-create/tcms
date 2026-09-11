# TCMS Project Overview

> Cập nhật theo repository và PostgreSQL DEV ngày 2026-09-07. Đây là mô tả trạng thái thực tế, không phải cam kết hệ thống đã sẵn sàng production.

## Status legend

- **ALREADY IMPLEMENTED**: có code/schema/API/UI trong repository.
- **IN PROGRESS**: đã có một phần nhưng chưa chạy hoặc chưa hoàn chỉnh end-to-end.
- **PLANNED**: mới là định hướng.
- **DECISION**: quyết định đã chốt, không tự ý thay đổi.
- **TODO**: việc cần thực hiện tiếp.

## TCMS là gì

TCMS (Technical Contract Management System) là web quản lý kỹ thuật hợp đồng của VH1. Hệ thống hướng đến quản lý tập trung hợp đồng, nhà thầu, đơn vị chủ trì, nhân sự giám sát, thời hạn, tiến độ, hạng mục kỹ thuật, tồn tại, nghiệm thu và hồ sơ liên quan.

## Mục tiêu

- Cung cấp một nguồn dữ liệu hợp đồng dùng chung, thay cho dữ liệu nghiệp vụ nằm riêng trong trình duyệt.
- Hỗ trợ theo dõi tiến độ, thời hạn, cảnh báo và trách nhiệm của các đơn vị/nhân sự.
- Cho phép truy vết thay đổi và phân quyền theo vai trò, đơn vị, hợp đồng được giao.
- Hoàn thiện local DEV trước; chuẩn bị kiến trúc để chuyển lên hạ tầng nội bộ sau này mà không viết lại nghiệp vụ.

## Nhóm người dùng

| Nhóm | Trạng thái | Mục đích |
|---|---|---|
| Quản lý hợp đồng | **ALREADY IMPLEMENTED** trong RBAC | Tạo/sửa hợp đồng, quản lý tiến độ, phân công, tài chính trong phạm vi được cấp |
| Người cập nhật hợp đồng | **ALREADY IMPLEMENTED** trong RBAC | Cập nhật nhận diện, tiến độ, nghiệm thu trong phạm vi |
| Giám sát | **ALREADY IMPLEMENTED** trong RBAC | Xem và cập nhật tiến độ/nghiệm thu hợp đồng được giao |
| Tài chính | **ALREADY IMPLEMENTED** trong RBAC | Cập nhật thanh toán/quyết toán |
| Người xem | **ALREADY IMPLEMENTED** trong RBAC | Chỉ đọc dữ liệu trong phạm vi |
| Quản trị hệ thống, kiểm toán ATTT | **ALREADY IMPLEMENTED** trong RBAC; UI quản trị **PLANNED** | Quản lý hệ thống/quyền và đọc audit; không mặc định có quyền sửa nghiệp vụ |

Các nhóm Vận hành 1, Phòng Kỹ thuật và Phòng An toàn được định hướng là các nhóm giám sát độc lập, có quyền cập nhật ngang nhau khi cùng được phân công.

## Current Architecture

### Stack thực tế — ALREADY IMPLEMENTED

- Next.js 16.3.2 App Router, React 19.2.8, TypeScript strict và Tailwind CSS 4.
- Route Handlers cho API; `pg` cho PostgreSQL; Auth.js/NextAuth 5 beta cho adapter OIDC.
- Không có ORM. Validation server hợp đồng hiện là code thủ công, chưa dùng schema validation library.

### Cấu trúc source

```text
src/app                 pages, layout và API routes
src/components          UI và ContractStoreProvider
src/types               domain types phía TypeScript
src/lib/security        permission engine và audit helper
src/server/auth         ánh xạ identity sang principal DB
src/server/contracts    validation/service/repository hợp đồng
src/server/db           pool và transaction security context
database/migrations     schema/RLS/audit tăng dần
database/seeds          dữ liệu giả DEV
scripts/database        create/migrate/seed/check/backup/restore
tests/security          unit tests permission và service
```

### Data flow hiện tại

```text
Browser/UI
  → ContractStoreProvider dùng fetch
  → Next.js /api/contracts
  → request identity + server authorization
  → security transaction
  → PostgresContractRepository
  → PostgreSQL + RLS + audit trigger
```

Frontend không có database credential và không kết nối PostgreSQL trực tiếp.

### Database — ALREADY IMPLEMENTED trên local DEV

PostgreSQL là database mục tiêu và toàn bộ repository/API hiện phụ thuộc nó. Migration 001–018, seed, RLS, audit, backup/restore drill và verifier theo domain đã chạy trên local DEV. TEST/UAT/PROD vẫn là **PLANNED** và cần IT/DBA/ATTT review.

### API — ALREADY IMPLEMENTED cho các domain hiện tại

- `GET /api/contracts`
- `POST /api/contracts`
- `GET /api/contracts/[id]`
- `PUT /api/contracts/[id]`
- Auth.js handlers tại `/api/auth/[...nextauth]`
- Contract Item, tracking, WorkScope, TimeRule, Goods Item, Department, Personnel, Contractor, Supervision Decision, Milestone, Inspection, Technical Issue và Acceptance.

### Authentication — IN PROGRESS

Code hỗ trợ OIDC qua Auth.js và DEV identity fallback ở server. DEV fallback chỉ được phép khi không phải production và được bật rõ bằng environment variable. Principal/role/scope được đọc từ PostgreSQL. IdP thật và cả luồng DEV chưa được kiểm chứng end-to-end.

### Local DEV architecture — DECISION

Ứng dụng Next.js và PostgreSQL chạy cục bộ; dữ liệu chỉ là dữ liệu giả. Cấu hình qua `.env.local` hoặc secret file không commit. Production server, production database và SSO thật là giai đoạn sau.

## Phạm vi hiện tại

### ALREADY IMPLEMENTED

- Trang tổng quan, danh sách hợp đồng, lọc/sắp xếp, bảng cảnh báo.
- Trang chi tiết, thêm và chỉnh sửa hợp đồng.
- Client store gọi API server-side; không còn dùng `localStorage` hoặc `mockContracts` cho hợp đồng.
- API hợp đồng: danh sách, xem chi tiết, tạo và cập nhật.
- PostgreSQL repository cho hợp đồng, transaction security context và optimistic locking.
- Permission engine, audit helper, PostgreSQL RLS/audit trigger bản thảo và security tests.
- Migration/seed/scripts local DEV cho PostgreSQL.

### IN PROGRESS

- PostgreSQL local DEV và migration `001`–`018` đã được xác nhận; chưa xác nhận trên TEST/UAT/PROD.
- DEV auth có code và seed identity nhưng phụ thuộc PostgreSQL/config local để chạy end-to-end.
- OIDC/Auth.js có adapter cấu hình nhưng chưa kiểm thử với IdP thật.
- Danh mục Department/Personnel/Contractor, Contract Item/WorkScope/TimeRule/Goods, quyết định giám sát, Milestone, Inspection, Technical Issue và Acceptance đã có schema/API/UI tương ứng.
- UI có một số nội dung mẫu tĩnh, ví dụ danh sách vấn đề trên dashboard.

### PLANNED

- Document workflow, payment/settlement chi tiết và audit UI.
- Tài liệu an toàn, audit UI, payment/settlement domain đầy đủ.
- TEST/UAT, production, SSO Công ty, KMS/Vault/HSM, SIEM, malware scanning và PITR.

## DECISIONS

1. Kiến trúc chính: Browser/UI → Next.js server/API → service/business logic → repository → PostgreSQL.
2. Frontend không kết nối trực tiếp PostgreSQL và không tự khai báo quyền thật.
3. Dữ liệu nghiệp vụ dùng chung không lưu trong `localStorage`.
4. Phát triển local DEV trước, chỉ dùng dữ liệu giả/ẩn danh.
5. Phân quyền được kiểm tra phía server theo vai trò và phạm vi dữ liệu; PostgreSQL RLS là lớp bổ sung.
6. Secret nằm ngoài source code; không dùng `NEXT_PUBLIC_*` cho secret.
7. Thay đổi schema phải là migration tăng dần và ưu tiên tương thích ngược.

## NEEDS CONFIRMATION

- Công nghệ/IdP/kho tài liệu được IT/ATTT phê duyệt chính thức.
- Quy tắc tính tiến độ hợp đồng từ hạng mục: nhập tay, weighted progress, hay kết hợp.
- Phân loại và thời hạn lưu từng nhóm dữ liệu/audit.
