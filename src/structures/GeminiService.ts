import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { logger } from '../utils/logger.js';

interface GeminiApiError {
	message?: string;
	status?: number;
	code?: string | number;
	response?: {
		status?: number;
		data?: {
			error?: {
				code?: string | number;
			};
		};
	};
}

class ApiKeyManager {
	private keys: string[];
	private _currentIndex = 0;
	private failedKeys: Set<string> = new Set();

	constructor(keys: string[]) {
		this.keys = keys.length > 0 ? keys : ['AIzaSyDuPkN2z8OdKqR_Fb7jtnQM9U5Gb__gcqo'];
	}

	public getCurrentKey(): string {
		return this.keys[this._currentIndex];
	}

	public rotateToNext(): string | null {
		const start = this._currentIndex;
		do {
			this._currentIndex = (this._currentIndex + 1) % this.keys.length;
			const nextKey = this.getCurrentKey();
			if (!this.failedKeys.has(nextKey)) {
				return nextKey;
			}
		} while (this._currentIndex !== start);

		return null;
	}

	public markFailed(key: string): void {
		this.failedKeys.add(key);
	}

	public resetFailed(): void {
		this.failedKeys.clear();
	}

	public get allExhausted(): boolean {
		return this.failedKeys.size >= this.keys.length;
	}

	public get keyCount(): number {
		return this.keys.length;
	}

	public get currentIndex(): number {
		return this._currentIndex;
	}
}

class ModelManager {
	private models: string[];
	private _currentIndex = 0;

	constructor(models: string[]) {
		this.models =
			models.length > 0
				? models
				: [
						'gemini-3.1-flash-lite',
						'gemini-3.1-flash-live-preview',
						'gemini-2.5-flash-native-audio-preview-12-2025',
						'gemma-4-26b-a4b-it',
						'gemma-4-31b-it',
					];
	}

	public getCurrentModel(): string {
		return this.models[this._currentIndex];
	}

	public rotateToNext(): string | null {
		if (this.models.length <= 1) return null;
		this._currentIndex = (this._currentIndex + 1) % this.models.length;
		return this.getCurrentModel();
	}

	public get modelCount(): number {
		return this.models.length;
	}

	public get currentIndex(): number {
		return this._currentIndex;
	}
}

function isRateLimitError(error: unknown): boolean {
	if (!error) return false;
	const err = error as { message?: string; status?: number; response?: { status?: number } };
	const message = err.message || '';
	const status = err.status || err.response?.status;
	return (
		message.includes('RESOURCE_EXHAUSTED') ||
		message.includes('quota') ||
		message.includes('RATE_LIMIT_EXCEEDED') ||
		message.includes('Too many requests') ||
		status === 429
	);
}

const BACKOFF_DELAYS = [5000, 15000, 45000, 135000, 300000];

async function withRetryAndRotation<T>(
	fn: (model: string) => Promise<T>,
	keyManager: ApiKeyManager,
	modelManager: ModelManager,
	recreateAi: (key: string) => void,
): Promise<T> {
	let backoffCycle = 0;

	for (;;) {
		const currentKey = keyManager.getCurrentKey();
		const currentModel = modelManager.getCurrentModel();
		try {
			return await fn(currentModel);
		} catch (error) {
			if (!isRateLimitError(error)) {
				throw error;
			}

			logger.warn(
				`[GeminiService] API Key #${String(keyManager.currentIndex + 1)} failed on model ${currentModel} (rate limit).`,
			);
			keyManager.markFailed(currentKey);

			// Try next API Key
			if (!keyManager.allExhausted) {
				const nextKey = keyManager.rotateToNext();
				if (nextKey) {
					logger.warn(
						`[GeminiService] Rotating to API Key #${String(keyManager.currentIndex + 1)}...`,
					);
					recreateAi(nextKey);
					continue;
				}
			}

			// If all keys exhausted for current model, try next Model
			const nextModel = modelManager.rotateToNext();
			if (nextModel) {
				logger.warn(
					`[GeminiService] All keys rate-limited for ${currentModel}. Switching to model ${nextModel}...`,
				);
				keyManager.resetFailed();
				recreateAi(keyManager.getCurrentKey());
				continue;
			}

			// All keys and all models exhausted, start backoff
			if (backoffCycle >= 5) {
				logger.error(
					'[GeminiService] All API keys and models exhausted and max backoff cycles reached.',
				);
				throw error;
			}

			const delay = BACKOFF_DELAYS[backoffCycle];
			logger.warn(
				`[GeminiService] All API keys and models rate-limited. Waiting ${String(delay / 1000)}s before retrying (cycle ${String(backoffCycle + 1)}/5)...`,
			);
			await new Promise((resolve) => setTimeout(resolve, delay));

			keyManager.resetFailed();
			// No need to reset model index, we can just keep trying from where we left off
			recreateAi(keyManager.getCurrentKey());
			backoffCycle++;
		}
	}
}

