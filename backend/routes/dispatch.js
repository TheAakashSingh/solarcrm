import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { notifyUser } from '../utils/notifications.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get dispatch work for enquiry
router.get('/enquiry/:enquiryId', authenticate, async (req, res, next) => {
  try {
    const dispatchWork = await prisma.dispatchWork.findUnique({
      where: { enquiryId: req.params.enquiryId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true
          }
        },
        enquiry: {
          include: {
            client: true
          }
        }
      }
    });

    // Return success with null if not found (optional data)
    res.json({
      success: true,
      data: dispatchWork || null,
      message: dispatchWork ? undefined : 'No dispatch work found for this enquiry'
    });
  } catch (error) {
    next(error);
  }
});

// Assign dispatch
router.post('/assign', authenticate, async (req, res, next) => {
  try {
    const { enquiryId, dispatchAssignedTo } = req.body;

    if (!enquiryId || !dispatchAssignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Enquiry ID and dispatch assigned to are required'
      });
    }

    // Update enquiry status
    const enquiry = await prisma.enquiry.update({
      where: { id: enquiryId },
      data: {
        status: 'ReadyForDispatch',
        currentAssignedPerson: dispatchAssignedTo,
        workAssignedDate: new Date()
      },
      include: {
        client: true
      }
    });

    // Create or update dispatch work
    const dispatchWork = await prisma.dispatchWork.upsert({
      where: { enquiryId },
      update: {
        dispatchAssignedTo,
        status: 'pending'
      },
      create: {
        enquiryId,
        dispatchAssignedTo,
        status: 'pending',
        notes: ''
      },
      include: {
        assignee: {
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

    // Create status history
    await prisma.enquiryStatusHistory.create({
      data: {
        enquiryId,
        status: 'ReadyForDispatch',
        assignedPerson: dispatchAssignedTo,
        note: `Assigned for dispatch by ${req.user.name}`
      }
    });

    // Emit notification
    const io = req.app.get('io');
    if (io) {
      const assignee = await prisma.user.findUnique({
        where: { id: dispatchAssignedTo },
        select: { id: true, name: true }
      });

      if (assignee) {
        const notification = {
          type: 'dispatch_assigned',
          title: 'Dispatch Assignment',
          message: `You have been assigned to dispatch enquiry ${enquiry.enquiryNum}`,
          enquiryId: enquiry.id,
          enquiryNum: enquiry.enquiryNum,
          assignedBy: req.user.name,
          timestamp: new Date().toISOString()
        };
        notifyUser(io, dispatchAssignedTo, notification);
      }
    }

    res.json({
      success: true,
      message: 'Assigned for dispatch successfully',
      data: { enquiry, dispatchWork }
    });
  } catch (error) {
    next(error);
  }
});

// Update dispatch work
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { trackingNumber, dispatchDate, estimatedDeliveryDate, status, notes } = req.body;

    const dispatchWork = await prisma.dispatchWork.update({
      where: { id: req.params.id },
      data: {
        ...(trackingNumber !== undefined && { trackingNumber }),
        ...(dispatchDate && { dispatchDate: new Date(dispatchDate) }),
        ...(estimatedDeliveryDate && { estimatedDeliveryDate: new Date(estimatedDeliveryDate) }),
        ...(status && { status }),
        ...(notes !== undefined && { notes })
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true
          }
        },
        enquiry: {
          include: {
            client: true,
            enquiryByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    // If dispatched, update enquiry status
    if (status === 'dispatched') {
      await prisma.enquiry.update({
        where: { id: dispatchWork.enquiryId },
        data: {
          status: 'Dispatched'
        }
      });

      await prisma.enquiryStatusHistory.create({
        data: {
          enquiryId: dispatchWork.enquiryId,
          status: 'Dispatched',
          assignedPerson: dispatchWork.dispatchAssignedTo,
          note: `Dispatched with tracking number: ${dispatchWork.trackingNumber || 'N/A'}`
        }
      });

      // Emit notification
      const io = req.app.get('io');
      if (io) {
        const notification = {
          type: 'enquiry_dispatched',
          title: 'Enquiry Dispatched',
          message: `Enquiry ${dispatchWork.enquiry.enquiryNum} has been dispatched`,
          enquiryId: dispatchWork.enquiryId,
          enquiryNum: dispatchWork.enquiry.enquiryNum,
          trackingNumber: dispatchWork.trackingNumber,
          timestamp: new Date().toISOString()
        };
        notifyUser(io, dispatchWork.enquiry.enquiryBy, notification);
      }
    }

    res.json({
      success: true,
      message: 'Dispatch work updated successfully',
      data: dispatchWork
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Dispatch work not found'
      });
    }
    next(error);
  }
});

export default router;
