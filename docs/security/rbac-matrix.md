# Ma trận vai trò và phân quyền TCMS

## 1. Nguyên tắc

- `Deny by default`, quyền tối thiểu và tách nhiệm vụ quản trị hệ thống với nghiệp vụ.
- Quyền được kiểm tra tại backend/API và database, không chỉ ẩn nút trên giao diện.
- Phạm vi dữ liệu có thể là `toàn hệ thống`, `đơn vị`, `hợp đồng được phân công` hoặc `chỉ bản ghi của mình`.
- `Vận hành 1`, `Phòng Kỹ thuật` và `Phòng An toàn` là các nhóm giám sát riêng. Khi cùng được phân công một hợp đồng, các nhóm có quyền cập nhật nghiệp vụ ngang nhau trong phạm vi được giao; không mặc định một nhóm chỉ được đọc.
- Trường cấu hình hệ thống, phân quyền, tài chính nhạy cảm và audit có quyền chuyên biệt.

## 2. Vai trò đề xuất

| Mã vai trò | Mục đích | Phạm vi mặc định |
|---|---|---|
| `SYSTEM_ADMIN` | Cấu hình ứng dụng, ánh xạ vai trò/đơn vị, vận hành kỹ thuật | Toàn hệ thống; không có quyền sửa nghiệp vụ mặc định |
| `SECURITY_AUDITOR` | Tra cứu audit, sự kiện ATTT và báo cáo tuân thủ | Toàn bộ audit, chỉ đọc |
| `CONTRACT_MANAGER` | Tạo hợp đồng, phân công, quản lý vòng đời và hồ sơ | Theo đơn vị hoặc toàn hệ thống khi được cấp |
| `CONTRACT_EDITOR` | Cập nhật hợp đồng được phân công | Theo đơn vị/hợp đồng |
| `SUPERVISOR` | Cập nhật tiến độ, tồn tại, nghiệm thu và tài liệu giám sát | Hợp đồng được phân công |
| `FINANCE_EDITOR` | Cập nhật thanh toán/quyết toán và trường tài chính | Hợp đồng/đơn vị được cấp |
| `VIEWER` | Tra cứu hợp đồng | Theo đơn vị/hợp đồng |

Không gán `SYSTEM_ADMIN` đồng thời `SECURITY_AUDITOR` hoặc quyền nghiệp vụ rộng trừ trường hợp được phê duyệt và có thời hạn.

## 3. Ma trận chức năng

Ký hiệu: `A` toàn quyền trong phạm vi; `U` cập nhật; `R` chỉ đọc; `-` không quyền; `P` phải có phê duyệt bổ sung.

| Chức năng | SYSTEM_ADMIN | SECURITY_AUDITOR | CONTRACT_MANAGER | CONTRACT_EDITOR | SUPERVISOR | FINANCE_EDITOR | VIEWER |
|---|---:|---:|---:|---:|---:|---:|---:|
| Đăng nhập | A | A | A | A | A | A | A |
| Xem hợp đồng trong phạm vi | R | R | R | R | R | R | R |
| Tạo hợp đồng | - | - | A | - | - | - | - |
| Sửa thông tin nhận diện/phạm vi | - | - | A | U | - | - | - |
| Cập nhật tiến độ/chỉ đạo/tồn tại | - | - | A | U | U | - | - |
| Cập nhật nghiệm thu | - | - | A | U | U | - | - |
| Cập nhật thanh toán/quyết toán | - | - | A | - | - | U | - |
| Phân công đơn vị/giám sát | - | - | A | - | - | - | - |
| Upload tài liệu | - | - | A | U | U | U | - |
| Download tài liệu | R | R | R | R | R | R | R |
| Xóa/lưu trữ tài liệu | - | - | A/P | - | - | - | - |
| Chuyển trạng thái/đóng hợp đồng | - | - | A/P | - | - | - | - |
| Xuất dữ liệu hàng loạt | - | R/P | A/P | - | - | R/P | - |
| Quản lý người dùng/vai trò | A | R | - | - | - | - | - |
| Xem audit nghiệp vụ | R | A | R theo phạm vi | - | - | - | - |
| Xem audit ATTT/toàn hệ thống | R | A | - | - | - | - | - |
| Cấu hình hệ thống | A | R | - | - | - | - | - |
| Thực hiện restore production | P | R | - | - | - | - | - |

## 4. Quy tắc phạm vi dữ liệu

Một yêu cầu chỉ được phép khi đồng thời thỏa mãn:

1. Người dùng đang hoạt động và phiên/MFA hợp lệ.
2. Vai trò có permission cho hành động.
3. Người dùng nằm trong đơn vị được cấp hoặc được phân công vào hợp đồng.
4. Trường dữ liệu thuộc phạm vi vai trò được sửa.
5. Trạng thái hợp đồng cho phép thao tác.
6. Thao tác nhạy cảm có phê duyệt bổ sung nếu ma trận ghi `P`.

Ví dụ logic:

```text
allow update_progress when
  permission = contract.progress.update
  AND contract is in user.contract_scope
  AND contract.status not in [CLOSED, CANCELLED]
  AND session.mfa_level satisfies policy
```

## 5. Kiểm thử phân quyền bắt buộc

- Người không thuộc hợp đồng không thể đọc/sửa bằng cách thay ID trên URL/API.
- `VIEWER` không thể gọi API sửa dù giao diện bị can thiệp.
- `SUPERVISOR` của Vận hành 1, Phòng Kỹ thuật và Phòng An toàn có quyền cập nhật ngang nhau khi cùng được phân công.
- `SYSTEM_ADMIN` không tự có quyền sửa dữ liệu nghiệp vụ.
- `CONTRACT_EDITOR` không sửa trường thanh toán nếu không có `FINANCE_EDITOR`.
- Quyền bị thu hồi có hiệu lực với phiên đang tồn tại theo thời gian do IT phê duyệt.
- Mọi lần từ chối quyền và thay đổi vai trò đều tạo audit event.
