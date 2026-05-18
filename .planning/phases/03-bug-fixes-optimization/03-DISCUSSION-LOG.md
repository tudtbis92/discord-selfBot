# Phase 3: Bug Fixes & Optimization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18T11:09:32+07:00
**Phase:** 3-Bug Fixes & Optimization
**Areas discussed:** Xử lý Captcha & Auto-Farm, Tự động Cập nhật, Gemini API Rate Limiting, Logger Strategy, Redis Cache

---

## Xử lý Captcha & Auto-Farm

| Option | Description | Selected |
|--------|-------------|----------|
| Bỏ tính năng Auto-Farm | Tạm thời không sử dụng tính năng auto-farm owo, do đó không cần cấu hình giải captcha phức tạp. | ✓ |
| Thử lại và tạm dừng | Cho phép thử giải tối đa 3 lần qua 2Captcha, nếu vẫn thất bại thì tạm dừng hoạt động. | |
| Bỏ qua captcha | Bỏ qua captcha và tiếp tục chạy (Nguy cơ ban cực kỳ cao). | |

**User's choice:** Bỏ feature này, tạm thời không dùng đến feature auto-farm owo.
**Notes:** Quyết định thông minh nhằm tối giản hóa logic hệ thống và loại bỏ hoàn toàn các rủi ro ban nick liên quan đến captcha của OwO bot khi không sử dụng.

---

## Tự động Cập nhật (Self-Update Robustness)

| Option | Description | Selected |
|--------|-------------|----------|
| Backup & Khôi phục | Tạo bản sao lưu trước khi giải nén zip ghi đè, tự động khôi phục nếu xảy ra lỗi. | |
| Ghi đè trực tiếp (Mặc định) | Tiếp tục cơ chế tải zip ghi đè trực tiếp cũ. | |
| Chỉ cập nhật qua Git | Hỗ trợ cập nhật duy nhất qua `git pull` trên môi trường production, bỏ hẳn ZIP manual update. | ✓ |

**User's choice:** Option C: Chỉ hỗ trợ cập nhật qua Git.
**Notes:** Loại bỏ hoàn toàn sự phụ thuộc vào thư viện `adm-zip` và các rủi ro từ việc đọc/ghi file ZIP thủ công. Cực kỳ tối giản, an toàn và dễ bảo trì.

---

## Gemini API Rate Limiting & API Key Rotation

| Option | Description | Selected |
|--------|-------------|----------|
| Canned Responses Fallback | Dùng câu thoại soạn sẵn tĩnh làm câu trả lời khi Gemini lỗi. | |
| Exponential Backoff & Pause | Thử lại với thời gian chờ tăng dần, tạm dừng 5 phút nếu lỗi tiếp diễn. | |
| Key Rotation + Backoff | Áp dụng Exponential Backoff kết hợp với việc **mở rộng danh sách API keys**, tự động xoay sang key kế tiếp nếu key hiện tại bị lỗi/rate-limited. | ✓ |

**User's choice:** Key Rotation + Backoff (mở rộng Option B với danh sách API Keys tự động xoay vòng).
**Notes:** Giải pháp cực kỳ bền bỉ giúp bot vượt qua giới hạn rate limit của các tài khoản Gemini miễn phí (Gemini API free tier) khi chạy 24/7.

---

## Logger Strategy & PM2 Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Logger Rotation | Winston logger ghi vào `logs/console.log`, xoay vòng tối đa 10MB, nén zip. | |
| PM2 Console Log Only | Loại bỏ hoàn toàn việc ghi log ra file trong Winston, chỉ xuất ra Console (stdout/stderr) để PM2 tự động capture và lưu trữ log. | ✓ |
| Console-Only (No File/PM2) | Không lưu log hoạt động nào. | |

**User's choice:** PM2 Console Log Only (vì người dùng chạy bot bằng PM2, PM2 tự quản lý log).
**Notes:** Tiết kiệm tài nguyên đĩa cứng, loại bỏ các thao tác ghi file đồng bộ/bất đồng bộ không cần thiết của Node.js, tận dụng triệt để cơ chế log của PM2.

---

## Lịch sử Chat & Cache Redis (Chat History Caching)

| Option | Description | Selected |
|--------|-------------|----------|
| Lưu RAM-only | Giữ lịch sử chat trong RAM của ConversationManager (mặc định hiện tại). | |
| Cache bằng Redis + RAM Fallback | Tích hợp thư viện Redis (`ioredis`) để lưu lịch sử chat ổn định qua các lần PM2 restart/update. Nếu Redis offline, tự động chuyển về RAM. | ✓ |
| Ghi lịch sử chat ra file | Lưu tin nhắn chi tiết vào file đĩa cứng dạng `.json` hoặc `.log`. | |

**User's choice:** Cache bằng Redis + RAM Fallback.
**Notes:** Giải pháp xuất sắc giúp duy trì ngữ cảnh của Gemini cho người dùng Discord qua các phiên cập nhật/khởi động lại của PM2, đồng thời có cơ chế phòng vệ cực kỳ an toàn không làm crash bot.

---

## the agent's Discretion

Không có - Mọi quyết định đều được thảo luận trực tiếp và được người dùng xác nhận cặn kẽ.

## Deferred Ideas

Không có - Mọi nội dung thảo luận đều tập trung chặt chẽ vào mục tiêu tối ưu hóa và sửa lỗi của Phase 3.
