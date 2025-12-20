import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// In-memory notification store (in production, use Redis or database)
// For now, we'll use a simple array. In production, you should use a database table.
export const notificationStore = new Map();

// Get all notifications for current user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get notifications from store (in production, query database)
    const userNotifications = notificationStore.get(userId) || [];
    
    // Sort by timestamp (newest first)
    const sortedNotifications = userNotifications
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50); // Limit to 50 most recent

    res.json({
      success: true,
      data: sortedNotifications
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    
    const userNotifications = notificationStore.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    
    if (notification) {
      notification.read = true;
      notificationStore.set(userId, userNotifications);
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const userNotifications = notificationStore.get(userId) || [];
    userNotifications.forEach(n => n.read = true);
    notificationStore.set(userId, userNotifications);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