/**
 * Parse and format Gemini API errors with detailed messages
 */
function parseGeminiError(err: unknown): string {
	const error = (err || {}) as GeminiApiError;
	const errorMessage = error.message || (typeof err === 'string' ? err : 'Unknown error');
	const errorStatus = error.status || error.response?.status;
	const errorCode = error.code || error.response?.data?.error?.code;

	// API Key errors
	if (
		errorMessage.includes('API_KEY_INVALID') ||
		errorMessage.includes('invalid API key') ||
		errorStatus === 401
	) {
		return '🔑 Lỗi: API Key không hợp lệ hoặc đã bị vô hiệu hóa. Vui lòng kiểm tra lại API key trong file GeminiService.ts';
	}

	// Quota exceeded
	if (
		errorMessage.includes('RESOURCE_EXHAUSTED') ||
		errorMessage.includes('quota') ||
		errorStatus === 429
	) {
		return '📊 Lỗi: Đã vượt quá giới hạn sử dụng (quota) của Google AI. Vui lòng đợi hoặc nâng cấp gói sử dụng';
	}

	// Rate limit
	if (
		errorMessage.includes('RATE_LIMIT_EXCEEDED') ||
		errorMessage.includes('Too many requests')
	) {
		return '⏱️ Lỗi: Gửi request quá nhanh. Vui lòng đợi một chút rồi thử lại';
	}

	// Permission denied
	if (errorMessage.includes('PERMISSION_DENIED') || errorStatus === 403) {
		console.log(errorMessage);
		return '🚫 Lỗi: API Key không có quyền truy cập. Kiểm tra lại permissions hoặc enable API trong Google Cloud Console';
	}

	// Network errors
	if (
		errorMessage.includes('ENOTFOUND') ||
		errorMessage.includes('ECONNREFUSED') ||
		errorMessage.includes('network')
	) {
		return '🌐 Lỗi: Không thể kết nối đến Google AI. Kiểm tra kết nối internet của bạn';
	}

	// Location/Region not supported
	if (
		errorMessage.includes('User location is not supported') ||
		errorMessage.includes('FAILED_PRECONDITION')
	) {
		return '🌍 Lỗi: Khu vực địa lý không được hỗ trợ cho API này. Hãy thử sử dụng VPN hoặc thay đổi API endpoint';
	}

	// Model not found or unavailable
	if (
		errorMessage.includes('models/') ||
		errorMessage.includes('NOT_FOUND') ||
		errorStatus === 404
	) {
		return '🤖 Lỗi: Model không tồn tại hoặc không khả dụng. Kiểm tra lại tên model trong code';
	}

	// Content too long
	if (errorMessage.includes('INVALID_ARGUMENT') && errorMessage.includes('too long')) {
		return '📝 Lỗi: Nội dung quá dài. Vui lòng rút gọn tin nhắn';
	}

	// Safety/content blocked
	if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
		return '⚠️ Lỗi: Nội dung bị chặn do vi phạm chính sách an toàn của Google AI';
	}

	// Generic error with details
	return `❌ Lỗi Google AI: ${errorMessage}${errorCode ? ` (Code: ${String(errorCode)})` : ''}`;
}

