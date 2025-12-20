// API Configuration and Client
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Get auth token from localStorage
const getToken = (): string | null => {
  return localStorage.getItem('token');
};

// API Request helper
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string }> => {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    // Prevent caching to avoid 304 Not Modified issues
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      // Force fresh request, bypass cache
      cache: 'no-store',
    });

    // Handle network errors
    if (!response.ok && response.status === 0) {
      throw new Error('Network error: Could not connect to server. Please ensure the backend is running.');
    }

    // Handle 304 Not Modified - force a fresh request
    if (response.status === 304) {
      // For 304, make a fresh request with cache-busting
      const timestamp = Date.now();
      const separator = endpoint.includes('?') ? '&' : '?';
      const freshResponse = await fetch(`${API_BASE_URL}${endpoint}${separator}_t=${timestamp}`, {
        ...options,
        headers: {
          ...headers,
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store',
      });
      
      if (!freshResponse.ok) {
        throw new Error('Request failed');
      }
      
      const freshData = await freshResponse.json();
      return freshData;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  } catch (error: any) {
    console.error('API Error:', error);
    // Handle connection errors gracefully
    if (error.message?.includes('Failed to fetch') || 
        error.message?.includes('Network error') ||
        error.message?.includes('ERR_CONNECTION_REFUSED') ||
        error.name === 'TypeError') {
      return { 
        success: false, 
        message: 'Could not connect to server. Please ensure the backend is running on port 5000.' 
      };
    }
    throw error;
  }
};

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  
  register: async (userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  getMe: async () => {
    return apiRequest('/auth/me');
  },
  
  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

// Users API
export const usersAPI = {
  getAll: async () => {
    return apiRequest('/users');
  },
  
  getById: async (id: string) => {
    return apiRequest(`/users/${id}`);
  },
  
  getByRole: async (role: string) => {
    return apiRequest(`/users/role/${role}`);
  },
  
  getByStatus: async (status: string) => {
    return apiRequest(`/users/by-status/${status}`);
  },
  
  create: async (userData: {
    name: string;
    email: string;
    password: string;
    role: string;
    workflowStatus?: string[];
  }) => {
    return apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  update: async (id: string, userData: Partial<{
    name: string;
    email: string;
    role: string;
    avatar: string;
    workflowStatus: string[];
  }>) => {
    return apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// Clients API
export const clientsAPI = {
  getAll: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    return apiRequest(`/clients?${queryParams.toString()}`);
  },
  
  getById: async (id: string) => {
    return apiRequest(`/clients/${id}`);
  },
  
  create: async (clientData: {
    clientName: string;
    email: string;
    contactNo: string;
    contactPerson: string;
    address: string;
  }) => {
    return apiRequest('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  },
  
  update: async (id: string, clientData: Partial<{
    clientName: string;
    email: string;
    contactNo: string;
    contactPerson: string;
    address: string;
  }>) => {
    return apiRequest(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clientData),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest(`/clients/${id}`, {
      method: 'DELETE',
    });
  },
};

// Enquiries API
export const enquiriesAPI = {
  getAll: async (params?: {
    status?: string;
    clientId?: string;
    enquiryBy?: string;
    assignedTo?: string;
    materialType?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/enquiries?${queryParams.toString()}`);
  },
  
  getById: async (id: string) => {
    return apiRequest(`/enquiries/${id}`);
  },
  
  getHistory: async (id: string) => {
    return apiRequest(`/enquiries/${id}/history`);
  },

  getMyWorkedEnquiries: async (params?: {
    status?: string;
    materialType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/enquiries/my-worked-enquiries?${queryParams.toString()}`);
  },
  
  create: async (enquiryData: {
    enquiryNum?: string;
    clientId: string;
    materialType: string;
    enquiryDetail: string;
    enquiryAmount: number;
    purchaseDetail?: string;
    expectedDispatchDate?: string;
    deliveryAddress: string;
  }) => {
    return apiRequest('/enquiries', {
      method: 'POST',
      body: JSON.stringify(enquiryData),
    });
  },
  
  update: async (id: string, enquiryData: Partial<{
    clientId: string;
    materialType: string;
    enquiryDetail: string;
    enquiryAmount: number;
    purchaseDetail: string;
    expectedDispatchDate: string;
    deliveryAddress: string;
    orderNumber: string;
  }>) => {
    return apiRequest(`/enquiries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(enquiryData),
    });
  },
  
  updateStatus: async (id: string, status: string, assignedPersonId?: string, note?: string) => {
    return apiRequest(`/enquiries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, assignedPersonId, note }),
    });
  },
  
  assign: async (id: string, assignedPersonId: string) => {
    return apiRequest(`/enquiries/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedPersonId }),
    });
  },
  
  confirmOrder: async (id: string, productionUserId?: string) => {
    return apiRequest(`/enquiries/${id}/confirm-order`, {
      method: 'POST',
      body: JSON.stringify({ productionUserId }),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest(`/enquiries/${id}`, {
      method: 'DELETE',
    });
  },
};

// Design API
export const designAPI = {
  getByEnquiry: async (enquiryId: string) => {
    const response = await apiRequest(`/design/enquiry/${enquiryId}`);
    // Backend now returns success: true with null data if not found
    return response;
  },
  
  getMyCompleted: async () => {
    return apiRequest('/design/my-completed');
  },
  
  getAttachments: async (enquiryId: string) => {
    const response = await apiRequest(`/design/enquiry/${enquiryId}/attachments`);
    // Backend now returns success: true with empty array if not found
    return response;
  },
  
  assign: async (enquiryId: string, designerId: string, clientRequirements?: string) => {
    return apiRequest('/design/assign', {
      method: 'POST',
      body: JSON.stringify({ enquiryId, designerId, clientRequirements }),
    });
  },
  
  update: async (id: string, designData: Partial<{
    designer_notes?: string;
    client_requirements?: string;
    design_status?: string;
    designerNotes?: string;
    clientRequirements?: string;
    designStatus?: string;
  }>) => {
    // Convert to camelCase (backend Prisma schema uses camelCase)
    // Support both input formats but send camelCase to backend
    const backendData: any = {};
    
    // Handle snake_case inputs - convert to camelCase
    if (designData.designer_notes !== undefined) {
      backendData.designerNotes = designData.designer_notes;
    }
    if (designData.client_requirements !== undefined) {
      backendData.clientRequirements = designData.client_requirements;
    }
    if (designData.design_status !== undefined) {
      backendData.designStatus = designData.design_status;
    }
    
    // Handle camelCase inputs - use directly
    if (designData.designerNotes !== undefined) {
      backendData.designerNotes = designData.designerNotes;
    }
    if (designData.clientRequirements !== undefined) {
      backendData.clientRequirements = designData.clientRequirements;
    }
    if (designData.designStatus !== undefined) {
      backendData.designStatus = designData.designStatus;
    }
    
    return apiRequest(`/design/${id}`, {
      method: 'PUT',
      body: JSON.stringify(backendData),
    });
  },
  
  uploadAttachment: async (attachmentData: {
    enquiryId: string;
    fileName: string;
    fileUrl: string;
    fileType?: string;
  }) => {
    return apiRequest('/design/attachments', {
      method: 'POST',
      body: JSON.stringify(attachmentData),
    });
  },
  
  deleteAttachment: async (id: string) => {
    return apiRequest(`/design/attachments/${id}`, {
      method: 'DELETE',
    });
  },
};

// Production API
export const productionAPI = {
  getByEnquiry: async (enquiryId: string) => {
    const response = await apiRequest(`/production/enquiry/${enquiryId}`);
    // Backend now returns success: true with null data if not found
    return response;
  },
  
  assign: async (enquiryId: string, productionLeadId: string) => {
    return apiRequest('/production/assign', {
      method: 'POST',
      body: JSON.stringify({ enquiryId, productionLeadId }),
    });
  },
  
  start: async (id: string) => {
    return apiRequest(`/production/${id}/start`, {
      method: 'POST',
    });
  },
  
  createTask: async (workflowId: string, taskData: {
    enquiryId: string;
    step: string;
    assignedTo: string;
    notes?: string;
  }) => {
    return apiRequest(`/production/${workflowId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },
  
  updateTask: async (id: string, taskData: Partial<{
    status: string;
    notes: string;
    startedAt: string;
    completedAt: string;
  }>) => {
    return apiRequest(`/production/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(taskData),
    });
  },
  
  complete: async (id: string) => {
    return apiRequest(`/production/${id}/complete`, {
      method: 'POST',
    });
  },
  
  updateNotes: async (id: string, notes: string) => {
    return apiRequest(`/production/${id}/notes`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  },
};

// Dispatch API
export const dispatchAPI = {
  getByEnquiry: async (enquiryId: string) => {
    const response = await apiRequest(`/dispatch/enquiry/${enquiryId}`);
    // Backend now returns success: true with null data if not found
    return response;
  },
  
  assign: async (enquiryId: string, dispatchAssignedTo: string) => {
    return apiRequest('/dispatch/assign', {
      method: 'POST',
      body: JSON.stringify({ enquiryId, dispatchAssignedTo }),
    });
  },
  
  update: async (id: string, dispatchData: Partial<{
    trackingNumber: string;
    dispatchDate: string;
    estimatedDeliveryDate: string;
    status: string;
    notes: string;
  }>) => {
    return apiRequest(`/dispatch/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dispatchData),
    });
  },
};

// Quotations API
export const quotationsAPI = {
  getAll: async (params?: {
    search?: string;
    status?: string;
    enquiryId?: string;
    clientId?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/quotations?${queryParams.toString()}`);
  },
  
  getById: async (id: string) => {
    return apiRequest(`/quotations/${id}`);
  },
  
  getByEnquiry: async (enquiryId: string) => {
    const response = await apiRequest(`/quotations/enquiry/${enquiryId}`);
    // Backend returns success: true with empty array if not found
    return response;
  },
  
  create: async (quotationData: {
    number?: string;
    enquiryId: string;
    clientId: string;
    date?: string;
    validUntil?: string;
    status?: string;
    subtotal: number;
    discount: number;
    discountAmount: number;
    taxRate: number;
    taxAmount: number;
    grandTotal: number;
    notes?: string;
    terms?: string;
    lineItems?: Array<{
      description: string;
      quantity: number;
      unit: string;
      rate: number;
      amount: number;
    }>;
    // BOQ format fields
    orderNo?: string;
    nosOfModule?: string;
    projectCapacity?: string;
    noOfTable?: number;
    totalWeightInKg?: number;
    weightIncreaseAfterHdg?: number;
    totalWeightAfterHotdip?: number;
    ratePerKg?: number;
    totalAmountBoq?: number;
    boqPurchaseRate?: number;
    boqCosting?: number;
    boqGrossProfit?: number;
    boqProfitPercent?: number;
    totalHardwareCost?: number;
    hardwarePurchaseTotal?: number;
    totalStructurePlusHardware?: number;
    hardwareGrossProfit?: number;
    totalGrossProfit?: number;
    totalProfitPercent?: number;
    boqItems?: Array<{
      srNo: number;
      descriptions: string;
      type?: string;
      specification?: string;
      lengthMm?: number;
      requiredQty: number;
      totalWeight?: number;
      weightPerPec?: number;
      qtyPerTable?: number;
      weightPerTable?: number;
      unitWeight?: number;
      purchaseRate?: number;
    }>;
    hardwareItems?: Array<{
      srNo: number;
      descriptions: string;
      quantity: number;
      rate: number;
      amount: number;
      purchaseRate?: number;
    }>;
  }) => {
    return apiRequest('/quotations', {
      method: 'POST',
      body: JSON.stringify(quotationData),
    });
  },
  
  update: async (id: string, quotationData: Partial<{
    date: string;
    validUntil: string;
    status: string;
    subtotal: number;
    discount: number;
    discountAmount: number;
    taxRate: number;
    taxAmount: number;
    grandTotal: number;
    notes: string;
    terms: string;
    lineItems: Array<{
      description: string;
      quantity: number;
      unit: string;
      rate: number;
      amount: number;
    }>;
  }>) => {
    return apiRequest(`/quotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(quotationData),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest(`/quotations/${id}`, {
      method: 'DELETE',
    });
  },
  
  sendEmail: async (id: string, smtpConfigId?: string) => {
    return apiRequest(`/quotations/${id}/send-email`, {
      method: 'POST',
      body: JSON.stringify({ smtpConfigId }),
    });
  },
};

// Invoices API
export const invoicesAPI = {
  getAll: async (params?: {
    search?: string;
    status?: string;
    enquiryId?: string;
    clientId?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/invoices?${queryParams.toString()}`);
  },
  
  getById: async (id: string) => {
    return apiRequest(`/invoices/${id}`);
  },
  
  create: async (invoiceData: {
    number?: string;
    enquiryId: string;
    quotationId?: string;
    clientId: string;
    date?: string;
    dueDate?: string;
    status?: string;
    subtotal: number;
    discount: number;
    discountAmount: number;
    taxRate: number;
    taxAmount: number;
    grandTotal: number;
    notes?: string;
    terms?: string;
    lineItems: Array<{
      description: string;
      quantity: number;
      unit: string;
      rate: number;
      amount: number;
    }>;
  }) => {
    return apiRequest('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  },
  
  update: async (id: string, invoiceData: Partial<{
    date: string;
    dueDate: string;
    status: string;
    subtotal: number;
    discount: number;
    discountAmount: number;
    taxRate: number;
    taxAmount: number;
    grandTotal: number;
    notes: string;
    terms: string;
    lineItems: Array<{
      description: string;
      quantity: number;
      unit: string;
      rate: number;
      amount: number;
    }>;
  }>) => {
    return apiRequest(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceData),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest(`/invoices/${id}`, {
      method: 'DELETE',
    });
  },
};

// Communication API
export const communicationAPI = {
  getByEnquiry: async (enquiryId: string) => {
    const response = await apiRequest(`/communication/enquiry/${enquiryId}`);
    // Backend now returns success: true with empty array if not found
    return response;
  },
  
  create: async (logData: {
    enquiryId: string;
    communicationType: string;
    subject: string;
    message: string;
    communicationDate?: string;
    clientResponse?: string;
  }) => {
    return apiRequest('/communication', {
      method: 'POST',
      body: JSON.stringify(logData),
    });
  },
  
  update: async (id: string, logData: Partial<{
    subject: string;
    message: string;
    clientResponse: string;
  }>) => {
    return apiRequest(`/communication/${id}`, {
      method: 'PUT',
      body: JSON.stringify(logData),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest(`/communication/${id}`, {
      method: 'DELETE',
    });
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async (params?: {
    startDate?: string;
    endDate?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    return apiRequest(`/dashboard/stats?${queryParams.toString()}`);
  },
  
  getKanban: async () => {
    return apiRequest('/dashboard/kanban');
  },
  getAnalytics: async (period?: 'week' | 'month' | 'year') => {
    const queryParams = new URLSearchParams();
    if (period) queryParams.append('period', period);
    return apiRequest(`/dashboard/analytics?${queryParams.toString()}`);
  },
};

// Reports API
export const reportsAPI = {
  getAll: async (params?: {
    startDate?: string;
    endDate?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    return apiRequest(`/reports?${queryParams.toString()}`);
  },
};

// Tasks API
export const tasksAPI = {
  getMyTasks: async () => {
    return apiRequest('/tasks/my-tasks');
  },
};

// Notifications API
export const notificationsAPI = {
  getAll: async () => {
    return apiRequest('/notifications');
  },
  
  markAsRead: async (id: string) => {
    return apiRequest(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  },
  
  markAllAsRead: async () => {
    return apiRequest('/notifications/read-all', {
      method: 'PUT',
    });
  },
};

// SMTP API (Superadmin only)
export const smtpAPI = {
  getAll: async () => {
    return apiRequest('/smtp');
  },
  
  getActive: async () => {
    return apiRequest('/smtp/active');
  },
  
  getById: async (id: string) => {
    return apiRequest(`/smtp/${id}`);
  },
  
  getDefault: async () => {
    return apiRequest('/smtp/default/active');
  },
  
  create: async (configData: {
    name: string;
    host: string;
    port: number;
    secure?: boolean;
    user: string;
    password: string;
    fromEmail: string;
    fromName: string;
    isDefault?: boolean;
  }) => {
    return apiRequest('/smtp', {
      method: 'POST',
      body: JSON.stringify(configData),
    });
  },
  
  update: async (id: string, configData: Partial<{
    name: string;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromEmail: string;
    fromName: string;
    isDefault: boolean;
    isActive: boolean;
  }>) => {
    return apiRequest(`/smtp/${id}`, {
      method: 'PUT',
      body: JSON.stringify(configData),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest(`/smtp/${id}`, {
      method: 'DELETE',
    });
  },
  
  test: async (id: string) => {
    return apiRequest(`/smtp/${id}/test`, {
      method: 'POST',
    });
  },
  
  setDefault: async (id: string) => {
    return apiRequest(`/smtp/${id}/set-default`, {
      method: 'POST',
    });
  },
};

// Export Socket URL
export const getSocketUrl = () => SOCKET_URL;
