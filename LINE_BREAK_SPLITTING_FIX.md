# Fix: Tách tin nhắn theo xuống dòng

## Vấn đề
Bot trả về tin nhắn dài có nhiều dòng trong 1 tin nhắn Discord:
```
Hương Nguyễn: Hì hì sorry Quyen nha, mình hỏi hơi "deep" một tí á 😅🎭

Hương Nguyễn: Mà linh khí quan trọng lắm đúng không Quyen?
```

## Mong muốn
Tách thành nhiều tin nhắn riêng biệt khi có xuống dòng.

## Giải pháp đã áp dụng

### Cập nhật Method `splitResponse()`

#### 1. **Tách theo xuống dòng trước**
```typescript
// First, split by line breaks and clean each part
const lineBreakSplit = text.split(/\n+/).map(line => line.trim()).filter(line => line);
```

#### 2. **Xử lý từng dòng riêng biệt**
```typescript
for (const line of lineBreakSplit) {
    // Clean each line to remove any remaining name prefixes
    const cleanedLine = this.cleanResponse(line);
    
    if (!cleanedLine) continue;
    
    // If the line is short enough, use it as is
    if (cleanedLine.length <= 100) {
        allMessages.push(cleanedLine);
        continue;
    }
    
    // If the line is too long, split it further by sentences
    // ... (logic tách theo câu)
}
```

#### 3. **Làm sạch từng dòng**
Mỗi dòng sẽ được làm sạch riêng để loại bỏ tên:
- `Hương Nguyễn: Hì hì sorry...` → `Hì hì sorry...`
- `Hương Nguyễn: Mà linh khí...` → `Mà linh khí...`

## Quy trình xử lý

### Input:
```
Hương Nguyễn: Hì hì sorry Quyen nha, mình hỏi hơi "deep" một tí á 😅🎭

Hương Nguyễn: Mà linh khí quan trọng lắm đúng không Quyen?
```

### Bước 1: Tách theo xuống dòng
```
[
  "Hương Nguyễn: Hì hì sorry Quyen nha, mình hỏi hơi \"deep\" một tí á 😅🎭",
  "Hương Nguyễn: Mà linh khí quan trọng lắm đúng không Quyen?"
]
```

### Bước 2: Làm sạch từng dòng
```
[
  "Hì hì sorry Quyen nha, mình hỏi hơi \"deep\" một tí á 😅🎭",
  "Mà linh khí quan trọng lắm đúng không Quyen?"
]
```

### Bước 3: Kiểm tra độ dài
- Dòng 1: < 100 ký tự → Giữ nguyên
- Dòng 2: < 100 ký tự → Giữ nguyên

### Output (2 tin nhắn Discord riêng biệt):
```
Message 1: "Hì hì sorry Quyen nha, mình hỏi hơi \"deep\" một tí á 😅🎭"
Message 2: "Mà linh khí quan trọng lắm đúng không Quyen?"
```

## Logic xử lý

1. **Ưu tiên cao**: Tách theo xuống dòng (`\n+`)
2. **Làm sạch**: Loại bỏ tên từ mỗi dòng riêng biệt
3. **Kiểm tra độ dài**: Nếu dòng > 100 ký tự → Tách thêm theo câu
4. **Fallback**: Nếu không tách được → Tách theo độ dài

## Lợi ích

✅ **Tự nhiên hơn**: Mỗi ý tưởng là một tin nhắn riêng
✅ **Đúng format Discord**: Không có tin nhắn dài với nhiều dòng
✅ **Tương tác tốt hơn**: Người dùng có thể reply từng tin nhắn
✅ **Timing tự nhiên**: Bot gửi từng tin nhắn với delay 7-10s

## Test Cases

### Case 1: Nhiều dòng ngắn
**Input:**
```
Hương: Chào bạn!

Hương: Bạn khỏe không?
```
**Output:** 2 tin nhắn riêng biệt

### Case 2: Dòng dài cần tách thêm
**Input:**
```
Hương: Đây là một câu rất dài có thể hơn 100 ký tự và cần được tách ra thành nhiều phần nhỏ hơn. Điều này rất quan trọng.

Hương: Câu ngắn.
```
**Output:** 3+ tin nhắn (tùy độ dài)

## Build và Test
```bash
npm run build ✅
```

Bây giờ bot sẽ tách tin nhắn theo xuống dòng một cách thông minh!
