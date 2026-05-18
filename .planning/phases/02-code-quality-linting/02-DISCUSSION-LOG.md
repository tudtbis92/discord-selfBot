# Phase 2: Code Quality & Linting - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18T09:51:12+07:00
**Phase:** 2-Code Quality & Linting
**Areas discussed:** Linter & Formatter Tooling, TS Strictness Level, Refactoring Focus, Build & Dev Integration

---

## Linter & Formatter Tooling

| Option | Description | Selected |
|--------|-------------|----------|
| TypeScript Compiler (`tsc`) + ESLint + Prettier | Cài đặt và thiết lập ESLint và Prettier để kiểm tra tĩnh và tự động format. | ✓ |
| Chỉ sử dụng TypeScript Compiler (`tsc`) | Giữ nguyên cấu trúc tối giản, không dùng thêm linter/formatter. | |
| TypeScript Compiler (`tsc`) + Prettier | Tự động định dạng code nhưng không có linter phát hiện lỗi logic. | |

**User's choice:** Option 1: TypeScript Compiler (`tsc`) + ESLint + Prettier.
**Notes:** Quyết định thiết lập đầy đủ hai công cụ này để kiểm soát chất lượng code chuyên nghiệp nhất.

---

## Linting Rules Standard

| Option | Description | Selected |
|--------|-------------|----------|
| Tiêu chuẩn khuyến nghị phổ biến (Recommended Standard) | `@typescript-eslint/recommended` kết hợp với config Prettier tiêu chuẩn. | |
| Tiêu chuẩn nghiêm ngặt (Strict Linting) | Cấm hoàn toàn kiểu `any`, bắt buộc kiểu rõ ràng ở mọi nơi quan trọng. | ✓ |

**User's choice:** Option 2: Tiêu chuẩn nghiêm ngặt (Strict Linting).
**Notes:** Nhằm đảm bảo mức an toàn về kiểu dữ liệu (type safety) cao nhất cho codebase.

---

## TS Strictness Level

| Option | Description | Selected |
|--------|-------------|----------|
| Bật toàn bộ strict flags bổ sung | Bật `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`. | ✓ |
| Giữ nguyên mức strict hiện tại | Chỉ giữ lại `"strict": true` trong `tsconfig.json`. | |

**User's choice:** Option 1: Bật toàn bộ strict flags bổ sung.
**Notes:** Triệt tiêu hoàn toàn các biến thừa, tham số dư thừa và bảo vệ cấu trúc rẽ nhánh rành mạch.

---

## Refactoring Focus

| Option | Description | Selected |
|--------|-------------|----------|
| Luồng điều khiển chính & Sự kiện | `src/structures/BaseAgent.ts` & `src/handler/` | |
| Luồng tự động hoá nông trại & Captcha | `src/feats/` | |
| Toàn diện: Kết hợp cả hai khu vực | Refactor cả 2 luồng điều khiển và tự động hoá. | ✓ |

**User's choice:** Option 3: Toàn diện: Kết hợp cả hai khu vực.
**Notes:** Cải tiến sâu rộng toàn bộ các module then chốt để bot đạt hiệu suất tốt nhất và dễ bảo trì.

---

## Build & Dev Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Tích hợp sâu (Lệnh độc lập + Chặn build lỗi) | Thêm script `lint`, `format` độc lập và tự động chặn build tsc khi linter báo lỗi. | ✓ |
| Chỉ thêm script độc lập để chạy thủ công | Lập trình viên tự chạy, không ràng buộc vào luồng build chính. | |

**User's choice:** Option 1: Tích hợp sâu (Lệnh độc lập + Chặn build lỗi).
**Notes:** Bảo vệ thư mục bản build `dest/` luôn sạch lỗi.

---

## the agent's Discretion

Không có - Mọi quyết định đều được thống nhất trực tiếp cùng người dùng.

## Deferred Ideas

Không có - Mọi ý tưởng thảo luận đều được thu gọn và phân tích trong phạm vi của Phase 2.
