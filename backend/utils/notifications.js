import { Server } from 'socket.io';
import { notificationStore } from '../routes/notifications.js';

/**
 * Store notification for a user
 */
const addNotification = (userId, notification) => {
  const userNotifications = notificationStore.get(userId) || [];
  const notificationWithId = {
    ...notification,
    id: notification.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    read: false
  };
  userNotifications.push(notificationWithId);
  notificationStore.set(userId, userNotifications);
  
  // Keep only last 100 notifications per user
  if (userNotifications.length > 100) {
    userNotifications.shift();
  }
};

/**
 * Emit notification to specific user
 */
export const notifyUser = (io, userId, notification) => {
  // Store notification
  addNotification(userId, notification);
  
  // Emit real-time notification
  io.to(`user:${userId}`).emit('notification', notification);
};

/**
 * Emit notification to all users with specific role
 */
export const notifyRole = (io, role, notification) => {
  // Note: For role-based notifications, we'd need to get all users with that role
  // For now, just emit. In production, store for each user.
  io.to(`role:${role}`).emit('notification', notification);
};

/**
 * Emit notification to all connected clients
 */
export const notifyAll = (io, notification) => {
  io.emit('notification', notification);
};

/**
 * Create status change notification
 */
export const createStatusChangeNotification = (enquiry, oldStatus, newStatus, changedBy) => {
  return {
    type: 'status_change',
    title: 'Status Changed',
    message: `Enquiry ${enquiry.enquiryNum} status changed from ${oldStatus} to ${newStatus}`,
    enquiryId: enquiry.id,
    enquiryNum: enquiry.enquiryNum,
    oldStatus,
    newStatus,
    changedBy: changedBy.name,
    changedById: changedBy.id,
    timestamp: new Date().toISOString()
  };
};

/**
 * Create assignment notification
 */
export const createAssignmentNotification = (enquiry, assignedTo, assignedBy) => {
  return {
    type: 'assignment',
    title: 'New Assignment',
    message: `You have been assigned to enquiry ${enquiry.enquiryNum}`,
    enquiryId: enquiry.id,
    enquiryNum: enquiry.enquiryNum,
    assignedTo: assignedTo.name,
    assignedToId: assignedTo.id,
    assignedBy: assignedBy.name,
    assignedById: assignedBy.id,
    timestamp: new Date().toISOString()
  };
};

/**
 * Create enquiry created notification
 */
export const createEnquiryCreatedNotification = (enquiry, createdBy) => {
  return {
    type: 'enquiry_created',
    title: 'New Enquiry Created',
    message: `New enquiry ${enquiry.enquiryNum} has been created`,
    enquiryId: enquiry.id,
    enquiryNum: enquiry.enquiryNum,
    createdBy: createdBy.name,
    createdById: createdBy.id,
    timestamp: new Date().toISOString()
  };
};

/**
 * Create design completed notification
 */
export const createDesignCompletedNotification = (enquiry, designer) => {
  return {
    type: 'design_completed',
    title: 'Design Completed',
    message: `Design for enquiry ${enquiry.enquiryNum} has been completed`,
    enquiryId: enquiry.id,
    enquiryNum: enquiry.enquiryNum,
    designer: designer.name,
    designerId: designer.id,
    timestamp: new Date().toISOString()
  };
};

/**
 * Create production completed notification
 */
export const createProductionCompletedNotification = (enquiry, productionLead) => {
  return {
    type: 'production_completed',
    title: 'Production Completed',
    message: `Production for enquiry ${enquiry.enquiryNum} has been completed`,
    enquiryId: enquiry.id,
    enquiryNum: enquiry.enquiryNum,
    productionLead: productionLead.name,
    productionLeadId: productionLead.id,
    timestamp: new Date().toISOString()
  };
};

/**
 * Create quotation created notification
 */
export const createQuotationCreatedNotification = (quotation, createdBy) => {
  return {
    type: 'quotation_created',
    title: 'Quotation Created',
    message: `Quotation ${quotation.number} has been created`,
    quotationId: quotation.id,
    quotationNumber: quotation.number,
    enquiryId: quotation.enquiryId,
    createdBy: createdBy.name,
    createdById: createdBy.id,
    timestamp: new Date().toISOString()
  };
};
