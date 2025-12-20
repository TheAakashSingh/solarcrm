import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { testSmtpConfig } from '../utils/emailService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get active SMTP configurations (for email sending - available to all authenticated users)
router.get('/active', authenticate, async (req, res, next) => {
  try {
    const configs = await prisma.smtpConfig.findMany({
      where: { isActive: true },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        secure: true,
        fromEmail: true,
        fromName: true,
        isDefault: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
        // Exclude password and user fields for security
      }
    });

    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    next(error);
  }
});

// Get all SMTP configurations (only superadmin)
router.get('/', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmin can access SMTP configurations'
      });
    }

    const configs = await prisma.smtpConfig.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    next(error);
  }
});

// Get SMTP config by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmin can access SMTP configurations'
      });
    }

    const config = await prisma.smtpConfig.findUnique({
      where: { id: req.params.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'SMTP configuration not found'
      });
    }

    // Don't send password in response
    const { password, ...configWithoutPassword } = config;

    res.json({
      success: true,
      data: configWithoutPassword
    });
  } catch (error) {
    next(error);
  }
});

// Get default SMTP config (for sending emails)
router.get('/default/active', authenticate, async (req, res, next) => {
  try {
    const config = await prisma.smtpConfig.findFirst({
      where: {
        isDefault: true,
        isActive: true
      }
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No default SMTP configuration found'
      });
    }

    // Don't send password in response
    const { password, ...configWithoutPassword } = config;

    res.json({
      success: true,
      data: configWithoutPassword
    });
  } catch (error) {
    next(error);
  }
});

// Create SMTP configuration (only superadmin)
router.post('/', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmin can create SMTP configurations'
      });
    }

    const {
      name,
      host,
      port,
      secure,
      user,
      password,
      fromEmail,
      fromName,
      isDefault
    } = req.body;

    if (!name || !host || !port || !user || !password || !fromEmail || !fromName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.smtpConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const config = await prisma.smtpConfig.create({
      data: {
        name,
        host,
        port: parseInt(port),
        secure: secure !== false, // default true
        user,
        password,
        fromEmail,
        fromName,
        isDefault: isDefault || false,
        isActive: true,
        createdBy: req.user.id
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Don't send password in response
    const { password: _, ...configWithoutPassword } = config;

    res.status(201).json({
      success: true,
      message: 'SMTP configuration created successfully',
      data: configWithoutPassword
    });
  } catch (error) {
    next(error);
  }
});

// Update SMTP configuration (only superadmin)
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmin can update SMTP configurations'
      });
    }

    const {
      name,
      host,
      port,
      secure,
      user,
      password,
      fromEmail,
      fromName,
      isDefault,
      isActive
    } = req.body;

    const existingConfig = await prisma.smtpConfig.findUnique({
      where: { id: req.params.id }
    });

    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: 'SMTP configuration not found'
      });
    }

    // If this is set as default, unset other defaults
    if (isDefault && !existingConfig.isDefault) {
      await prisma.smtpConfig.updateMany({
        where: { 
          isDefault: true,
          id: { not: req.params.id }
        },
        data: { isDefault: false }
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (host) updateData.host = host;
    if (port) updateData.port = parseInt(port);
    if (secure !== undefined) updateData.secure = secure;
    if (user) updateData.user = user;
    if (password) updateData.password = password;
    if (fromEmail) updateData.fromEmail = fromEmail;
    if (fromName) updateData.fromName = fromName;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (isActive !== undefined) updateData.isActive = isActive;

    const config = await prisma.smtpConfig.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Don't send password in response
    const { password: _, ...configWithoutPassword } = config;

    res.json({
      success: true,
      message: 'SMTP configuration updated successfully',
      data: configWithoutPassword
    });
  } catch (error) {
    next(error);
  }
});

// Delete SMTP configuration (only superadmin)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmin can delete SMTP configurations'
      });
    }

    const config = await prisma.smtpConfig.findUnique({
      where: { id: req.params.id }
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'SMTP configuration not found'
      });
    }

    if (config.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete default SMTP configuration. Set another as default first.'
      });
    }

    await prisma.smtpConfig.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'SMTP configuration deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Test SMTP configuration
router.post('/:id/test', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmin can test SMTP configurations'
      });
    }

    const result = await testSmtpConfig(req.params.id);

    res.json({
      success: true,
      message: 'Test email sent successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to test SMTP configuration'
    });
  }
});

// Set default SMTP configuration
router.post('/:id/set-default', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmin can set default SMTP configuration'
      });
    }

    // Unset all defaults
    await prisma.smtpConfig.updateMany({
      where: { isDefault: true },
      data: { isDefault: false }
    });

    // Set this as default
    const config = await prisma.smtpConfig.update({
      where: { id: req.params.id },
      data: { isDefault: true, isActive: true },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Don't send password in response
    const { password, ...configWithoutPassword } = config;

    res.json({
      success: true,
      message: 'Default SMTP configuration updated',
      data: configWithoutPassword
    });
  } catch (error) {
    next(error);
  }
});

export default router;

