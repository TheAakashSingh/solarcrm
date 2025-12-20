import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get user's tasks grouped by status
router.get('/my-tasks', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        workflowStatus: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get workflow statuses (handle both array and JSON)
    const workflowStatuses = Array.isArray(user.workflowStatus)
      ? user.workflowStatus
      : user.workflowStatus
      ? (typeof user.workflowStatus === 'string' ? JSON.parse(user.workflowStatus) : user.workflowStatus)
      : [];

    // Get enquiries assigned to user with matching workflow status
    const tasks = await prisma.enquiry.findMany({
      where: {
        currentAssignedPerson: req.user.id,
        status: {
          in: workflowStatuses
        }
      },
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
            email: true,
            contactNo: true
          }
        },
        enquiryByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true
          }
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true
          }
        }
      },
      orderBy: { workAssignedDate: 'asc' }
    });

    // Group by status
    const tasksByStatus = tasks.reduce((acc, task) => {
      if (!acc[task.status]) {
        acc[task.status] = [];
      }
      acc[task.status].push(task);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        tasks,
        tasksByStatus,
        totalTasks: tasks.length,
        user: {
          id: user.id,
          workflowStatus: workflowStatuses
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
