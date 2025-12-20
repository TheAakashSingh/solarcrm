import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { notifyUser, createProductionCompletedNotification } from '../utils/notifications.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get production workflow for enquiry
router.get('/enquiry/:enquiryId', authenticate, async (req, res, next) => {
  try {
    const workflow = await prisma.productionWorkflow.findUnique({
      where: { enquiryId: req.params.enquiryId },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true
          }
        },
        tasks: {
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
          },
          orderBy: { createdAt: 'asc' }
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
      data: workflow || null,
      message: workflow ? undefined : 'No production workflow found for this enquiry'
    });
  } catch (error) {
    next(error);
  }
});

// Assign to production
router.post('/assign', authenticate, async (req, res, next) => {
  try {
    const { enquiryId, productionLeadId } = req.body;

    if (!enquiryId || !productionLeadId) {
      return res.status(400).json({
        success: false,
        message: 'Enquiry ID and production lead ID are required'
      });
    }

    // Update enquiry status
    const enquiry = await prisma.enquiry.update({
      where: { id: enquiryId },
      data: {
        status: 'ReadyForProduction',
        currentAssignedPerson: productionLeadId,
        workAssignedDate: new Date()
      },
      include: {
        client: true
      }
    });

    // Create production workflow
    const workflow = await prisma.productionWorkflow.upsert({
      where: { enquiryId },
      update: {
        productionLead: productionLeadId,
        status: 'not_started'
      },
      create: {
        enquiryId,
        productionLead: productionLeadId,
        status: 'not_started'
      },
      include: {
        lead: {
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
        status: 'ReadyForProduction',
        assignedPerson: productionLeadId,
        note: `Assigned to production by ${req.user.name}`
      }
    });

    // Emit notification
    const io = req.app.get('io');
    if (io) {
      const lead = await prisma.user.findUnique({
        where: { id: productionLeadId },
        select: { id: true, name: true }
      });

      if (lead) {
        const notification = {
          type: 'production_assigned',
          title: 'Production Assignment',
          message: `You have been assigned as production lead for enquiry ${enquiry.enquiryNum}`,
          enquiryId: enquiry.id,
          enquiryNum: enquiry.enquiryNum,
          assignedBy: req.user.name,
          timestamp: new Date().toISOString()
        };
        notifyUser(io, productionLeadId, notification);
      }
    }

    res.json({
      success: true,
      message: 'Assigned to production successfully',
      data: { enquiry, workflow }
    });
  } catch (error) {
    next(error);
  }
});

// Start production workflow
router.post('/:id/start', authenticate, async (req, res, next) => {
  try {
    const workflow = await prisma.productionWorkflow.update({
      where: { id: req.params.id },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
        currentStep: 'cutting'
      },
      include: {
        lead: true,
        tasks: true,
        enquiry: true
      }
    });

    // Update enquiry status
    await prisma.enquiry.update({
      where: { id: workflow.enquiryId },
      data: {
        status: 'InProduction'
      }
    });

    res.json({
      success: true,
      message: 'Production workflow started',
      data: workflow
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Production workflow not found'
      });
    }
    next(error);
  }
});

// Create production task
router.post('/:id/tasks', authenticate, async (req, res, next) => {
  try {
    const { step, assignedTo, notes } = req.body;

    if (!step || !assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Step and assigned to are required'
      });
    }

    const task = await prisma.productionTask.create({
      data: {
        workflowId: req.params.id,
        enquiryId: req.body.enquiryId,
        step,
        assignedTo,
        notes: notes || '',
        status: 'pending'
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

    res.status(201).json({
      success: true,
      message: 'Production task created',
      data: task
    });
  } catch (error) {
    next(error);
  }
});

// Update production task
router.patch('/tasks/:id', authenticate, async (req, res, next) => {
  try {
    const { status, notes, startedAt, completedAt } = req.body;

    const task = await prisma.productionTask.update({
      where: { id: req.params.id },
      data: {
        ...(status && { 
          status,
          ...(status === 'in_progress' && !startedAt && { startedAt: new Date() }),
          ...(status === 'completed' && !completedAt && { completedAt: new Date() })
        }),
        ...(notes !== undefined && { notes }),
        ...(startedAt && { startedAt: new Date(startedAt) }),
        ...(completedAt && { completedAt: new Date(completedAt) })
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
        workflow: {
          include: {
            enquiry: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    next(error);
  }
});

// Complete production workflow
router.post('/:id/complete', authenticate, async (req, res, next) => {
  try {
    const workflow = await prisma.productionWorkflow.update({
      where: { id: req.params.id },
      data: {
        status: 'completed',
        completedAt: new Date()
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true
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

    // Update enquiry status
    const enquiry = await prisma.enquiry.update({
      where: { id: workflow.enquiryId },
      data: {
        status: 'ReadyForDispatch',
        currentAssignedPerson: workflow.enquiry.enquiryBy,
        workAssignedDate: new Date()
      }
    });

    // Create status history
    await prisma.enquiryStatusHistory.create({
      data: {
        enquiryId: workflow.enquiryId,
        status: 'ReadyForDispatch',
        assignedPerson: workflow.enquiry.enquiryBy,
        note: 'Production completed, returned to salesperson for dispatch'
      }
    });

    // Emit notification
    const io = req.app.get('io');
    if (io) {
      const notification = createProductionCompletedNotification(
        enquiry,
        workflow.lead
      );
      notifyUser(io, workflow.enquiry.enquiryBy, notification);
    }

    res.json({
      success: true,
      message: 'Production workflow completed',
      data: { workflow, enquiry }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Production workflow not found'
      });
    }
    next(error);
  }
});

// Update production workflow notes
router.put('/:id/notes', authenticate, async (req, res, next) => {
  try {
    const { notes } = req.body;

    const workflow = await prisma.productionWorkflow.update({
      where: { id: req.params.id },
      data: {
        notes: notes || ''
      },
      include: {
        lead: {
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

    res.json({
      success: true,
      message: 'Production notes updated successfully',
      data: workflow
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Production workflow not found'
      });
    }
    next(error);
  }
});

export default router;