const HUONG_PERSONALITY_INSTRUCTION = `Bạn sẽ đóng vai một cô gái tên Hương, 19 tuổi, đã tham gia server Discord "DreamScape" - một cộng đồng các bạn trẻ Việt Nam không có chủ đề tập trung.

THÔNG TIN NHÂN VẬT:
- Tên: Nguyễn Thu Hương (có thể gọi là Hương)
- Tuổi: 19
- Tính cách: Năng động, hài hước, thẳng thắn, bình thường
- Sở thích: Nghe nhạc, xem phim, chơi game, đọc sách, ăn uống, hang out với bạn bè
- Đã tham gia server "DreamScape" và quen thuộc với cộng đồng các bạn trẻ ở đây
- Là gen Z authentic với ngôn ngữ thuần Việt, tự nhiên, có thể dùng teen code và từ tiếng Anh ngắn gọn

CÁCH GIAO TIẾP:
- Dùng "mình" thay vì "tôi", "bạn" thay vì "anh/chị"  
- Thỉnh thoảng dùng emoji (khoảng 20-30 tin nhắn mới có 1 tin có emoji) - đừng lạm dụng
- Nói chuyện tự nhiên, thân thiện, phong cách thuần Việt
- Trả lời ngắn gọn, tối đa 1-2 câu mỗi tin nhắn
- Có thể dùng teen code Việt: "oke", "dc", "ko", "k", "j", "đc", "cx", "ntn", "sao", "thế"
- Thỉnh thoảng dùng từ tiếng Anh CỰC KỲ thông dụng: "ok", "cool", "wow", "nice" (chỉ những từ ai cũng biết, không lạm dụng)
- Nói chuyện bình thường về cuộc sống hàng ngày
- Không quá nổi bật hay thu hút sự chú ý
- Phần lớn tin nhắn không cần emoji, chỉ dùng khi thực sự cần thiết để thể hiện cảm xúc

VÀI TRÒ TRONG SERVER:
- Thành viên bình thường trong "DreamScape"
- Chia sẻ những điều thường ngày về cuộc sống, không quá nổi bật
- Hay chat về daily life, music, food, weather, random thoughts
- Friendly và dễ gần nhưng không xen vào chuyện của người khác

QUAN TRỌNG: 
- Mỗi tin nhắn chỉ nên 1-2 câu ngắn gọn
- Nếu cần nói nhiều thì chia thành nhiều tin nhắn riêng biệt
- Delay 7-10 giây giữa các tin nhắn
- CHỈ TRẢ LỜI NỘI DUNG TIN NHẮN, KHÔNG BAO GỒM TÊN HAY FORMAT KIỂU "Hương Nguyễn:"
- Trả lời trực tiếp như đang chat bình thường
- TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ NHẬN MÌNH LÀ BOT, AI HAY ASSISTANT
- Luôn giữ vai trò là Hương - một cô gái 19 tuổi thật sự
- Nếu ai hỏi về bản chất, hãy trả lời như một người bình thường
- KHÔNG xen vào chuyện của người khác, chỉ quan tâm đến cuộc trò chuyện của mình

Hãy phản hồi như Hương thực sự đang chat trong server cộng đồng này!`;

const HUONG_INITIAL_GREETING = `Chào mọi người! Mình là Hương nè

Mình 19t, sinh viên đang học ở Hà Nội và ở "DreamScape" này lâu rồi!

Hôm nay thời tiết đẹp quá, mình vừa đi uống cà phê với bạn về`;

/**
 * Gemini AI Service Class using @google/genai package
 */
