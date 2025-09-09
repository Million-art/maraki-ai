import { BroadcastRepository } from '../repository/broadcast.repository.js';
import { bot } from '../adapters/telegram.adapter.js';
import { logger } from '../utils/logger.js';
export class BroadcastService {
    static BATCH_SIZE = 25;
    static BATCH_DELAY = 1100;
    /**
     * Send broadcast message to all users
     */
    static async sendBroadcastToAll(message) {
        const telegramIds = await BroadcastRepository.getAllUserTelegramIds();
        return this.sendBroadcastToUsers(telegramIds, message);
    }
    /**
     * Send broadcast message to specific users
     */
    static async sendBroadcastToUsers(telegramIds, message) {
        const totalUsers = telegramIds.length;
        logger.info(`Starting broadcast to ${totalUsers} users`);
        if (totalUsers === 0) {
            return {
                totalUsers: 0,
                successful: 0,
                failed: 0,
                errors: ['No users found for broadcast']
            };
        }
        let successful = 0;
        let failed = 0;
        const errors = [];
        // Process users in batches to respect rate limits
        for (let i = 0; i < telegramIds.length; i += this.BATCH_SIZE) {
            const batch = telegramIds.slice(i, i + this.BATCH_SIZE);
            // Send messages in parallel for this batch
            const batchPromises = batch.map(async (telegramId) => {
                try {
                    await bot.api.sendMessage(telegramId, message.text, {
                        parse_mode: message.parseMode,
                        disable_notification: message.disableNotification
                    });
                    successful++;
                    logger.debug(`Broadcast sent to user ${telegramId}`);
                }
                catch (error) {
                    failed++;
                    const errorMsg = `Failed to send to ${telegramId}: ${error.message}`;
                    errors.push(errorMsg);
                    logger.error(errorMsg);
                }
            });
            // Wait for all messages in this batch to complete
            await Promise.allSettled(batchPromises);
            // Wait before next batch (except for the last batch)
            if (i + this.BATCH_SIZE < telegramIds.length) {
                logger.debug(`Waiting ${this.BATCH_DELAY}ms before next batch`);
                await this.delay(this.BATCH_DELAY);
            }
        }
        const result = {
            totalUsers,
            successful,
            failed,
            errors
        };
        logger.info(`Broadcast completed: ${successful}/${totalUsers} successful, ${failed} failed`);
        return result;
    }
    /**
     * Get broadcast statistics
     */
    static async getBroadcastStats() {
        const totalUsers = await BroadcastRepository.getUserCount();
        return {
            totalUsers
        };
    }
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
