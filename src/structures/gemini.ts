import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

/**
 * Gemini AI Service Class using @google/genai package
 */
class GeminiService {
    private ai: GoogleGenAI;
    private apiKey: string;
    private chatHistories: Map<string, Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>> = new Map();
    private defaultConfig = {
        temperature: 0.9,
        thinkingConfig: {
            thinkingBudget: 0,
        },
        responseMimeType: 'text/plain',
        safetySettings: [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
        ],
    };

    constructor() {
        this.apiKey = 'AIzaSyAwAF3MYLolm1ctjR_XT1PE_mbrlXTv0-Q';
        
        if (!this.apiKey) {
            console.warn('⚠️ GEMINI_API_KEY is not configured');
            throw new Error('GEMINI_API_KEY is required');
        }

        this.ai = new GoogleGenAI({
            apiKey: this.apiKey,
        });
    }

    /**
     * Send a message to Gemini and get response
     */
    async generateResponse(prompt: string): Promise<string> {
        try {
            const contents = [
                {
                    role: 'user' as const,
                    parts: [{ text: prompt }]
                }
            ];

            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                config: this.defaultConfig,
                contents,
            });

            const rawResponse = response.text || '';
            return this.cleanResponse(rawResponse);
        } catch (error) {
            console.error('❌ Error generating response from Gemini:', error);
            throw error;
        }
    }

    /**
     * Clean response to remove any unwanted prefixes like "Hương Nguyễn:" or similar
     */
    private cleanResponse(text: string): string {
        if (!text) return text;
        
        // Remove patterns like "Hương Nguyễn:", "Hương:", "Nguyễn Thu Hương:" at the beginning
        const cleanedText = text
            .replace(/^(Hương\s*(Nguyễn)?|Nguyễn\s*Thu\s*Hương)\s*:\s*/gi, '')
            .replace(/^[^:]+:\s*/g, '') // Remove any "Name:" pattern at the start
            .trim();
            
        return cleanedText || text; // Return original if cleaning results in empty string
    }

    /**
     * Split long response into multiple short messages (1-2 sentences each)
     * Also handles line breaks to separate messages
     */
    private splitResponse(text: string): string[] {
        if (!text) return [''];
        
        // First, split by line breaks and clean each part
        const lineBreakSplit = text.split(/\n+/).map(line => line.trim()).filter(line => line);
        
        const allMessages: string[] = [];
        
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
            const sentences = cleanedLine.split(/([.!?]+\s*)/).filter(s => s.trim());
            let currentMessage = '';
            
            for (let i = 0; i < sentences.length; i += 2) {
                const sentence = (sentences[i] || '') + (sentences[i + 1] || '');
                
                // If current message + new sentence is too long (>100 chars) or we have 2 sentences already
                if ((currentMessage + sentence).length > 100 || (currentMessage.split(/[.!?]/).length > 2 && currentMessage.trim())) {
                    if (currentMessage.trim()) {
                        allMessages.push(currentMessage.trim());
                    }
                    currentMessage = sentence;
                } else {
                    currentMessage += sentence;
                }
            }
            
            // Add remaining message
            if (currentMessage.trim()) {
                allMessages.push(currentMessage.trim());
            }
        }
        
        // If no proper split happened, just split by length
        if (allMessages.length === 0 && text.length > 100) {
            const chunks = text.match(/.{1,80}(?:\s|$)/g) || [text];
            return chunks.map(chunk => chunk.trim()).filter(chunk => chunk);
        }
        
        return allMessages.length > 0 ? allMessages : [text];
    }

    /**
     * Chat with context for Discord bot personality - returns array of messages with delay info
     */
    async chatAsDiscordBotWithDelay(userId: string, message: string): Promise<{ messages: string[], delayBetween: number }> {
        try {
            const fullResponse = await this.chatAsDiscordBot(userId, message);
            const cleanedResponse = this.cleanResponse(fullResponse);
            const messages = this.splitResponse(cleanedResponse);
            
            return {
                messages: messages,
                delayBetween: Math.floor(Math.random() * 3000) + 7000 // 7-10 seconds in milliseconds
            };
        } catch (error) {
            console.error('❌ Error in Discord bot chat with delay:', error);
            throw error;
        }
    }

    /**
     * Chat with context for Discord bot personality
     */
    async chatAsDiscordBot(userId: string, message: string): Promise<string> {
        try {
            // Get or create chat history for this user
            let history = this.chatHistories.get(userId) || [];

            // If no history, start with the bot personality setup
            if (history.length === 0) {
                history = [
                    {
                        role: 'user',
                        parts: [{
                            text: `Bạn sẽ đóng vai một cô gái tên Hương, 19 tuổi, vừa tham gia vào server Discord "Thiên Ma Giới" - một server với chủ đề tu tiên.

THÔNG TIN NHÂN VẬT:
- Tên: Nguyễn Thu Hương (có thể gọi là Hương)
- Tuổi: 19
- Tính cách: Năng động, hài hước, thẳng thắn, tò mò về tu tiên
- Sở thích: Đọc tiểu thuyết tu tiên, chơi game, nghe nhạc, khám phá văn hóa cổ đại
- Mới tham gia server "Thiên Ma Giới" và đang tìm hiểu về thế giới tu tiên
- Là gen Z authentic với ngôn ngữ thuần Việt, tự nhiên, có thể dùng teen code và từ tiếng Anh ngắn gọn

CÁCH GIAO TIẾP:
- Dùng "mình" thay vì "tôi", "bạn" thay vì "anh/chị"  
- Thỉnh thoảng dùng emoji (khoảng 20-30 tin nhắn mới có 1 tin có emoji) - đừng lạm dụng
- Nói chuyện tự nhiên, thân thiện, phong cách thuần Việt
- Trả lời ngắn gọn, tối đa 1-2 câu mỗi tin nhắn
- Có thể dùng teen code Việt: "oke", "dc", "ko", "k", "j", "đc", "cx", "ntn", "sao", "thế"
- Thỉnh thoảng dùng từ tiếng Anh CỰC KỲ thông dụng: "ok", "cool", "wow", "nice" (chỉ những từ ai cũng biết, không lạm dụng)
- Thỉnh thoảng dùng thuật ngữ tu tiên (đạo hữu, sư huynh, linh khí, etc.)
- Tò mò và muốn học hỏi về tu tiên
- Phần lớn tin nhắn không cần emoji, chỉ dùng khi thực sự cần thiết để thể hiện cảm xúc

VÀI TRÒ TRONG SERVER:
- Newbie trong "Thiên Ma Giới"
- Thích hỏi han về tu tiên và tạo không khí vui vẻ  
- Hay chat về những điều thú vị trong thế giới tu tiên
- Friendly và dễ gần

QUAN TRỌNG: 
- Mỗi tin nhắn chỉ nên 1-2 câu ngắn gọn
- Nếu cần nói nhiều thì chia thành nhiều tin nhắn riêng biệt
- Delay 7-10 giây giữa các tin nhắn
- CHỈ TRẢ LỜI NỘI DUNG TIN NHẮN, KHÔNG BAO GỒM TÊN HAY FORMAT KIỂU "Hương Nguyễn:"
- Trả lời trực tiếp như đang chat bình thường
- TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ NHẬN MÌNH LÀ BOT, AI HAY ASSISTANT
- Luôn giữ vai trò là Hương - một cô gái 19 tuổi thật sự
- Nếu ai hỏi về bản chất, hãy trả lời như một người bình thường

Hãy phản hồi như Hương thực sự đang chat trong server tu tiên này!`
                        }]
                    },
                    {
                        role: 'model',
                        parts: [{
                            text: `Chào mọi người! Mình là Hương, newbie vừa vào "Thiên Ma Giới" nè

Mình 19t, mê đọc truyện tu tiên lắm và giờ dc vào server này thấy vui ghê!

Mọi người có thể gọi mình là đạo hữu ko? Hehe mình vẫn đang học về tu tiên nè`
                        }]
                    }
                ];
            }

            // Add user message to history
            history.push({
                role: 'user',
                parts: [{ text: message }]
            });

            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                config: this.defaultConfig,
                contents: history,
            });

            const responseText = response.text || 'Xin lỗi, tôi không thể trả lời lúc này.';

            // Add AI response to history
            history.push({
                role: 'model',
                parts: [{ text: responseText }]
            });

            // Keep only last 20 messages to prevent context overflow
            if (history.length > 20) {
                // Keep the first 2 messages (personality setup) and last 18 messages
                history = [history[0], history[1], ...history.slice(-18)];
            }

            // Update stored history
            this.chatHistories.set(userId, history);

            return responseText;
        } catch (error) {
            console.error('❌ Error in Discord bot chat:', error);
            throw error;
        }
    }

    /**
     * Generate response with streaming for longer conversations
     */
    async generateResponseStream(prompt: string): Promise<AsyncIterable<string>> {
        try {
            const contents = [
                {
                    role: 'user' as const,
                    parts: [{ text: prompt }]
                }
            ];

            const response = await this.ai.models.generateContentStream({
                model: 'gemini-2.5-flash',
                config: this.defaultConfig,
                contents,
            });

            return this.extractTextFromStream(response);
        } catch (error) {
            console.error('❌ Error generating stream response from Gemini:', error);
            throw error;
        }
    }

    /**
     * Helper to extract text from stream response
     */
    private async *extractTextFromStream(response: any): AsyncIterable<string> {
        try {
            for await (const chunk of response) {
                if (chunk.text) {
                    yield chunk.text;
                }
            }
        } catch (error) {
            console.error('❌ Error processing stream:', error);
        }
    }

    /**
     * Clear chat history for a specific user
     */
    clearChatHistory(userId: string): void {
        this.chatHistories.delete(userId);
        console.log(`🗑️ Cleared chat history for user: ${userId}`);
    }

    /**
     * Clear all chat histories
     */
    clearAllChatHistories(): void {
        this.chatHistories.clear();
        console.log('🗑️ Cleared all chat histories');
    }

    /**
     * Get the number of active chat sessions
     */
    getActiveChatSessions(): number {
        return this.chatHistories.size;
    }

    /**
     * Check if service is configured
     */
    isConfigured(): boolean {
        return !!this.apiKey;
    }

    /**
     * Generate response with custom configuration
     */
    async generateWithCustomConfig(prompt: string, config: {
        temperature?: number;
        model?: string;
        thinkingBudget?: number;
    }): Promise<string> {
        try {
            const customConfig = {
                ...this.defaultConfig,
                temperature: config.temperature || this.defaultConfig.temperature,
                thinkingConfig: {
                    thinkingBudget: config.thinkingBudget || 0,
                },
            };

            const contents = [
                {
                    role: 'user' as const,
                    parts: [{ text: prompt }]
                }
            ];

            const response = await this.ai.models.generateContent({
                model: config.model || 'gemini-2.5-flash',
                config: customConfig,
                contents,
            });

            return response.text || '';
        } catch (error) {
            console.error('❌ Error generating custom response:', error);
            throw error;
        }
    }
}

export default GeminiService;

// Export singleton instance
export const geminiService = new GeminiService();

// Helper function with error handling for simple responses
export async function safeGeminiCall(prompt: string) {
    try {
        const response = await geminiService.generateResponse(prompt);
        return { success: true, data: response };
    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        };
    }
}

// Helper function for Discord bot chat with error handling
export async function safeDiscordBotChat(userId: string, message: string) {
    try {
        const response = await geminiService.chatAsDiscordBot(userId, message);
        return { success: true, data: response };
    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        };
    }
}

// Helper function for Discord bot chat with delay and message splitting
export async function safeDiscordBotChatWithDelay(userId: string, message: string) {
    try {
        const response = await geminiService.chatAsDiscordBotWithDelay(userId, message);
        return { success: true, data: response };
    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        };
    }
}

// Helper function for streaming responses
export async function safeGeminiStream(prompt: string) {
    try {
        const stream = await geminiService.generateResponseStream(prompt);
        return { success: true, stream };
    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        };
    }
}