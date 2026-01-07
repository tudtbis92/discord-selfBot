# Mention Response Handler

## Mô tả
Hệ thống trò chuyện thông minh với AI khi self bot được mention trong Discord.

## Tính năng
- ✅ Chỉ phản hồi khi được mention bởi user có ID: `898126643598606367`
- ✅ Nội dung phản hồi được tạo tự động bởi Google Gemini AI
- ✅ **Ghi nhớ cuộc trò chuyện**: Lưu lại lịch sử chat và context
- ✅ **Tự động phản hồi**: Sau khi mention lần đầu, các tin nhắn tiếp theo không cần mention nữa
- ✅ **Timeout thông minh**: Tự động kết thúc conversation sau 30 phút không hoạt động
- ✅ Instruction có thể tùy chỉnh cho từng loại câu hỏi
- ✅ Hiển thị typing indicator khi đang xử lý
- ✅ Logging đầy đủ để theo dõi hoạt động
- ✅ Xử lý lỗi chi tiết và thông báo thân thiện

## Cách hoạt động

### 1. Bắt đầu cuộc trò chuyện
```
User: @SelfBot xin chào!
Bot: Chào bạn! Mình có thể giúp gì cho bạn không? 😊
```
→ Bot tạo một conversation session và lưu thông tin user + channel

### 2. Tiếp tục trò chuyện (không cần mention)
```
User: hôm nay thế nào?
Bot: Mình vẫn ổn! Còn bạn, ngày hôm nay có gì vui không? 🌟

User: có gì hay ho không?
Bot: Có chứ! Mình đang chat với bạn đây 😄
```
→ Bot tự động phát hiện tin nhắn trong channel có conversation active
→ Sử dụng lịch sử 20 tin nhắn gần nhất làm context

### 3. Timeout tự động
- Sau **30 phút** không có tin nhắn mới, conversation tự động kết thúc
- Cleanup task chạy mỗi 5 phút để dọn dẹp conversations cũ
- Muốn tiếp tục chat, chỉ cần mention lại bot

## Cấu trúc file

### 1. `/src/structures/ConversationManager.ts`
Quản lý các cuộc trò chuyện giữa bot và users.

**Chức năng:**
- Lưu trữ conversation sessions (userId, channelId, history, lastActivity)
- Kiểm tra conversation có active không
- Thêm tin nhắn vào lịch sử (tối đa 20 tin nhắn gần nhất)
- Tự động cleanup conversations hết hạn (>30 phút)
- Cleanup task chạy mỗi 5 phút

**API chính:**
```typescript
startConversation(userId, channelId)      // Bắt đầu conversation
hasActiveConversation(userId, channelId)  // Kiểm tra active
addMessage(userId, channelId, role, content) // Thêm tin nhắn
getHistory(userId, channelId)             // Lấy lịch sử
endConversation(userId, channelId)        // Kết thúc
getTimeRemaining(userId, channelId)       // Thời gian còn lại
```

### 2. `/src/config/mentionInstruction.ts`
File chứa các instruction để hướng dẫn AI cách phản hồi.

**Các loại instruction:**
- `greeting`: Chào hỏi thân thiện
- `question`: Trả lời câu hỏi
- `casual`: Trò chuyện thoải mái
- `help`: Cung cấp thông tin hữu ích

**Tùy chỉnh instruction:**
```typescript
export const MENTION_INSTRUCTION = `
// Thay đổi instruction chính ở đây
Bạn là một trợ lý AI thông minh...
`;
```

### 3. `/src/handler/mentionHandler.ts`
Handler xử lý logic khi bot được mention và quản lý conversations.

**Cách hoạt động:**
1. Lắng nghe sự kiện `messageCreate`
2. Kiểm tra user ID có phải `898126643598606367` không
3. Kiểm tra xem bot có được mention HOẶC có conversation active không
4. Nếu được mention → bắt đầu/tiếp tục conversation
5. Lấy lịch sử cuộc trò chuyện (nếu có)
6. Gửi prompt + history đến Google Gemini AI
7. Lưu tin nhắn user và phản hồi bot vào history
8. Gửi phản hồi về Discord

### 4. `/src/structures/gemini.ts`
Cập nhật thêm method `generateResponseWithHistory()` để hỗ trợ conversation context.

