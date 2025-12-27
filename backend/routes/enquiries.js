import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { notifyUser, notifyRole, createStatusChangeNotification, createAssignmentNotification } from '../utils/notifications.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all enquiries with filters
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { 
      status, 
      clientId, 
      enquiryBy, 
      assignedTo, 
      materialType,
      search,
      page = 1, 
      limit = 50 
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    
    // Role-based filtering (must be done first before other filters)
    const isAdminOrDirector = ['superadmin', 'director'].includes(req.user.role);
    const isSalesperson = req.user.role === 'salesman';
    
    if (!isAdminOrDirector && !isSalesperson) {
      // Other roles (designer, production, purchase) only see assigned to them
      where.currentAssignedPerson = req.user.id;
    } else if (isSalesperson) {
      // Salesperson sees their own enquiries or assigned to them
      where.OR = [
        { enquiryBy: req.user.id },
        { currentAssignedPerson: req.user.id }
      ];
    }
    // For superadmin/director: no role filtering - they see ALL enquiries
    
    // Apply other filters
    if (status && status !== 'all') where.status = status;
    if (clientId) where.clientId = clientId;
    if (enquiryBy) where.enquiryBy = enquiryBy;
    if (assignedTo) where.currentAssignedPerson = assignedTo;
    if (materialType && materialType !== 'all') where.materialType = materialType;
    
    // Add search filter (combine with existing OR if present)
    if (search) {
      const searchConditions = [
        { enquiryNum: { contains: search, mode: 'insensitive' } },
        { enquiryDetail: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { client: { clientName: { contains: search, mode: 'insensitive' } } }
      ];
      
      // If OR already exists (from salesman filter), combine with AND
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions }
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [enquiries, total] = await Promise.all([
      prisma.enquiry.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          client: true,
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
        orderBy: { createdAt: 'desc' }
      }),
      prisma.enquiry.count({ where })
    ]);

    res.json({
      success: true,
      data: enquiries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get all enquiries for current user (created or worked by them - from history table)
// IMPORTANT: This must come before /:id route to avoid route conflicts
router.get('/my-worked-enquiries', authenticate, async (req, res, next) => {
  try {
    const { 
      status, 
      materialType,
      search,
      page = 1, 
      limit = 1000 
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const isAdminOrDirector = ['superadmin', 'director'].includes(req.user.role);

    // Build where clause
    const whereConditions = [];

    // Superadmin/Director see ALL enquiries
    if (isAdminOrDirector) {
      // No filter - show all enquiries
    } else {
      // For other users: Get enquiry IDs from history where user worked on them
      const historyRecords = await prisma.enquiryStatusHistory.findMany({
        where: {
          assignedPerson: req.user.id
        },
        select: {
          enquiryId: true
        },
        distinct: ['enquiryId']
      });

      const enquiryIdsFromHistory = historyRecords.map(h => h.enquiryId);

      // User created enquiries OR worked on them (from history)
      if (enquiryIdsFromHistory.length > 0) {
        whereConditions.push({
          OR: [
            { enquiryBy: req.user.id },
            { id: { in: enquiryIdsFromHistory } }
          ]
        });
      } else {
        whereConditions.push({ enquiryBy: req.user.id });
      }
    }

    // Add status filter
    if (status && status !== 'all') {
      whereConditions.push({ status });
    }

    // Add material type filter
    if (materialType && materialType !== 'all') {
      whereConditions.push({ materialType });
    }

    // Add search filter
    if (search) {
      whereConditions.push({
        OR: [
          { enquiryNum: { contains: search, mode: 'insensitive' } },
          { enquiryDetail: { contains: search, mode: 'insensitive' } },
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { client: { clientName: { contains: search, mode: 'insensitive' } } }
        ]
      });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    const [enquiries, total] = await Promise.all([
      prisma.enquiry.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          client: true,
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
        orderBy: { createdAt: 'desc' }
      }),
      prisma.enquiry.count({ where })
    ]);

    res.json({
      success: true,
      data: enquiries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get enquiry by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdminOrDirector = ['superadmin', 'director'].includes(req.user.role);
    
    // Superadmin and Director can view ANY enquiry without restrictions
    // Other roles can only view enquiries they have access to (checked after fetch)
    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      include: {
        client: true,
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
        },
        statusHistory: {
          include: {
            assignedPersonUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { statusChangedDateTime: 'desc' }
        }
      }
    });

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    // Superadmin and Director have full access - no restrictions
    if (isAdminOrDirector) {
      return res.json({
        success: true,
        data: enquiry
      });
    }

    // For other roles, check if they have access
    const isSalesperson = req.user.role === 'salesman';
    const hasDirectAccess = 
      enquiry.enquiryBy === req.user.id ||
      enquiry.currentAssignedPerson === req.user.id;
    
    if (hasDirectAccess) {
      return res.json({
        success: true,
        data: enquiry
      });
    }

    // Check if user worked on this enquiry (from history)
    const workedOnEnquiry = await prisma.enquiryStatusHistory.findFirst({
      where: {
        enquiryId: id,
        assignedPerson: req.user.id
      }
    });
    
    if (workedOnEnquiry) {
      return res.json({
        success: true,
        data: enquiry
      });
    }

    // No access
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this enquiry'
    });
  } catch (error) {
    console.error('Error fetching enquiry by ID:', error);
    next(error);
  }
});

