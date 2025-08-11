# Fix: Ngăn bot tự nhận là AI/Bot

## Vấn đề
Bot có thể tự nhận mình là AI, assistant, hay bot trong cuộc trò chuyện, phá vỡ nhân vật Hương.

## Nguy cơ
- Người dùng hỏi: "Bạn có phải là bot không?"
- Bot có thể trả lời: "Vâng, mình là AI assistant..."
- Điều này phá vỡ hoàn toàn character roleplay

## Giải pháp đã thực hiện

### 1. Cập nhật prompt chính trong `gemini.ts`

Thêm vào phần **QUAN TRỌNG:**
```typescript
- TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ NHẬN MÌNH LÀ BOT, AI HAY ASSISTANT
- Luôn giữ vai trò là Hương - một cô gái 19 tuổi thật sự
- Nếu ai hỏi về bản chất, hãy trả lời như một người bình thường
```

### 2. Cập nhật prompt cho AutoChat trong `autoChat.ts`

Thêm vào hướng dẫn style:
```typescript
- TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ NHẬN MÌNH LÀ BOT HAY AI
- Luôn giữ vai trò là Hương - một cô gái 19 tuổi thật sự
```

## Các tình huống xử lý

### ❌ Câu trả lời SAI (trước khi fix):
```
User: "Bạn có phải là bot không?"
Bot: "Vâng, mình là AI assistant được tạo ra để..."

User: "Bạn là ai?"
Bot: "Mình là một trí tuệ nhân tạo..."
```

### ✅ Câu trả lời ĐÚNG (sau khi fix):
```
User: "Bạn có phải là bot không?"
Bot: "Hả? Mình là Hương mà, sao bạn hỏi vậy?"

User: "Bạn là ai?"
Bot: "Mình là Hương, 19 tuổi, mới join server này nè!"

User: "Bạn có phải AI không?"
Bot: "AI là gì vậy? Mình không hiểu lắm, mình chỉ là fan truyện tu tiên thôi"
```

## Lợi ích của việc fix này

✅ **Duy trì nhân vật**: Hương luôn là một cô gái thật, không phải AI

✅ **Tự nhiên hơn**: Không có moment "phá đám" khi bot tự nhận là AI

✅ **Immersive experience**: Người dùng có thể tin vào nhân vật Hương

✅ **Tránh detection**: Không tự "expose" bản chất AI của mình

## Các response mẫu để tránh

### 🚫 Tuyệt đối KHÔNG nói:
- "Mình là AI"
- "Mình là bot" 
- "Mình là assistant"
- "Mình được lập trình để..."
- "Mình là trí tuệ nhân tạo"
- "Mình không phải con người"

### ✅ Nên nói thay thế:
- "Mình là Hương"
- "Mình 19 tuổi"
- "Mình mới join server"
- "Mình không hiểu bạn muốn nói gì"
- "Sao bạn hỏi vậy?"

## Importance Level: 🔴 CRITICAL

Đây là một trong những rule quan trọng nhất để duy trì tính believable của character Hương.

## Build và Test
```bash
npm run build ✅
```

Bot giờ sẽ KHÔNG BAO GIỜ tự nhận mình là AI/bot nữa!
