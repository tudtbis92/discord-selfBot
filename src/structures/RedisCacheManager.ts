import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';

export class RedisCacheManager {
	private redis: Redis | null = null;
	private isConnected = false;

	constructor(redisUri?: string) {
		if (!redisUri) {
			logger.info(
				'[RedisCacheManager] No redisUri configured — running in RAM fallback mode.',
			);
			return;
		}

		try {
			// Initialize Redis with maxRetriesPerRequest = 1 and enableOfflineQueue = false to avoid blocking the event loop on failure
			this.redis = new Redis(redisUri, {
				maxRetriesPerRequest: 1,
				enableOfflineQueue: false,
			});

			this.redis.on('connect', () => {
				this.isConnected = true;
				logger.info('[RedisCacheManager] Connected to Redis server.');
			});

			this.redis.on('ready', () => {
				this.isConnected = true;
				logger.info('[RedisCacheManager] Redis server is ready to accept commands.');
			});

			this.redis.on('error', (err: Error) => {
				this.isConnected = false;
				logger.error('[RedisCacheManager] Redis connection error:');
				logger.error(err);
			});

			this.redis.on('close', () => {
				this.isConnected = false;
				logger.warn('[RedisCacheManager] Redis connection closed.');
			});
		} catch (error) {
			this.redis = null;
			this.isConnected = false;
			logger.error('[RedisCacheManager] Failed to initialize Redis client:');
			logger.error(error as Error);
		}
	}

	public get connected(): boolean {
		return this.isConnected && this.redis !== null;
	}

	public async get<T>(key: string): Promise<T | null> {
		if (!this.connected || !this.redis) {
			return null;
		}

		try {
			const data = await this.redis.get(key);
			if (!data) return null;
			return JSON.parse(data) as T;
		} catch (error) {
			logger.error(`[RedisCacheManager] Error getting key "${key}":`);
			logger.error(error as Error);
			return null;
		}
	}

	public async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
		if (!this.connected || !this.redis) {
			return;
		}

		try {
			const serialized = JSON.stringify(value);
			if (ttlSeconds) {
				await this.redis.set(key, serialized, 'EX', ttlSeconds);
			} else {
				await this.redis.set(key, serialized);
			}
		} catch (error) {
			logger.error(`[RedisCacheManager] Error setting key "${key}":`);
			logger.error(error as Error);
		}
	}

	public async delete(key: string): Promise<void> {
		if (!this.connected || !this.redis) {
			return;
		}

		try {
			await this.redis.del(key);
		} catch (error) {
			logger.error(`[RedisCacheManager] Error deleting key "${key}":`);
			logger.error(error as Error);
		}
	}

	public async disconnect(): Promise<void> {
		if (this.redis) {
			try {
				await this.redis.quit();
			} catch {
				try {
					this.redis.disconnect();
				} catch (err) {
					logger.debug(
						`[RedisCacheManager] Disconnect error ignored: ${err instanceof Error ? err.message : String(err)}`,
					);
				}
			}
			this.redis = null;
			this.isConnected = false;
		}
	}
}
