import express from 'express';
import { BroadcastService } from '../services/broadcast.service.js';
import { BroadcastMessage } from '../types/Broadcast.js';

const router = express.Router();

/**
 * POST /api/broadcast/send
 * Send broadcast message to all users
 */
router.post('/send', async (req, res) => {
  try {
    const { message, parseMode, disableNotification } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const broadcastMessage: BroadcastMessage = {
      text: message,
      parseMode,
      disableNotification
    };

    const result = await BroadcastService.sendBroadcastToAll(broadcastMessage);

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Broadcast API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/broadcast/stats
 * Get broadcast statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await BroadcastService.getBroadcastStats();

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers.totalUsers
      }
    });

  } catch (error: any) {
    console.error('Broadcast stats API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