// Create enquiry
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      enquiryNum,
      clientId,
      materialType,
      enquiryDetail,
      enquiryAmount,
      purchaseDetail,
      expectedDispatchDate,
      deliveryAddress
    } = req.body;

    if (!clientId || !materialType || !enquiryDetail || !enquiryAmount) {
      return res.status(400).json({
        success: false,
        message: 'Client, material type, enquiry detail, and enquiry amount are required'
      });
    }

    // Generate enquiry number if not provided
    const finalEnquiryNum = enquiryNum || `ENQ-${Date.now().toString().slice(-6)}`;
    
    // Auto-generate order number when enquiry is created
    const generatedOrderNumber = await generateOrderNumber();

    const enquiry = await prisma.enquiry.create({
      data: {
        enquiryNum: finalEnquiryNum,
        clientId,
        materialType,
        enquiryDetail,
        enquiryAmount: parseFloat(enquiryAmount),
        purchaseDetail,
        expectedDispatchDate: expectedDispatchDate ? new Date(expectedDispatchDate) : null,
        deliveryAddress: deliveryAddress || null,
        enquiryBy: req.user.id,
        currentAssignedPerson: req.user.id,
        status: 'Enquiry',
        orderNumber: generatedOrderNumber,
        orderDate: new Date()
      },
      include: {
        client: true,
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
      }
    });

    // Create status history
    await prisma.enquiryStatusHistory.create({
      data: {
        enquiryId: enquiry.id,
        status: 'Enquiry',
        assignedPerson: req.user.id,
        note: 'Enquiry created'
      }
    });

    // Emit notification
    const io = req.app.get('io');
    if (io) {
      // Notify assigned user
      if (enquiry.currentAssignedPerson && enquiry.currentAssignedPerson !== req.user.id) {
        const assignedUser = await prisma.user.findUnique({
          where: { id: enquiry.currentAssignedPerson },
          select: { id: true, name: true }
        });
        
        if (assignedUser) {
          const assignmentNotification = createAssignmentNotification(
            enquiry,
            assignedUser,
            req.user
          );
          notifyUser(io, enquiry.currentAssignedPerson, assignmentNotification);
        }
      }
      
      // Notify directors and superadmins
      const notification = {
        type: 'enquiry_created',
        title: 'New Enquiry Created',
        message: `New enquiry ${enquiry.enquiryNum} has been created`,
        enquiryId: enquiry.id,
        enquiryNum: enquiry.enquiryNum,
        createdBy: req.user.name,
        createdById: req.user.id,
        timestamp: new Date().toISOString()
      };
      notifyRole(io, 'director', notification);
      notifyRole(io, 'superadmin', notification);
    }

    res.status(201).json({
      success: true,
      message: 'Enquiry created successfully',
      data: enquiry
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Enquiry number already exists'
      });
    }
    next(error);
  }
});

// Update enquiry
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const {
      clientId,
      materialType,
      enquiryDetail,
      enquiryAmount,
      purchaseDetail,
      expectedDispatchDate,
      deliveryAddress,
      orderNumber
    } = req.body;

    const enquiry = await prisma.enquiry.update({
      where: { id: req.params.id },
      data: {
        ...(clientId && { clientId }),
        ...(materialType && { materialType }),
        ...(enquiryDetail && { enquiryDetail }),
        ...(enquiryAmount && { enquiryAmount: parseFloat(enquiryAmount) }),
        ...(purchaseDetail !== undefined && { purchaseDetail }),
        ...(expectedDispatchDate && { expectedDispatchDate: new Date(expectedDispatchDate) }),
        ...(deliveryAddress && { deliveryAddress }),
        ...(orderNumber !== undefined && { orderNumber })
      },
      include: {
        client: true,
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
      }
    });

    res.json({
      success: true,
      message: 'Enquiry updated successfully',
      data: enquiry
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }
    next(error);
  }
});

