import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from './api';

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(getSocketUrl(), {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};

// Helper functions for socket events
export const joinEnquiryRoom = (enquiryId: string) => {
  if (socket) {
    socket.emit('join_enquiry', enquiryId);
  }
};

export const leaveEnquiryRoom = (enquiryId: string) => {
  if (socket) {
    socket.emit('leave_enquiry', enquiryId);
  }
};

// Notification listener - returns cleanup function
export const onNotification = (callback: (notification: any) => void): (() => void) => {
  if (socket) {
    socket.on('notification', callback);
    return () => {
      if (socket) {
        socket.off('notification', callback);
      }
    };
  }
  return () => {};
};

// Status change listener - returns cleanup function
export const onStatusChanged = (callback: (data: any) => void): (() => void) => {
  if (socket) {
    socket.on('status_changed', callback);
    return () => {
      if (socket) {
        socket.off('status_changed', callback);
      }
    };
  }
  return () => {};
};

// Assignment change listener - returns cleanup function
export const onAssignmentChanged = (callback: (data: any) => void): (() => void) => {
  if (socket) {
    socket.on('assignment_changed', callback);
    return () => {
      if (socket) {
        socket.off('assignment_changed', callback);
      }
    };
  }
  return () => {};
};

// Quotation created listener
export const onQuotationCreated = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('quotation_created', callback);
  }
};

// Invoice created listener
export const onInvoiceCreated = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('invoice_created', callback);
  }
};

// Communication logged listener
export const onCommunicationLogged = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('communication_logged', callback);
  }
};

// Order confirmed listener
export const onOrderConfirmed = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('order_confirmed', callback);
  }
};

// Remove all listeners
export const removeAllListeners = () => {
  if (socket) {
    socket.removeAllListeners();
  }
};
