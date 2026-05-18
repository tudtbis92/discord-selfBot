# Phase 1: Project Reorganization & Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 1-Project Reorganization & Cleanup
**Areas discussed:** Chiến lược tổ chức thư mục, Xử lý file thừa/rác, Dọn dẹp Dependencies

---

## Chiến lược tổ chức thư mục

| Option | Description | Selected |
|--------|-------------|----------|
| Feature-based | Chuyển cấu trúc thư mục sang chia theo tính năng (src/features/...) | |
| Technical-based | Giữ nguyên cấu trúc theo mặt kỹ thuật (commands, handler, utils) | ✓ |

**User's choice:** giữ nguyên cấu trúc thư mục
**Notes:** Chỉ dọn dẹp và tổ chức lại bên trong các thư mục hiện có.

---

## Xử lý file thừa/rác

| Option | Description | Selected |
|--------|-------------|----------|
| Xóa vĩnh viễn | Xóa hoàn toàn các tệp code thừa (phụ thuộc vào Git) | ✓ |
| Archive | Chuyển tạm vào thư mục `archive/` để lưu trữ | |

**User's choice:** xoá sạch
**Notes:** Gọn gàng nhất, mã nguồn dư thừa sẽ biến mất hoàn toàn.

---

## Dọn dẹp Dependencies (package.json)

| Option | Description | Selected |
|--------|-------------|----------|
| Tự động hóa hoàn toàn | Tự động quét và loại bỏ thư viện không dùng | ✓ |
| Duyệt trước khi xoá | Liệt kê danh sách nghi ngờ để user duyệt | |
| Bỏ qua | Không chạm vào `package.json` | |

**User's choice:** tự động hoá
**Notes:** Cho phép hệ thống tự quét và gỡ các thư viện rác.

---

## the agent's Discretion

None

## Deferred Ideas

None