// Helper function to generate sequential order number
async function generateOrderNumber() {
  // Get the latest order number
  const latestEnquiry = await prisma.enquiry.findFirst({
    where: {
      orderNumber: { not: null }
    },
    orderBy: {
      orderNumber: 'desc'
    },
    select: {
      orderNumber: true
    }
  });

  if (!latestEnquiry || !latestEnquiry.orderNumber) {
    // First order number
    return 'ORD-0001';
  }

  // Extract number from order number (e.g., ORD-0123 -> 123)
  const match = latestEnquiry.orderNumber.match(/(\d+)$/);
  if (match) {
    const nextNumber = parseInt(match[1], 10) + 1;
    return `ORD-${nextNumber.toString().padStart(4, '0')}`;
  }

  // Fallback if format doesn't match
  return `ORD-${Date.now().toString().slice(-6)}`;
}

// Update enquiry status
router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status, assignedPersonId, note } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: { id: req.params.id },
      include: {
        assignedUser: true
      }
    });

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    const oldStatus = enquiry.status;
    const assignedTo = assignedPersonId || enquiry.currentAssignedPerson;

    // Prepare update data
    const updateData = {
      status,
      currentAssignedPerson: assignedTo,
      workAssignedDate: new Date()
    };

    // Auto-generate order number and set order date when status changes to ReadyForProduction
    if (status === 'ReadyForProduction' && !enquiry.orderNumber) {
      updateData.orderNumber = await generateOrderNumber();
      updateData.orderDate = new Date();
    }

    // Auto-create design work when status changes to Design and assigned to a designer
    if (status === 'Design' && assignedTo) {
      try {
        const assignedUser = await prisma.user.findUnique({
          where: { id: assignedTo },
          select: { role: true }
        });
        
        // Only create design work if assigned to a designer
        if (assignedUser && assignedUser.role === 'designer') {
          await prisma.designWork.upsert({
            where: { enquiryId: enquiry.id },
            update: {
              designerId: assignedTo,
              designStatus: 'pending'
            },
            create: {
              enquiryId: enquiry.id,
              designerId: assignedTo,
              clientRequirements: '',
              designerNotes: '',
              designStatus: 'pending'
            }
          });
        }
      } catch (designError) {
        // Log error but don't fail the status update
        console.error('Error creating design work:', designError);
      }
    }

    // Auto-create production workflow when status changes to ReadyForProduction and assigned to production
    if (status === 'ReadyForProduction' && assignedTo) {
      try {
        const assignedUser = await prisma.user.findUnique({
          where: { id: assignedTo },
          select: { role: true }
        });
        
        // Only create production workflow if assigned to production user
        if (assignedUser && assignedUser.role === 'production') {
          await prisma.productionWorkflow.upsert({
            where: { enquiryId: enquiry.id },
            update: {
              productionLead: assignedTo,
              status: 'not_started'
            },
            create: {
              enquiryId: enquiry.id,
              productionLead: assignedTo,
              status: 'not_started'
            }
          });
          console.log(`Production workflow auto-created for enquiry ${enquiry.id}`);
        }
      } catch (productionError) {
        // Log error but don't fail the status update
        console.error('Error creating production workflow:', productionError);
      }
    }

    const updatedEnquiry = await prisma.enquiry.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        client: true,
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
      }
    });

    // Create status history
    const statusHistoryNote = note || `Status changed from ${oldStatus} to ${status}`;
    await prisma.enquiryStatusHistory.create({
      data: {
        enquiryId: enquiry.id,
        status,
        assignedPerson: assignedTo,
        note: statusHistoryNote
      }
    });

    // Create enquiry note if note provided
    if (note && note.trim()) {
      await prisma.enquiryNote.create({
        data: {
          enquiryId: enquiry.id,
          note: note.trim(),
          createdBy: req.user.id
        }
      });
    }

    // Emit notifications
    const io = req.app.get('io');
    if (io) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedTo },
        select: { id: true, name: true }
      });

      // Notify assigned user
      if (assignedUser) {
        const assignmentNotification = createAssignmentNotification(
          updatedEnquiry,
          assignedUser,
          req.user
        );
        notifyUser(io, assignedTo, assignmentNotification);
      }

      // Notify status change
      const statusNotification = createStatusChangeNotification(
        updatedEnquiry,
        oldStatus,
        status,
        req.user
      );
      io.emitToEnquiry(enquiry.id, 'status_changed', {
        enquiry: updatedEnquiry,
        oldStatus,
        newStatus: status,
        changedBy: req.user
      });
      notifyRole(io, 'director', statusNotification);
      notifyRole(io, 'superadmin', statusNotification);
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: updatedEnquiry
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }
    next(error);
  }
});

