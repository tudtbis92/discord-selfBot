# Cải tiến AutoChat

## Các tính năng mới đã thêm

### 1. Kiểm tra tin nhắn mới nhất với delay thông minh
- **Mục đích**: Tránh spam khi bot vừa mới chat và giảm tần suất kiểm tra không cần thiết
- **Hoạt động**: 
  - Lần đầu phát hiện tin nhắn mới nhất là của bot: chỉ ghi nhận thời gian
  - Nếu sau 1 phút vẫn là tin nhắn của bot: tự động delay 3-5 phút ngẫu nhiên
  - Khi có tin nhắn của member khác: reset delay và hoạt động bình thường
- **Logic**: Giảm thiểu việc kiểm tra liên tục và tạo khoảng nghỉ tự nhiên

### 2. Context cuộc trò chuyện
- **Mục đích**: Tạo phản hồi phù hợp và tự nhiên hơn
- **Hoạt động**: Lấy 10 tin nhắn mới nhất trong channel để hiểu nội dung cuộc trò chuyện
- **Ứng dụng**: 
  - Khi được mention/reply: Sử dụng context để hiểu ngữ cảnh và đưa ra phản hồi phù hợp
  - Khi gửi tin nhắn ngẫu nhiên: Có thể comment hoặc tiếp tục chủ đề đang được thảo luận

## Thuộc tính mới đã thêm

### Delay Management
```typescript
private lastBotMessageCheckTime: number = 0; // Thời gian kiểm tra cuối khi tin nhắn mới nhất là của bot
private botMessageDelayTime: number = 0; // Thời gian delay khi tin nhắn mới nhất là của bot
```

## Methods mới đã thêm

### `getLastMessage()`
```typescript
private async getLastMessage(): Promise<Message | null>
```
- Lấy tin nhắn mới nhất trong channel
- Trả về `null` nếu có lỗi

### `getRecentMessages(limit: number)`
```typescript
private async getRecentMessages(limit: number = 10): Promise<Message[]>
```
- Lấy danh sách tin nhắn gần đây
- Mặc định lấy 10 tin nhắn
- Sắp xếp theo thời gian tăng dần

### `buildConversationContext(messages: Message[])`
```typescript
private buildConversationContext(messages: Message[]): string
```
- Xây dựng chuỗi context từ danh sách tin nhắn
- Lọc bỏ tin nhắn của bot và tin nhắn rỗng
- Chỉ lấy 5 tin nhắn gần nhất
- Giới hạn độ dài nội dung mỗi tin nhắn (100 ký tự)

## Cải tiến hoạt động

### Delay Logic (MỚI)
1. **Lần đầu phát hiện**: Tin nhắn mới nhất là của bot → Ghi nhận thời gian, chưa delay
2. **Kiểm tra lại < 1 phút**: Vẫn là tin nhắn của bot → Delay 3-5 phút ngẫu nhiên
3. **Có tin nhắn mới**: Của member khác → Reset delay, hoạt động bình thường
4. **Trong thời gian delay**: Bỏ qua tất cả auto chat, chỉ phản hồi mention/reply

### Mention/Reply Response
- Bây giờ sẽ đọc context cuộc trò chuyện gần đây
- Tạo prompt đầy đủ hơn cho Gemini bao gồm cả context và tin nhắn hiện tại
- Phản hồi phù hợp và tự nhiên hơn với ngữ cảnh

### Random Chat
- Kiểm tra delay trước khi thực hiện bất kỳ hành động nào
- Kiểm tra tin nhắn mới nhất với logic delay thông minh
- Sử dụng context cuộc trò chuyện để tạo chủ đề phù hợp

## Status Display (MỚI)

Command `#autochat` giờ hiển thị thông tin delay:
- **Chat tiếp theo**: Hiển thị thời gian còn lại
- **Delay status**: `⏳ Delay X phút (tin nhắn cuối là của bot)` khi đang delay
- **Normal status**: `X phút nữa` khi hoạt động bình thường

## Cách sử dụng

Các cải tiến này hoạt động tự động, không cần thay đổi cách sử dụng command:

```
# Xem trạng thái (bao gồm delay info)
#autochat

# Bật auto chat
#autochat on <channelId>

# Tắt auto chat  
#autochat off

# Đặt khoảng thời gian
#autochat interval <phút>

# Test gửi tin nhắn
#autochat test
```

## Lợi ích

1. **Giảm spam kiểm tra**: Không kiểm tra liên tục khi tin nhắn mới nhất là của bot
2. **Tự nhiên hơn**: Bot có khoảng nghỉ tự nhiên 3-5 phút khi vừa chat
3. **Phù hợp ngữ cảnh**: Phản hồi dựa trên nội dung cuộc trò chuyện gần đây
4. **Thông minh hơn**: Có thể tiếp tục chủ đề hoặc comment phù hợp
5. **Tiết kiệm tài nguyên**: Ít API calls không cần thiết
6. **Minh bạch**: Hiển thị rõ trạng thái delay trong status

## Build và chạy

```bash
npm run build
node dest/index.js -i trantran1629.json -d
```
