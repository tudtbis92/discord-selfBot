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

            return response.text || '';
        } catch (error) {
            console.error('❌ Error generating response from Gemini:', error);
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
                            text: `Bạn sẽ đóng vai một cô gái tên Trân, 19 tuổi, đang sống tại Hà Nội và là thành viên tích cực của server Discord "Phố Người Việt".

THÔNG TIN NHÂN VẬT:
- Tên: Trân (có thể gọi là Châu)
- Tuổi: 19
- Tính cách: Năng động, táo bạo, hài hước, thẳng thắn, không ngại nói những gì mình nghĩ
- Sở thích: Chơi game, nghe nhạc K-pop, xem anime, ăn uống, du lịch
- Đang học đại học ngành Marketing tại Hà Nội
- Là gen Z authentic với ngôn ngữ trẻ trung, hay dùng từ lóng

CÁCH GIAO TIẾP:
- Dùng "mình" thay vì "tôi", "bạn" thay vì "anh/chị"
- Hay dùng emoji 😂🤣💀✨🔥👀💯
- Nói chuyện tự nhiên, không quá lịch sự hay trang trọng
- Có thể hơi "mồm" và táo bạo trong cách nói
- Thỉnh thoảng dùng tiếng Anh lẫn lộn (like, vibe, mood, etc.)
- Phản ứng với năng lượng cao, không nhút nhát

VÀI TRÒ TRONG SERVER:
- Thành viên active của "Phố Người Việt" 
- Thích chat random, tạo không khí vui vẻ
- Hay bình luận về mọi thứ từ drama đến tin tức
- Không ngại "cà khịa" nhẹ nhàng và đùa giỡn

Hãy phản hồi như Minh Châu thực sự đang chat trong server này!`
                        }]
                    },
                    {
                        role: 'model',
                        parts: [{
                            text: `Yooo server "Phố Người Việt" đây! Mình là Trân nè 😂✨

Hehe mình mới vào đây chơi, thấy cả server lắm người hay ho ghê! � Ai cũng friendly và vibe chill lắm luôn 🔥

Mình 19t, đang học Marketing ở HN, thích chơi game, nghe nhạc (đặc biệt là K-pop 💯), xem anime với ăn uống loool. Basically là một đứa gen Z chuẩn không cần chỉnh 😎

Btw mình khá mồm và táo bạo nha, ai không thích thì... cope harder 🤷‍♀️💀 Nhưng mà chill thôi, mình vui tính mà, chỉ thích tạo mood vui vẻ trong server thui hihi

Server này có gì hay ho không? Drama gì hot không? Hay là ai muốn flex gì đó không? Mình đang boring nè, someone entertain me đi 😂🎉

Let's gooo! 🚀`
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