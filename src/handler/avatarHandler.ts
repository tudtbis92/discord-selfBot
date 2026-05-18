import { BaseAgent } from '../structures/BaseAgent.js';
import { logger } from '../utils/logger.js';

// Rate limiting để tránh spam và trigger captcha
let lastAvatarUpdate = 0;
const AVATAR_UPDATE_COOLDOWN = 60000; // 60 giây

export const avatarHandler = async (agent: BaseAgent) => {
	agent.on('messageCreate', async (message) => {
		// Kiểm tra nếu không có config avatarUpdateChannelID
		if (!agent.config.avatarUpdateChannelID) return;

		// Kiểm tra nếu message không phải từ channel chỉ định
		if (message.channelId !== agent.config.avatarUpdateChannelID) return;

		// Kiểm tra nếu người gửi không phải là admin
		if (!agent.config.adminID || message.author.id !== agent.config.adminID) return;

		// Kiểm tra nếu message có attachment (image)
		if (message.attachments.size === 0) return;

		const attachment = message.attachments.first();
		if (!attachment) return;

		// Kiểm tra nếu attachment là image
		const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
		const isImage = imageExtensions.some(
			(ext) =>
				attachment.url.toLowerCase().includes(ext) ||
				attachment.contentType?.startsWith('image/'),
		);

		if (!isImage) {
			logger.warn(`Attachment is not an image: ${attachment.url}`);
			return;
		}

		// Kiểm tra cooldown
		const now = Date.now();
		if (now - lastAvatarUpdate < AVATAR_UPDATE_COOLDOWN) {
			const remainingTime = Math.ceil(
				(AVATAR_UPDATE_COOLDOWN - (now - lastAvatarUpdate)) / 1000,
			);
			try {
				await message.reply(
					`⏱️ Vui lòng đợi ${remainingTime} giây trước khi cập nhật avatar tiếp.`,
				);
			} catch (e) {
				logger.warn(`Cooldown active: ${remainingTime}s remaining`);
			}
			return;
		}

		try {
			logger.info(`Updating bot avatar from: ${attachment.url}`);

			// Download image trước để kiểm tra
			const response = await fetch(attachment.url);
			if (!response.ok) {
				throw new Error(`Failed to download image: ${response.statusText}`);
			}

			const buffer = Buffer.from(await response.arrayBuffer());

			// Kiểm tra kích thước (Discord giới hạn 10MB cho avatar)
			if (buffer.length > 10 * 1024 * 1024) {
				await message.reply('❌ Ảnh quá lớn! Kích thước tối đa là 10MB.');
				return;
			}

			await agent.user?.setAvatar(buffer);
			lastAvatarUpdate = Date.now();
			logger.sent('Bot avatar updated successfully!');

			// Gửi message xác nhận
			await message.reply('✅ Avatar đã được cập nhật thành công!');
		} catch (error: any) {
			logger.error('Failed to update bot avatar:');
			logger.error(error as Error);

			let errorMessage = '❌ Không thể cập nhật avatar.';

			// Xử lý các loại lỗi cụ thể
			if (error.message?.includes('CAPTCHA_SOLVER_NOT_IMPLEMENTED')) {
				errorMessage =
					'❌ Discord yêu cầu xác minh captcha. Vui lòng:\n' +
					'1. Thử lại sau vài phút\n' +
					'2. Hoặc đổi avatar thủ công qua Discord app\n' +
					'3. Đảm bảo không đổi avatar quá thường xuyên';
				logger.warn(
					'Discord requires captcha verification for avatar change. This is a security measure.',
				);
			} else if (error.message?.includes('rate limit')) {
				errorMessage = '❌ Đã bị rate limit. Vui lòng thử lại sau 10-15 phút.';
			}

			try {
				await message.reply(errorMessage);
			} catch (replyError) {
				logger.error('Failed to send error reply:');
				logger.error(replyError as Error);
			}
		}
	});
};
