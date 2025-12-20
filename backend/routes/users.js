import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all users
router.get('/', authenticate, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        workflowStatus: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        workflowStatus: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// Get users by role
router.get('/role/:role', authenticate, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: req.params.role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        workflowStatus: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

// Get users by status (users who can handle a specific enquiry status)
router.get('/by-status/:status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.params;
    
    // Get all users and filter by workflow status
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        workflowStatus: true,
        createdAt: true
      }
    });

    // Filter users whose workflowStatus includes the requested status
    const users = allUsers.filter(user => {
      const workflowStatuses = Array.isArray(user.workflowStatus)
        ? user.workflowStatus
        : user.workflowStatus
        ? (typeof user.workflowStatus === 'string' ? JSON.parse(user.workflowStatus) : user.workflowStatus)
        : [];
      return workflowStatuses.includes(status);
    });

    res.json({
      success: true,
      data: users.sort((a, b) => a.name.localeCompare(b.name))
    });
  } catch (error) {
    next(error);
  }
});

// Create user (only admin/director)
router.post('/', authenticate, authorize('superadmin', 'director'), async (req, res, next) => {
  try {
    const { name, email, password, role, workflowStatus } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'salesman',
        workflowStatus: workflowStatus || []
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        workflowStatus: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, avatar, workflowStatus } = req.body;

    // Only admin/director can update other users, or user can update themselves
    if (id !== req.user.id && !['superadmin', 'director'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this user'
      });
    }

    // Only admin/director can change role
    if (role && !['superadmin', 'director'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to change user role'
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role && ['superadmin', 'director'].includes(req.user.role)) updateData.role = role;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (workflowStatus !== undefined) updateData.workflowStatus = workflowStatus;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        workflowStatus: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// Delete user (only admin)
router.delete('/:id', authenticate, authorize('superadmin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