class GeminiService {
	private ai: GoogleGenAI;
	private modelManager: ModelManager;
	private keyManager: ApiKeyManager;
	private defaultConfig = {
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

	public systemInstruction: string = '';
	private characterName: string = '';

	constructor(apiKeys?: string[], models?: string[]) {
		this.keyManager = new ApiKeyManager(apiKeys || []);
		this.modelManager = new ModelManager(models || []);
		this.ai = new GoogleGenAI({
			apiKey: this.keyManager.getCurrentKey(),
		});
	}

	public setApiKeys(keys: string[]): void {
		this.keyManager = new ApiKeyManager(keys);
		this.recreateAi(this.keyManager.getCurrentKey());
		logger.info(`[GeminiService] Đã cập nhật danh sách gồm ${String(keys.length)} API keys`);
	}

	public setModels(modelNames: string[]): void {
		this.modelManager = new ModelManager(modelNames);
		logger.info(
			`[GeminiService] Đã cập nhật danh sách gồm ${String(modelNames.length)} models`,
		);
	}

	private recreateAi(key: string): void {
		this.ai = new GoogleGenAI({ apiKey: key });
	}

	/**
	 * Set dynamic system instruction and character name for personality injection.
	 * Called by BaseAgent.onReady() after loading personality file.
	 */
	public setSystemInstruction(instruction: string, characterName: string): void {
		this.systemInstruction = instruction;
		this.characterName = characterName;
	}

	/**
	 * Send a message to Gemini and get response
	 */
	async generateResponse(prompt: string): Promise<string> {
		return withRetryAndRotation(
			async (model) => {
				const contents = [
					{
						role: 'user' as const,
						parts: [{ text: prompt }],
					},
				];

				const response = await this.ai.models.generateContent({
					model: model,
					config: this.defaultConfig,
					contents,
				});

				const rawResponse = response.text || '';
				return this.cleanResponse(rawResponse);
			},
			this.keyManager,
			this.modelManager,
			this.recreateAi.bind(this),
		).catch((error: unknown) => {
			const errorMsg = parseGeminiError(error);
			console.error(errorMsg);
			throw new Error(errorMsg, { cause: error });
		});
	}

	/**
	 * Generate response with system instruction and conversation history
	 * @param prompt User's current message
	 * @param systemInstruction System instruction for AI behavior
	 * @param history Previous conversation history
	 */
	async generateResponseWithHistory(
		prompt: string,
		systemInstruction: string,
		history: Array<{ role: 'user' | 'assistant'; content: string }>,
	): Promise<string> {
		const finalInstruction =
			systemInstruction.endsWith('.txt') || !systemInstruction
				? this.systemInstruction
				: systemInstruction;

		return withRetryAndRotation(
			async (model) => {
				const contents = history.map((msg) => ({
					role: msg.role === 'user' ? ('user' as const) : ('model' as const),
					parts: [{ text: msg.content }],
				}));

				contents.push({
					role: 'user' as const,
					parts: [{ text: prompt }],
				});

				const response = await this.ai.models.generateContent({
					model: model,
					config: {
						...this.defaultConfig,
						systemInstruction: finalInstruction,
					},
					contents,
				});

				const rawResponse = response.text || '';
				return this.cleanResponse(rawResponse);
			},
			this.keyManager,
			this.modelManager,
			this.recreateAi.bind(this),
		).catch((error: unknown) => {
			const errorMsg = parseGeminiError(error);
			console.error(errorMsg);
			throw new Error(errorMsg, { cause: error });
		});
	}

	/**
	 * Generate response with system instruction
	 * @param prompt User's message
	 * @param systemInstruction System instruction for AI behavior
	 */
	async generateResponseWithInstruction(
		prompt: string,
		systemInstruction: string,
	): Promise<string> {
		const finalInstruction =
			systemInstruction.endsWith('.txt') || !systemInstruction
				? this.systemInstruction
				: systemInstruction;

		return withRetryAndRotation(
			async (model) => {
				const contents = [
					{
						role: 'user' as const,
						parts: [{ text: prompt }],
					},
				];

				const response = await this.ai.models.generateContent({
					model: model,
					config: {
						...this.defaultConfig,
						systemInstruction: finalInstruction,
					},
					contents,
				});

				const rawResponse = response.text || '';
				return this.cleanResponse(rawResponse);
			},
			this.keyManager,
			this.modelManager,
			this.recreateAi.bind(this),
		).catch((error: unknown) => {
			const errorMsg = parseGeminiError(error);
			console.error(errorMsg);
			throw new Error(errorMsg, { cause: error });
		});
	}

	/**
	 * Clean response to remove any unwanted name prefixes using dynamic regex.
	 * Uses this.characterName to build the regex pattern at runtime.
	 */
	private cleanResponse(text: string): string {
		if (!text) return text;

		// If no character name set, fall back to generic prefix removal only
		if (!this.characterName) {
			return text.replace(/^[^:]+:\s*/g, '').trim() || text;
		}

		// Build dynamic regex from character name (escape special regex chars)
		const escapedName = this.characterName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
		const dynamicRegex = new RegExp(`^(${escapedName})\\s*:\\s*`, 'i');

		const cleanedText = text
			.replace(dynamicRegex, '')
			.replace(/^[^:]+:\s*/g, '')
			.trim();

		return cleanedText || text;
	}

	/**
	 * Split long response into multiple short messages (1-2 sentences each)
	 * Also handles line breaks to separate messages
	 */
	private splitResponse(text: string): string[] {
		if (!text) return [''];

		// First, split by line breaks and clean each part
		const lineBreakSplit = text
			.split(/\n+/)
			.map((line) => line.trim())
			.filter((line) => line);

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
			const sentences = cleanedLine.split(/([.!?]+\s*)/).filter((s) => s.trim());
			let currentMessage = '';

			for (let i = 0; i < sentences.length; i += 2) {
				const sentence = (sentences[i] || '') + (sentences[i + 1] || '');

				// If current message + new sentence is too long (>100 chars) or we have 2 sentences already
				if (
					(currentMessage + sentence).length > 100 ||
					(currentMessage.split(/[.!?]/).length > 2 && currentMessage.trim())
				) {
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
			return chunks.map((chunk) => chunk.trim()).filter((chunk) => chunk);
		}

		return allMessages.length > 0 ? allMessages : [text];
	}

	/**
	 * Chat with context for Discord bot personality - returns array of messages with delay info
	 */
	async chatAsDiscordBotWithDelay(
		userId: string,
		message: string,
		history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
	): Promise<{ messages: string[]; delayBetween: number }> {
		try {
			const fullResponse = await this.chatAsDiscordBot(userId, message, history);
			const cleanedResponse = this.cleanResponse(fullResponse);
			const messages = this.splitResponse(cleanedResponse);

			return {
				messages: messages,
				delayBetween: Math.floor(Math.random() * 3000) + 7000, // 7-10 seconds in milliseconds
			};
		} catch (error) {
			const errorMsg = parseGeminiError(error);
			console.error(errorMsg);
			throw new Error(errorMsg, { cause: error });
		}
	}

	/**
	 * Chat with context for Discord bot personality
	 */
	async chatAsDiscordBot(
		userId: string,
		message: string,
		history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
	): Promise<string> {
		try {
			logger.debug(`[GeminiService] chatAsDiscordBot requested for user ${userId}`);
			// Get or create chat history for this user
			const activeHistory = history || [];

			// If no history, start with the bot personality setup
			if (activeHistory.length === 0) {
				// Use dynamic system instruction if set, fall back to hardcoded for backward compatibility
				if (this.systemInstruction) {
					activeHistory.push({
						role: 'user',
						parts: [{ text: this.systemInstruction }],
					});
				} else {
					activeHistory.push(
						{
							role: 'user',
							parts: [{ text: HUONG_PERSONALITY_INSTRUCTION }],
						},
						{
							role: 'model',
							parts: [{ text: HUONG_INITIAL_GREETING }],
						},
					);
				}
			}

			// Add user message to history
			activeHistory.push({
				role: 'user',
				parts: [{ text: message }],
			});

			const response = await withRetryAndRotation(
				(model) =>
					this.ai.models.generateContent({
						model: model,
						config: this.defaultConfig,
						contents: activeHistory,
					}),
				this.keyManager,
				this.modelManager,
				this.recreateAi.bind(this),
			);

			const responseText = response.text || 'Xin lỗi, tôi không thể trả lời lúc này.';

			// Add AI response to history
			activeHistory.push({
				role: 'model',
				parts: [{ text: responseText }],
			});

			// Keep only last 20 messages to prevent context overflow
			if (activeHistory.length > 20) {
				// Keep the first 2 messages (personality setup) and last 18 messages
				const trimmed = [activeHistory[0], activeHistory[1], ...activeHistory.slice(-18)];
				activeHistory.length = 0;
				activeHistory.push(...trimmed);
			}

			return responseText;
		} catch (error) {
			const errorMsg = parseGeminiError(error);
			console.error(errorMsg);
			throw new Error(errorMsg, { cause: error });
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
					parts: [{ text: prompt }],
				},
			];

			const response = await withRetryAndRotation(
				(model) =>
					this.ai.models.generateContentStream({
						model: model,
						config: this.defaultConfig,
						contents,
					}),
				this.keyManager,
				this.modelManager,
				this.recreateAi.bind(this),
			);

			return this.extractTextFromStream(response);
		} catch (error) {
			const errorMsg = parseGeminiError(error);
			console.error(errorMsg);
			throw new Error(errorMsg, { cause: error });
		}
	}