// Assign enquiry to user
router.patch('/:id/assign', authenticate, async (req, res, next) => {
  try {
    const { assignedPersonId, note } = req.body;

    if (!assignedPersonId) {
      return res.status(400).json({
        success: false,
        message: 'Assigned person ID is required'
      });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: { id: req.params.id }
    });

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedPersonId }
    });

    if (!assignedUser) {
      return res.status(404).json({
        success: false,
        message: 'Assigned user not found'
      });
    }

    const updatedEnquiry = await prisma.enquiry.update({
      where: { id: req.params.id },
      data: {
        currentAssignedPerson: assignedPersonId,
        workAssignedDate: new Date()
      },
      include: {
        client: true,
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
      }
    });

    // Create status history
    const assignmentNote = note || `Reassigned to ${assignedUser.name}`;
    await prisma.enquiryStatusHistory.create({
      data: {
        enquiryId: enquiry.id,
        status: enquiry.status,
        assignedPerson: assignedPersonId,
        note: assignmentNote
      }
    });

    // Create enquiry note if note provided
    if (note && note.trim()) {
      await prisma.enquiryNote.create({
        data: {
          enquiryId: enquiry.id,
          note: note.trim(),
          createdBy: req.user.id
        }
      });
    }

    // Emit notification
    const io = req.app.get('io');
    if (io) {
      const notification = createAssignmentNotification(
        updatedEnquiry,
        assignedUser,
        req.user
      );
      notifyUser(io, assignedPersonId, notification);
      io.emitToEnquiry(enquiry.id, 'assignment_changed', {
        enquiry: updatedEnquiry,
        assignedTo: assignedUser,
        assignedBy: req.user
      });
    }

    res.json({
      success: true,
      message: 'Enquiry assigned successfully',
      data: updatedEnquiry
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }
    next(error);
  }
});

// Confirm order and assign to production
router.post('/:id/confirm-order', authenticate, async (req, res, next) => {
  try {
    const { orderNumber, productionUserId } = req.body;

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: 'Order number is required'
      });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: { id: req.params.id },
      include: {
        enquiryByUser: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    const assignedTo = productionUserId || enquiry.currentAssignedPerson;

    const updatedEnquiry = await prisma.enquiry.update({
      where: { id: req.params.id },
      data: {
        orderNumber,
        orderDate: new Date(),
        status: 'ReadyForProduction',
        currentAssignedPerson: assignedTo,
        workAssignedDate: new Date()
      },
      include: {
        client: true,
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
      }
    });

    // Create status history
    await prisma.enquiryStatusHistory.create({
      data: {
        enquiryId: enquiry.id,
        status: 'ReadyForProduction',
        assignedPerson: assignedTo,
        note: `Order confirmed with order number: ${orderNumber}`
      }
    });

    // Create production workflow if assigned to production
    if (productionUserId) {
      await prisma.productionWorkflow.upsert({
        where: { enquiryId: enquiry.id },
        update: {
          productionLead: productionUserId,
          status: 'not_started'
        },
        create: {
          enquiryId: enquiry.id,
          productionLead: productionUserId,
          status: 'not_started'
        }
      });
    }

    // Emit notification
    const io = req.app.get('io');
    if (io) {
      const notification = {
        type: 'order_confirmed',
        title: 'Order Confirmed',
        message: `Order ${orderNumber} confirmed for enquiry ${enquiry.enquiryNum}`,
        enquiryId: enquiry.id,
        enquiryNum: enquiry.enquiryNum,
        orderNumber,
        confirmedBy: req.user.name,
        timestamp: new Date().toISOString()
      };
      notifyUser(io, assignedTo, notification);
      io.emitToEnquiry(enquiry.id, 'order_confirmed', {
        enquiry: updatedEnquiry,
        orderNumber,
        confirmedBy: req.user
      });
    }

    res.json({
      success: true,
      message: 'Order confirmed successfully',
      data: updatedEnquiry
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }
    next(error);
  }
});

