import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { notifyUser } from '../utils/notifications.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get communication logs for enquiry
router.get('/enquiry/:enquiryId', authenticate, async (req, res, next) => {
  try {
    const logs = await prisma.communicationLog.findMany({
      where: { enquiryId: req.params.enquiryId },
      include: {
        logger: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true
          }
        }
      },
      orderBy: { communicationDate: 'desc' }
    });

    res.json({
      success: true,
      data: logs || [],
      message: logs.length === 0 ? 'No communication logs found for this enquiry' : undefined
    });
  } catch (error) {
    next(error);
  }
});

// Create communication log
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      enquiryId,
      communicationType,
      subject,
      message,
      communicationDate,
      clientResponse
    } = req.body;

    if (!enquiryId || !communicationType || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Enquiry ID, communication type, subject, and message are required'
      });
    }

    const log = await prisma.communicationLog.create({
      data: {
        enquiryId,
        loggedBy: req.user.id,
        communicationType,
        subject,
        message,
        communicationDate: communicationDate ? new Date(communicationDate) : new Date(),
        clientResponse
      },
      include: {
        logger: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true
          }
        },
        enquiry: {
          select: {
            id: true,
            enquiryNum: true,
            client: {
              select: {
                id: true,
                clientName: true
              }
            }
          }
        }
      }
    });

    // Emit notification
    const io = req.app.get('io');
    if (io) {
      const notification = {
        type: 'communication_logged',
        title: 'Communication Logged',
        message: `New ${communicationType} logged for enquiry ${log.enquiry.enquiryNum}`,
        enquiryId: log.enquiryId,
        enquiryNum: log.enquiry.enquiryNum,
        loggedBy: req.user.name,
        timestamp: new Date().toISOString()
      };
      io.emitToEnquiry(enquiryId, 'communication_logged', {
        log,
        loggedBy: req.user
      });
    }

    res.status(201).json({
      success: true,
      message: 'Communication log created successfully',
      data: log
    });
  } catch (error) {
    next(error);
  }
});

// Update communication log
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { subject, message, clientResponse } = req.body;

    const log = await prisma.communicationLog.update({
      where: { id: req.params.id },
      data: {
        ...(subject && { subject }),
        ...(message && { message }),
        ...(clientResponse !== undefined && { clientResponse })
      },
      include: {
        logger: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Communication log updated successfully',
      data: log
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Communication log not found'
      });
    }
    next(error);
  }
});

// Delete communication log
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.communicationLog.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Communication log deleted successfully'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Communication log not found'
      });
    }
    next(error);
  }
});

export default router;