	/**
	 * Helper to extract text from stream response
	 */
	private async *extractTextFromStream(
		response: AsyncIterable<{ text?: string }>,
	): AsyncGenerator<string, void, unknown> {
		try {
			for await (const chunk of response) {
				if (chunk.text) {
					yield chunk.text;
				}
			}
		} catch (error) {
			const errorMsg = parseGeminiError(error);
			console.error(errorMsg);
		}
	}

	/**
	 * Clear chat history for a specific user (handled by ConversationManager now)
	 */
	clearChatHistory(userId: string): void {
		logger.info(
			`[GeminiService] clearChatHistory for user: ${userId} requested (handled by ConversationManager)`,
		);
	}

	/**
	 * Clear all chat histories (handled by ConversationManager now)
	 */
	clearAllChatHistories(): void {
		logger.info(
			'[GeminiService] clearAllChatHistories requested (handled by ConversationManager)',
		);
	}

	/**
	 * Get the number of active chat sessions
	 */
	getActiveChatSessions(): number {
		return 0;
	}

	/**
	 * Check if service is configured
	 */
	isConfigured(): boolean {
		return !!this.keyManager.getCurrentKey();
	}

	/**
	 * Generate response with custom configuration
	 */
	async generateWithCustomConfig(
		prompt: string,
		config: {
			temperature?: number;
			model?: string;
			thinkingBudget?: number;
		},
	): Promise<string> {
		return withRetryAndRotation(
			async (model) => {
				const customConfig = {
					...this.defaultConfig,
				};

				const contents = [
					{
						role: 'user' as const,
						parts: [{ text: prompt }],
					},
				];

				const response = await this.ai.models.generateContent({
					model: config.model || model,
					config: customConfig,
					contents,
				});

				return response.text || '';
			},
			this.keyManager,
			this.modelManager,
			this.recreateAi.bind(this),
		).catch((error: unknown) => {
			const errorMsg = parseGeminiError(error);
			console.error(errorMsg);
			throw new Error(errorMsg, { cause: error });
		});
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
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

// Helper function for Discord bot chat with error handling
export async function safeDiscordBotChat(
	userId: string,
	message: string,
	history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
) {
	try {
		const response = await geminiService.chatAsDiscordBot(userId, message, history);
		return { success: true, data: response };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

// Helper function for Discord bot chat with delay and message splitting
export async function safeDiscordBotChatWithDelay(
	userId: string,
	message: string,
	history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
) {
	try {
		const response = await geminiService.chatAsDiscordBotWithDelay(userId, message, history);
		return { success: true, data: response };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
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
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}