// Get enquiry status history
router.get('/:id/history', authenticate, async (req, res, next) => {
  try {
    const history = await prisma.enquiryStatusHistory.findMany({
      where: { enquiryId: req.params.id },
      include: {
        assignedPersonUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true
          }
        }
      },
      orderBy: { statusChangedDateTime: 'desc' }
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
});

// Confirm order and assign to production
router.post('/:id/confirm-order', authenticate, async (req, res, next) => {
  try {
    const { productionUserId } = req.body;

    const enquiry = await prisma.enquiry.findUnique({
      where: { id: req.params.id },
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

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    // Get production users
    const productionUsers = await prisma.user.findMany({
      where: { role: 'production' }
    });

    if (productionUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No production users found'
      });
    }

    const productionUser = productionUserId
      ? productionUsers.find(u => u.id === productionUserId)
      : productionUsers[0];

    if (!productionUser) {
      return res.status(400).json({
        success: false,
        message: 'Production user not found'
      });
    }

    // Update enquiry
    const updatedEnquiry = await prisma.enquiry.update({
      where: { id: req.params.id },
      data: {
        status: 'ReadyForProduction',
        orderNumber: enquiry.orderNumber || await generateOrderNumber(),
        orderDate: enquiry.orderDate || new Date(),
        currentAssignedPerson: productionUser.id,
        workAssignedDate: new Date()
      },
      include: {
        client: true,
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
      }
    });

    // Create production workflow
    const workflow = await prisma.productionWorkflow.upsert({
      where: { enquiryId: req.params.id },
      update: {
        productionLead: productionUser.id,
        status: 'not_started'
      },
      create: {
        enquiryId: req.params.id,
        productionLead: productionUser.id,
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
        enquiryId: req.params.id,
        status: 'ReadyForProduction',
        assignedPerson: productionUser.id,
        note: `Order confirmed and assigned to production by ${req.user.name}`
      }
    });

    // Emit notification
    const io = req.app.get('io');
    if (io) {
      const notification = {
        type: 'order_confirmed',
        title: 'Order Confirmed',
        message: `Order ${updatedEnquiry.orderNumber} confirmed and assigned to production`,
        enquiryId: updatedEnquiry.id,
        enquiryNum: updatedEnquiry.enquiryNum,
        orderNumber: updatedEnquiry.orderNumber,
        assignedTo: productionUser.name,
        assignedToId: productionUser.id,
        confirmedBy: req.user.name,
        timestamp: new Date().toISOString()
      };
      notifyUser(io, productionUser.id, notification);
      notifyUser(io, enquiry.enquiryBy, notification);
      io.emitToEnquiry(req.params.id, 'order_confirmed', {
        enquiry: updatedEnquiry,
        workflow,
        confirmedBy: req.user
      });
    }

    res.json({
      success: true,
      message: 'Order confirmed and assigned to production',
      data: {
        enquiry: updatedEnquiry,
        workflow
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }
    next(error);
  }
});

// Get all notes for an enquiry
router.get('/:id/notes', authenticate, async (req, res, next) => {
  try {
    const enquiry = await prisma.enquiry.findUnique({
      where: { id: req.params.id },
      select: { id: true }
    });

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    const notes = await prisma.enquiryNote.findMany({
      where: { enquiryId: req.params.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: notes,
      count: notes.length
    });
  } catch (error) {
    next(error);
  }
});

// Create a note for an enquiry
router.post('/:id/notes', authenticate, async (req, res, next) => {
  try {
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note is required'
      });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: { id: req.params.id },
      select: { id: true }
    });

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    const enquiryNote = await prisma.enquiryNote.create({
      data: {
        enquiryId: req.params.id,
        note: note.trim(),
        createdBy: req.user.id
      },
      include: {
        creator: {
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
      message: 'Note added successfully',
      data: enquiryNote
    });
  } catch (error) {
    next(error);
  }
});

// Delete enquiry
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.enquiry.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Enquiry deleted successfully'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }
    next(error);
  }
});

export default router;