## Cách sử dụng

### Thay đổi User ID được phép mention
Mở file [src/handler/mentionHandler.ts](../src/handler/mentionHandler.ts):
```typescript
// Line 9
const ALLOWED_USER_ID = "898126643598606367"; // Thay đổi ID ở đây
```

### Thêm nhiều User ID được phép
```typescript
const ALLOWED_USER_IDS = [
    "898126643598606367",
    "123456789012345678",
    "987654321098765432"
];

// Trong handler, thay đổi:
if (!ALLOWED_USER_IDS.includes(userId)) return;
```

### Thay đổi thời gian timeout của conversation
Mở file [src/structures/ConversationManager.ts](../src/structures/ConversationManager.ts):
```typescript
// Line 13
private readonly CONVERSATION_TIMEOUT = 30 * 60 * 1000; // 30 phút

// Thay đổi thành:
private readonly CONVERSATION_TIMEOUT = 60 * 60 * 1000; // 60 phút
// hoặc
private readonly CONVERSATION_TIMEOUT = 10 * 60 * 1000; // 10 phút
```

### Thay đổi số lượng tin nhắn lưu trong history
Mở file [src/structures/ConversationManager.ts](../src/structures/ConversationManager.ts):
```typescript
// Line 93 trong method addMessage
if (conv.history.length > 20) {
    conv.history = conv.history.slice(-20);
}

// Thay 20 thành số khác, ví dụ 50:
if (conv.history.length > 50) {
    conv.history = conv.history.slice(-50);
}
```

### Tùy chỉnh phản hồi theo loại tin nhắn
Mở file [src/config/mentionInstruction.ts](../src/config/mentionInstruction.ts) và chỉnh sửa:
```typescript
export const INSTRUCTION_VARIANTS = {
    greeting: `Instruction của bạn cho greeting`,
    question: `Instruction của bạn cho question`,
    casual: `Instruction của bạn cho casual chat`,
    help: `Instruction của bạn cho help request`,
};
```

### Thêm loại instruction mới
```typescript
export const INSTRUCTION_VARIANTS = {
    // ... existing variants
    funny: `Trả lời hài hước, có thể kể chuyện cười`,
};

// Trong hàm getInstruction:
if (/(funny|hài|joke|cười)/i.test(lowerContent)) {
    return INSTRUCTION_VARIANTS.funny;
}
```

## Logging

Handler sẽ log các thông tin sau:
- ✅ Khi nhận được mention từ user
- ✅ Nội dung tin nhắn
- ✅ Phản hồi được tạo ra
- ✅ Trạng thái gửi phản hồi
- ⚠️ Lỗi nếu có

## Ví dụ sử dụng

### Trong Discord:
```
User: @SelfBot xin chào!
Bot: Chào bạn! Mình có thể giúp gì cho bạn không? 😊

User: @SelfBot làm sao để học lập trình?
Bot: Bắt đầu với một ngôn ngữ đơn giản như Python, 
     luyện tập thường xuyên và làm nhiều dự án nhỏ! 💻

User: @SelfBot hôm nay thế nào?
Bot: Mình vẫn khỏe! Còn bạn, ngày hôm nay có gì vui không? 🌟
```

## Lưu ý
- ⚠️ Chỉ user có ID được chỉ định mới có thể kích hoạt phản hồi
- ⚠️ Bot cần có API key của Google Gemini AI (đã được config trong gemini.ts)
- ⚠️ Phản hồi sẽ được giữ ngắn gọn (1-3 câu) để tránh spam
- ⚠️ Typing indicator sẽ hiển thị trong khi AI đang tạo phản hồi

## Troubleshooting

### Bot không phản hồi khi được mention
1. Kiểm tra User ID có đúng không
2. Xem log để kiểm tra lỗi
3. Đảm bảo Gemini API key còn hoạt động

### Phản hồi quá dài hoặc không phù hợp
1. Điều chỉnh `MENTION_INSTRUCTION` trong [mentionInstruction.ts](../src/config/mentionInstruction.ts)
2. Thêm điều kiện về độ dài trong instruction

### Lỗi API
1. Kiểm tra API key trong [gemini.ts](../src/structures/gemini.ts)
2. Xem log để biết chi tiết lỗi
3. Đảm bảo có kết nối internet
