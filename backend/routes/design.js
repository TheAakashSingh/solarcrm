import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { notifyUser, createDesignCompletedNotification } from '../utils/notifications.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get design work for enquiry
router.get('/enquiry/:enquiryId', authenticate, async (req, res, next) => {
  try {
    const designWork = await prisma.designWork.findUnique({
      where: { enquiryId: req.params.enquiryId },
      include: {
        designer: {
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
      data: designWork || null,
      message: designWork ? undefined : 'No design work found for this enquiry'
    });
  } catch (error) {
    next(error);
  }
});

// Get designer's completed work history
router.get('/my-completed', authenticate, async (req, res, next) => {
  try {
    // Only designers can access this
    if (req.user.role !== 'designer') {
      return res.status(403).json({
        success: false,
        message: 'Only designers can access completed work history'
      });
    }

    const completedWork = await prisma.designWork.findMany({
      where: {
        designerId: req.user.id,
        designStatus: 'completed'
      },
      include: {
        enquiry: {
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
                email: true
              }
            }
          }
        }
      },
      orderBy: { completedAt: 'desc' }
    });

    res.json({
      success: true,
      data: completedWork,
      count: completedWork.length
    });
  } catch (error) {
    next(error);
  }
});

// Get design attachments
router.get('/enquiry/:enquiryId/attachments', authenticate, async (req, res, next) => {
  try {
    const attachments = await prisma.designAttachment.findMany({
      where: { enquiryId: req.params.enquiryId },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    res.json({
      success: true,
      data: attachments || [],
      message: attachments.length === 0 ? 'No design attachments found for this enquiry' : undefined
    });
  } catch (error) {
    next(error);
  }
});

// Assign to designer
router.post('/assign', authenticate, async (req, res, next) => {
  try {
    const { enquiryId, designerId, clientRequirements } = req.body;

    if (!enquiryId || !designerId) {
      return res.status(400).json({
        success: false,
        message: 'Enquiry ID and designer ID are required'
      });
    }

    // Update enquiry status
    const enquiry = await prisma.enquiry.update({
      where: { id: enquiryId },
      data: {
        status: 'Design',
        currentAssignedPerson: designerId,
        workAssignedDate: new Date()
      },
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
    });

    // Create or update design work
    const designWork = await prisma.designWork.upsert({
      where: { enquiryId },
      update: {
        designerId,
        clientRequirements: clientRequirements || '',
        designStatus: 'pending'
      },
      create: {
        enquiryId,
        designerId,
        clientRequirements: clientRequirements || '',
        designerNotes: '',
        designStatus: 'pending'
      },
      include: {
        designer: {
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
        status: 'Design',
        assignedPerson: designerId,
        note: `Assigned to designer by ${req.user.name}`
      }
    });

    // Emit notification
    const io = req.app.get('io');
    if (io) {
      const designer = await prisma.user.findUnique({
        where: { id: designerId },
        select: { id: true, name: true }
      });

      if (designer) {
        const notification = {
          type: 'design_assigned',
          title: 'Design Assignment',
          message: `You have been assigned to design enquiry ${enquiry.enquiryNum}`,
          enquiryId: enquiry.id,
          enquiryNum: enquiry.enquiryNum,
          assignedBy: req.user.name,
          timestamp: new Date().toISOString()
        };
        notifyUser(io, designerId, notification);
      }
    }

    res.json({
      success: true,
      message: 'Assigned to designer successfully',
      data: { enquiry, designWork }
    });
  } catch (error) {
    next(error);
  }
});

// Save design work (without completing/returning to sales)
router.post('/:id/save', authenticate, async (req, res, next) => {
  try {
    const { 
      designerNotes, 
      clientRequirements,
      designer_notes, 
      client_requirements
    } = req.body;
    
    const finalDesignerNotes = designerNotes ?? designer_notes;
    const finalClientRequirements = clientRequirements ?? client_requirements;

    const existingDesignWork = await prisma.designWork.findUnique({
      where: { id: req.params.id },
      select: { enquiryId: true, designerId: true }
    });

    if (!existingDesignWork) {
      return res.status(404).json({
        success: false,
        message: 'Design work not found'
      });
    }

    // Only designer can save their own work
    if (existingDesignWork.designerId !== req.user.id && req.user.role !== 'superadmin' && req.user.role !== 'director') {
      return res.status(403).json({
        success: false,
        message: 'You can only save your own design work'
      });
    }

    const designWork = await prisma.designWork.update({
      where: { id: req.params.id },
      data: {
        ...(finalDesignerNotes !== undefined && { designerNotes: finalDesignerNotes }),
        ...(finalClientRequirements !== undefined && { clientRequirements: finalClientRequirements }),
        designStatus: 'in_progress'
      },
      include: {
        designer: {
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
      message: 'Design work saved successfully',
      data: designWork
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Design work not found'
      });
    }
    next(error);
  }
});

// Return design to salesperson (complete and return)
router.post('/:id/return-to-sales', authenticate, async (req, res, next) => {
  try {
    const { note } = req.body;
    
    const existingDesignWork = await prisma.designWork.findUnique({
      where: { id: req.params.id },
      select: { enquiryId: true, designerId: true }
    });

    if (!existingDesignWork) {
      return res.status(404).json({
        success: false,
        message: 'Design work not found'
      });
    }

    // Only designer can return their own work
    if (existingDesignWork.designerId !== req.user.id && req.user.role !== 'superadmin' && req.user.role !== 'director') {
      return res.status(403).json({
        success: false,
        message: 'You can only return your own design work'
      });
    }

    // Get the enquiry to find the salesperson
    const enquiry = await prisma.enquiry.findUnique({
      where: { id: existingDesignWork.enquiryId },
      select: { enquiryBy: true, enquiryNum: true }
    });

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    // Update design work to completed
    const designWork = await prisma.designWork.update({
      where: { id: req.params.id },
      data: {
        designStatus: 'completed',
        completedAt: new Date()
      },
      include: {
        designer: {
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

    // Return enquiry to salesperson
    await prisma.enquiry.update({
      where: { id: existingDesignWork.enquiryId },
      data: {
        status: 'BOQ',
        currentAssignedPerson: enquiry.enquiryBy,
        workAssignedDate: new Date()
      }
    });

    // Create status history with note
    await prisma.enquiryStatusHistory.create({
      data: {
        enquiryId: existingDesignWork.enquiryId,
        status: 'BOQ',
        assignedPerson: enquiry.enquiryBy,
        note: note || 'Design completed, returned to salesperson for BOQ'
      }
    });

    // Create enquiry note if note provided
    if (note && note.trim()) {
      await prisma.enquiryNote.create({
        data: {
          enquiryId: existingDesignWork.enquiryId,
          note: note.trim(),
          createdBy: req.user.id
        }
      });
    }

    // Emit notification
    const io = req.app.get('io');
    if (io) {
      const fullEnquiry = await prisma.enquiry.findUnique({
        where: { id: existingDesignWork.enquiryId },
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
      });
      if (fullEnquiry) {
        const notification = createDesignCompletedNotification(
          fullEnquiry,
          designWork.designer
        );
        notifyUser(io, enquiry.enquiryBy, notification);
      }
    }

    res.json({
      success: true,
      message: 'Design work completed and returned to salesperson',
      data: designWork
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Design work not found'
      });
    }
    next(error);
  }
});

// Update design work
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    // Support both camelCase and snake_case for flexibility
    const { 
      designerNotes, 
      clientRequirements, 
      designStatus,
      designer_notes, 
      client_requirements,
      design_status
    } = req.body;
    
    // Use camelCase values or fall back to snake_case
    const finalDesignerNotes = designerNotes ?? designer_notes;
    const finalClientRequirements = clientRequirements ?? client_requirements;
    const finalDesignStatus = designStatus ?? design_status;

    // Find design work first to get enquiry ID (needed for completion flow)
    const existingDesignWork = await prisma.designWork.findUnique({
      where: { id: req.params.id },
      select: { enquiryId: true, designerId: true }
    });

    if (!existingDesignWork) {
      return res.status(404).json({
        success: false,
        message: 'Design work not found'
      });
    }

    // Update design work
    const designWork = await prisma.designWork.update({
      where: { id: req.params.id },
      data: {
        ...(finalDesignerNotes !== undefined && { designerNotes: finalDesignerNotes }),
        ...(finalClientRequirements !== undefined && { clientRequirements: finalClientRequirements }),
        ...(finalDesignStatus && { 
          designStatus: finalDesignStatus,
          ...(finalDesignStatus === 'completed' && { completedAt: new Date() })
        })
      },
      include: {
        designer: {
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

    // If design is completed, return to salesperson
    if (finalDesignStatus === 'completed') {
      // Get the enquiry to find the salesperson
      const enquiry = await prisma.enquiry.findUnique({
        where: { id: designWork.enquiryId },
        select: { enquiryBy: true }
      });

      if (!enquiry) {
        return res.status(404).json({
          success: false,
          message: 'Enquiry not found'
        });
      }

      await prisma.enquiry.update({
        where: { id: designWork.enquiryId },
        data: {
          status: 'BOQ',
          currentAssignedPerson: enquiry.enquiryBy,
          workAssignedDate: new Date()
        }
      });

      await prisma.enquiryStatusHistory.create({
        data: {
          enquiryId: designWork.enquiryId,
          status: 'BOQ',
          assignedPerson: enquiry.enquiryBy,
          note: 'Design completed, returned to salesperson for BOQ'
        }
      });

      // Emit notification
      const io = req.app.get('io');
      if (io) {
        const fullEnquiry = await prisma.enquiry.findUnique({
          where: { id: designWork.enquiryId },
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
        });
        if (fullEnquiry) {
          const notification = createDesignCompletedNotification(
            fullEnquiry,
            designWork.designer
          );
          notifyUser(io, enquiry.enquiryBy, notification);
        }
      }
    }

    res.json({
      success: true,
      message: 'Design work updated successfully',
      data: designWork
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Design work not found'
      });
    }
    next(error);
  }
});

// Upload design attachment
router.post('/attachments', authenticate, async (req, res, next) => {
  try {
    const { enquiryId, fileName, fileUrl, fileType } = req.body;

    if (!enquiryId || !fileName || !fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Enquiry ID, file name, and file URL are required'
      });
    }

    const attachment = await prisma.designAttachment.create({
      data: {
        enquiryId,
        fileName,
        fileUrl,
        fileType: fileType || 'application/octet-stream',
        uploadedBy: req.user.id
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Attachment uploaded successfully',
      data: attachment
    });
  } catch (error) {
    next(error);
  }
});

// Delete design attachment
router.delete('/attachments/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.designAttachment.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }
    next(error);
  }
});

// Get all design work for designer (my tasks and all tasks)
router.get('/my-tasks', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'designer' && req.user.role !== 'superadmin' && req.user.role !== 'director') {
      return res.status(403).json({
        success: false,
        message: 'Only designers can access this endpoint'
      });
    }

    const { status } = req.query;
    const where = {};
    
    if (req.user.role === 'designer') {
      where.designerId = req.user.id;
    }

    if (status === 'pending' || status === 'in_progress') {
      where.designStatus = status;
    } else if (status === 'completed') {
      where.designStatus = 'completed';
    }

    const designWorks = await prisma.designWork.findMany({
      where,
      include: {
        enquiry: {
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
                email: true
              }
            }
          }
        },
        designer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({
      success: true,
      data: designWorks,
      count: designWorks.length
    });
  } catch (error) {
    next(error);
  }
});

// Download design attachment
router.get('/attachments/:id/download', authenticate, async (req, res, next) => {
  try {
    const attachment = await prisma.designAttachment.findUnique({
      where: { id: req.params.id },
      include: {
        enquiry: {
          select: {
            id: true,
            enquiryNum: true
          }
        }
      }
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Check if user has access (salesperson, production, designer, admin)
    const hasAccess = 
      req.user.role === 'superadmin' ||
      req.user.role === 'director' ||
      req.user.role === 'salesman' ||
      req.user.role === 'production' ||
      req.user.role === 'designer';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to download this file'
      });
    }

    // If fileUrl is base64, decode it
    if (attachment.fileUrl.startsWith('data:')) {
      const base64Data = attachment.fileUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.setHeader('Content-Type', attachment.fileType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
      res.send(buffer);
    } else {
      // If it's a URL, redirect or proxy it
      res.redirect(attachment.fileUrl);
    }
  } catch (error) {
    next(error);
  }
});

export default router;
