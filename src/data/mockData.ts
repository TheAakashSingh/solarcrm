import { 
  User, 
  Client, 
  Enquiry, 
  EnquiryStatusHistory, 
  UserRole, 
  EnquiryStatus,
  DesignWork,
  DesignAttachment,
  CommunicationLog,
  ProductionWorkflow,
  ProductionTask,
  DispatchWork
} from '@/types/crm';

export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Rajesh Kumar',
    email: 'rajesh@solarcrm.com',
    role: 'superadmin',
    workflow_status: ['Enquiry', 'Design', 'BOQ', 'ReadyForProduction', 'PurchaseWaiting', 'InProduction', 'ProductionComplete', 'Hotdip', 'ReadyForDispatch', 'Dispatched'],
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user-7',
    name: 'Suresh Reddy',
    email: 'suresh@solarcrm.com',
    role: 'director',
    workflow_status: ['Enquiry', 'Design', 'BOQ', 'ReadyForProduction', 'PurchaseWaiting', 'InProduction', 'ProductionComplete', 'Hotdip', 'ReadyForDispatch', 'Dispatched'],
    created_at: '2024-01-02T00:00:00Z'
  },
  {
    id: 'user-2',
    name: 'Amit Sharma',
    email: 'amit@solarcrm.com',
    role: 'salesman',
    workflow_status: ['Enquiry', 'BOQ'],
    created_at: '2024-01-05T00:00:00Z'
  },
  {
    id: 'user-3',
    name: 'Priya Patel',
    email: 'priya@solarcrm.com',
    role: 'salesman',
    workflow_status: ['Enquiry', 'BOQ'],
    created_at: '2024-01-08T00:00:00Z'
  },
  {
    id: 'user-4',
    name: 'Vikram Singh',
    email: 'vikram@solarcrm.com',
    role: 'designer',
    workflow_status: ['Design'],
    created_at: '2024-01-10T00:00:00Z'
  },
  {
    id: 'user-5',
    name: 'Randhir Meena',
    email: 'randhir@solarcrm.com',
    role: 'production',
    workflow_status: ['ReadyForProduction', 'InProduction', 'ProductionComplete', 'Hotdip', 'ReadyForDispatch', 'Dispatched'],
    created_at: '2024-01-12T00:00:00Z'
  },
  {
    id: 'user-6',
    name: 'Manish Gupta',
    email: 'manish@solarcrm.com',
    role: 'purchase',
    workflow_status: ['PurchaseWaiting'],
    created_at: '2024-01-15T00:00:00Z'
  }
];

export const mockClients: Client[] = [
  {
    id: 'client-1',
    client_name: 'SunPower Industries',
    email: 'contact@sunpower.com',
    contact_no: '+91 98765 43210',
    contact_person: 'Mr. Anil Verma',
    address: '123 Industrial Area, Jaipur, Rajasthan 302001',
    created_at: '2024-01-20T00:00:00Z'
  },
  {
    id: 'client-2',
    client_name: 'Green Energy Solutions',
    email: 'info@greenenergy.co.in',
    contact_no: '+91 87654 32109',
    contact_person: 'Ms. Sunita Rao',
    address: '456 Tech Park, Bangalore, Karnataka 560001',
    created_at: '2024-02-01T00:00:00Z'
  },
  {
    id: 'client-3',
    client_name: 'Bharat Solar Tech',
    email: 'sales@bharatsolar.in',
    contact_no: '+91 76543 21098',
    contact_person: 'Mr. Ramesh Choudhary',
    address: '789 Manufacturing Hub, Ahmedabad, Gujarat 380001',
    created_at: '2024-02-10T00:00:00Z'
  },
  {
    id: 'client-4',
    client_name: 'EcoWatt Power',
    email: 'projects@ecowatt.com',
    contact_no: '+91 65432 10987',
    contact_person: 'Mr. Suresh Nair',
    address: '321 Solar Complex, Chennai, Tamil Nadu 600001',
    created_at: '2024-02-15T00:00:00Z'
  },
  {
    id: 'client-5',
    client_name: 'RajSun Enterprises',
    email: 'enquiry@rajsun.in',
    contact_no: '+91 54321 09876',
    contact_person: 'Mr. Dinesh Joshi',
    address: '654 Industrial Estate, Udaipur, Rajasthan 313001',
    created_at: '2024-02-20T00:00:00Z'
  }
];

export const mockEnquiries: Enquiry[] = [
  {
    id: 'enq-001',
    enquiry_num: 'ENQ-2024-001',
    order_number: 'ORD-2024-001',
    client_id: 'client-1',
    material_type: 'Aluminium',
    enquiry_detail: '500 KW Ground Mount Solar Structure for Rooftop Installation. Requires custom mounting brackets and rails.',
    enquiry_by: 'user-2',
    enquiry_amount: 1250000,
    purchase_detail: 'Aluminium profiles 100m, Mounting brackets 50 sets',
    enquiry_date: '2024-10-01T10:30:00Z',
    order_date: '2024-10-05T14:00:00Z',
    expected_dispatch_date: '2024-10-25T00:00:00Z',
    status: 'InProduction',
    current_assigned_person: 'user-5',
    work_assigned_date: '2024-10-10T09:00:00Z',
    delivery_address: '123 Industrial Area, Jaipur, Rajasthan 302001',
    created_at: '2024-10-01T10:30:00Z'
  },
  {
    id: 'enq-002',
    enquiry_num: 'ENQ-2024-002',
    order_number: null,
    client_id: 'client-2',
    material_type: 'GI',
    enquiry_detail: '250 KW Carport Solar Structure for commercial parking. Need galvanized steel frame.',
    enquiry_by: 'user-3',
    enquiry_amount: 875000,
    purchase_detail: null,
    enquiry_date: '2024-10-05T11:45:00Z',
    order_date: null,
    expected_dispatch_date: '2024-11-01T00:00:00Z',
    status: 'Design',
    current_assigned_person: 'user-4',
    work_assigned_date: '2024-10-06T10:00:00Z',
    delivery_address: '456 Tech Park, Bangalore, Karnataka 560001',
    created_at: '2024-10-05T11:45:00Z'
  },
  {
    id: 'enq-003',
    enquiry_num: 'ENQ-2024-003',
    order_number: 'ORD-2024-002',
    client_id: 'client-3',
    material_type: 'GP',
    enquiry_detail: '1 MW Ground Mount Structure. Large scale installation with tracker system compatibility.',
    enquiry_by: 'user-2',
    enquiry_amount: 3500000,
    purchase_detail: 'GP sheets 500 units, Foundation bolts 1000 sets',
    enquiry_date: '2024-09-20T09:00:00Z',
    order_date: '2024-09-25T16:00:00Z',
    expected_dispatch_date: '2024-10-20T00:00:00Z',
    status: 'Hotdip',
    current_assigned_person: 'user-5',
    work_assigned_date: '2024-10-15T08:30:00Z',
    delivery_address: '789 Manufacturing Hub, Ahmedabad, Gujarat 380001',
    created_at: '2024-09-20T09:00:00Z'
  },
  {
    id: 'enq-004',
    enquiry_num: 'ENQ-2024-004',
    order_number: null,
    client_id: 'client-4',
    material_type: 'BOS',
    enquiry_detail: 'Complete Balance of System for 100 KW rooftop. Include inverters, cables and junction boxes.',
    enquiry_by: 'user-3',
    enquiry_amount: 450000,
    purchase_detail: null,
    enquiry_date: '2024-10-10T14:20:00Z',
    order_date: null,
    expected_dispatch_date: '2024-10-30T00:00:00Z',
    status: 'Enquiry',
    current_assigned_person: 'user-3',
    work_assigned_date: '2024-10-10T14:20:00Z',
    delivery_address: '321 Solar Complex, Chennai, Tamil Nadu 600001',
    created_at: '2024-10-10T14:20:00Z'
  },
  {
    id: 'enq-005',
    enquiry_num: 'ENQ-2024-005',
    order_number: 'ORD-2024-003',
    client_id: 'client-5',
    material_type: 'Aluminium',
    enquiry_detail: '750 KW floating solar structure for reservoir installation.',
    enquiry_by: 'user-2',
    enquiry_amount: 2800000,
    purchase_detail: 'Aluminium pontoons 200 units, Mooring systems 50 sets',
    enquiry_date: '2024-09-15T10:00:00Z',
    order_date: '2024-09-20T11:00:00Z',
    expected_dispatch_date: '2024-10-18T00:00:00Z',
    status: 'ReadyForDispatch',
    current_assigned_person: 'user-5',
    work_assigned_date: '2024-10-16T14:00:00Z',
    delivery_address: '654 Industrial Estate, Udaipur, Rajasthan 313001',
    created_at: '2024-09-15T10:00:00Z'
  },
  {
    id: 'enq-006',
    enquiry_num: 'ENQ-2024-006',
    order_number: null,
    client_id: 'client-1',
    material_type: 'GI',
    enquiry_detail: '300 KW rooftop structure with wind load optimization.',
    enquiry_by: 'user-2',
    enquiry_amount: 920000,
    purchase_detail: 'GI tubes 150m, Wind barriers 20 sets',
    enquiry_date: '2024-10-12T16:30:00Z',
    order_date: null,
    expected_dispatch_date: '2024-11-05T00:00:00Z',
    status: 'PurchaseWaiting',
    current_assigned_person: 'user-6',
    work_assigned_date: '2024-10-14T09:00:00Z',
    delivery_address: '123 Industrial Area, Jaipur, Rajasthan 302001',
    created_at: '2024-10-12T16:30:00Z'
  },
  {
    id: 'enq-007',
    enquiry_num: 'ENQ-2024-007',
    order_number: null,
    client_id: 'client-2',
    material_type: 'Aluminium',
    enquiry_detail: '150 KW residential complex structure with aesthetic design.',
    enquiry_by: 'user-3',
    enquiry_amount: 520000,
    purchase_detail: null,
    enquiry_date: '2024-10-13T11:00:00Z',
    order_date: null,
    expected_dispatch_date: '2024-11-10T00:00:00Z',
    status: 'BOQ',
    current_assigned_person: 'user-3',
    work_assigned_date: '2024-10-14T10:30:00Z',
    delivery_address: '456 Tech Park, Bangalore, Karnataka 560001',
    created_at: '2024-10-13T11:00:00Z'
  }
];

export const mockEnquiryHistory: EnquiryStatusHistory[] = [
  {
    id: 'hist-001',
    enquiry_id: 'enq-001',
    status: 'Enquiry',
    status_changed_date_time: '2024-10-01T10:30:00Z',
    assigned_person: 'user-2',
    assigned_person_name: 'Amit Sharma',
    note: 'New enquiry received from client'
  },
  {
    id: 'hist-002',
    enquiry_id: 'enq-001',
    status: 'Design',
    status_changed_date_time: '2024-10-02T11:00:00Z',
    assigned_person: 'user-4',
    assigned_person_name: 'Vikram Singh',
    note: 'Assigned for design work'
  },
  {
    id: 'hist-003',
    enquiry_id: 'enq-001',
    status: 'BOQ',
    status_changed_date_time: '2024-10-04T15:30:00Z',
    assigned_person: 'user-2',
    assigned_person_name: 'Amit Sharma',
    note: 'Design completed, generating BOQ'
  },
  {
    id: 'hist-004',
    enquiry_id: 'enq-001',
    status: 'ReadyForProduction',
    status_changed_date_time: '2024-10-05T14:00:00Z',
    assigned_person: 'user-5',
    assigned_person_name: 'Randhir Meena',
    note: 'Advance payment received, starting production'
  },
  {
    id: 'hist-005',
    enquiry_id: 'enq-001',
    status: 'InProduction',
    status_changed_date_time: '2024-10-10T09:00:00Z',
    assigned_person: 'user-5',
    assigned_person_name: 'Randhir Meena',
    note: 'Production started'
  },
  {
    id: 'hist-006',
    enquiry_id: 'enq-003',
    status: 'Enquiry',
    status_changed_date_time: '2024-09-20T09:00:00Z',
    assigned_person: 'user-2',
    assigned_person_name: 'Amit Sharma',
    note: 'Large order enquiry received'
  },
  {
    id: 'hist-007',
    enquiry_id: 'enq-003',
    status: 'ReadyForProduction',
    status_changed_date_time: '2024-09-25T16:00:00Z',
    assigned_person: 'user-5',
    assigned_person_name: 'Randhir Meena',
    note: 'Order confirmed with advance'
  },
  {
    id: 'hist-008',
    enquiry_id: 'enq-003',
    status: 'InProduction',
    status_changed_date_time: '2024-10-01T08:00:00Z',
    assigned_person: 'user-5',
    assigned_person_name: 'Randhir Meena',
    note: 'Production in progress'
  },
  {
    id: 'hist-009',
    enquiry_id: 'enq-003',
    status: 'ProductionComplete',
    status_changed_date_time: '2024-10-12T17:00:00Z',
    assigned_person: 'user-5',
    assigned_person_name: 'Randhir Meena',
    note: 'Production completed, sending for hotdip'
  },
  {
    id: 'hist-010',
    enquiry_id: 'enq-003',
    status: 'Hotdip',
    status_changed_date_time: '2024-10-15T08:30:00Z',
    assigned_person: 'user-5',
    assigned_person_name: 'Randhir Meena',
    note: 'Hotdip galvanization in process'
  }
];

// Helper functions
export const getUserById = (id: string): User | undefined => {
  return mockUsers.find(user => user.id === id);
};

export const getClientById = (id: string): Client | undefined => {
  return mockClients.find(client => client.id === id);
};

export const getUsersByStatus = (status: EnquiryStatus): User[] => {
  return mockUsers.filter(user => user.workflow_status.includes(status));
};

export const getSalesUsers = (): User[] => {
  return mockUsers.filter(user => user.role === 'salesman');
};

export const getEnquiriesForUser = (userId: string): Enquiry[] => {
  const user = getUserById(userId);
  if (!user) return [];
  
  return mockEnquiries.filter(enquiry => 
    enquiry.current_assigned_person === userId && 
    user.workflow_status.includes(enquiry.status)
  );
};

export const getEnquiryHistory = (enquiryId: string): EnquiryStatusHistory[] => {
  return mockEnquiryHistory
    .filter(h => h.enquiry_id === enquiryId)
    .sort((a, b) => new Date(b.status_changed_date_time).getTime() - new Date(a.status_changed_date_time).getTime());
};

// Enrich enquiry with related data
export const enrichEnquiry = (enquiry: Enquiry): Enquiry => {
  return {
    ...enquiry,
    client: getClientById(enquiry.client_id),
    enquiry_by_user: getUserById(enquiry.enquiry_by),
    assigned_user: getUserById(enquiry.current_assigned_person)
  };
};

export const getEnrichedEnquiries = (): Enquiry[] => {
  return mockEnquiries.map(enrichEnquiry);
};

// Workflow data storage (in a real app, this would be in a database)
let mockDesignWorks: DesignWork[] = [];
let mockDesignAttachments: DesignAttachment[] = [];
let mockCommunicationLogs: CommunicationLog[] = [];
let mockProductionWorkflows: ProductionWorkflow[] = [];
let mockDispatchWorks: DispatchWork[] = [];

// Design Work Functions
export const getDesignWork = (enquiryId: string): DesignWork | undefined => {
  return mockDesignWorks.find(dw => dw.enquiry_id === enquiryId);
};

export const updateDesignWork = async (enquiryId: string, designWork: Partial<DesignWork>): Promise<void> => {
  const existing = mockDesignWorks.find(dw => dw.enquiry_id === enquiryId);
  if (existing) {
    mockDesignWorks = mockDesignWorks.map(dw => 
      dw.enquiry_id === enquiryId ? { ...dw, ...designWork } : dw
    );
  } else {
    const newWork: DesignWork = {
      id: `dw-${Date.now()}`,
      enquiry_id: enquiryId,
      designer_id: designWork.designer_id || '',
      client_requirements: designWork.client_requirements || '',
      designer_notes: designWork.designer_notes || '',
      design_status: designWork.design_status || 'pending',
      completed_at: designWork.completed_at || null,
      created_at: new Date().toISOString()
    };
    mockDesignWorks.push(newWork);
  }
};

export const getDesignAttachments = (enquiryId: string): DesignAttachment[] => {
  return mockDesignAttachments.filter(att => att.enquiry_id === enquiryId);
};

export const updateDesignAttachments = async (enquiryId: string, attachments: DesignAttachment[]): Promise<void> => {
  mockDesignAttachments = mockDesignAttachments.filter(att => att.enquiry_id !== enquiryId);
  mockDesignAttachments.push(...attachments);
};

// Communication Logs Functions
export const getCommunicationLogs = (enquiryId: string): CommunicationLog[] => {
  return mockCommunicationLogs
    .filter(log => log.enquiry_id === enquiryId)
    .sort((a, b) => new Date(b.communication_date).getTime() - new Date(a.communication_date).getTime());
};

export const addCommunicationLog = async (enquiryId: string, log: Partial<CommunicationLog>): Promise<void> => {
  const user = getUserById(log.logged_by || '');
  const newLog: CommunicationLog = {
    id: `comm-${Date.now()}`,
    enquiry_id: enquiryId,
    logged_by: log.logged_by || '',
    logged_by_name: user?.name,
    communication_type: log.communication_type || 'note',
    subject: log.subject || '',
    message: log.message || '',
    client_response: log.client_response,
    communication_date: log.communication_date || new Date().toISOString(),
    created_at: new Date().toISOString()
  };
  mockCommunicationLogs.push(newLog);
};

// Production Workflow Functions
export const getProductionWorkflow = (enquiryId: string): ProductionWorkflow | undefined => {
  return mockProductionWorkflows.find(pw => pw.enquiry_id === enquiryId);
};

export const updateProductionWorkflow = async (
  enquiryId: string, 
  updates: Partial<ProductionWorkflow>
): Promise<void> => {
  const existing = mockProductionWorkflows.find(pw => pw.enquiry_id === enquiryId);
  if (existing) {
    mockProductionWorkflows = mockProductionWorkflows.map(pw =>
      pw.enquiry_id === enquiryId ? { ...pw, ...updates } : pw
    );
  } else {
    const enquiry = mockEnquiries.find(e => e.id === enquiryId);
    if (!enquiry) return;
    
    const newWorkflow: ProductionWorkflow = {
      id: `pw-${Date.now()}`,
      enquiry_id: enquiryId,
      production_lead: updates.production_lead || enquiry.current_assigned_person,
      production_lead_name: getUserById(updates.production_lead || enquiry.current_assigned_person)?.name,
      status: updates.status || 'in_progress',
      current_step: updates.current_step || null,
      tasks: updates.tasks || [],
      started_at: updates.started_at || new Date().toISOString(),
      completed_at: updates.completed_at || null,
      created_at: new Date().toISOString()
    };
    mockProductionWorkflows.push(newWorkflow);
  }
};

// Dispatch Work Functions
export const getDispatchWork = (enquiryId: string): DispatchWork | undefined => {
  return mockDispatchWorks.find(dw => dw.enquiry_id === enquiryId);
};

export const updateDispatchWork = async (enquiryId: string, dispatchWork: Partial<DispatchWork>): Promise<void> => {
  const existing = mockDispatchWorks.find(dw => dw.enquiry_id === enquiryId);
  const enquiry = mockEnquiries.find(e => e.id === enquiryId);
  if (!enquiry) return;
  
  if (existing) {
    mockDispatchWorks = mockDispatchWorks.map(dw =>
      dw.enquiry_id === enquiryId ? { ...dw, ...dispatchWork } : dw
    );
  } else {
    const newDispatch: DispatchWork = {
      id: `disp-${Date.now()}`,
      enquiry_id: enquiryId,
      dispatch_assigned_to: dispatchWork.dispatch_assigned_to || enquiry.current_assigned_person,
      dispatch_assigned_to_name: getUserById(dispatchWork.dispatch_assigned_to || enquiry.current_assigned_person)?.name,
      tracking_number: dispatchWork.tracking_number || null,
      dispatch_date: dispatchWork.dispatch_date || null,
      estimated_delivery_date: dispatchWork.estimated_delivery_date || null,
      status: dispatchWork.status || 'pending',
      notes: dispatchWork.notes || '',
      created_at: new Date().toISOString()
    };
    mockDispatchWorks.push(newDispatch);
  }
};

// Workflow transition functions
export const assignToDesigner = async (
  enquiryId: string, 
  designerId: string, 
  newStatus: EnquiryStatus = 'Design',
  salesPersonId?: string
): Promise<void> => {
  const enquiry = mockEnquiries.find(e => e.id === enquiryId);
  if (!enquiry) return;
  
  const designer = getUserById(designerId);
  const salesPerson = salesPersonId ? getUserById(salesPersonId) : getUserById(enquiry.enquiry_by);
  
  const enquiryIndex = mockEnquiries.findIndex(e => e.id === enquiryId);
  mockEnquiries[enquiryIndex] = {
    ...enquiry,
    status: newStatus,
    current_assigned_person: designerId,
    work_assigned_date: new Date().toISOString()
  };
  
  mockEnquiryHistory.push({
    id: `hist-${Date.now()}`,
    enquiry_id: enquiryId,
    status: newStatus,
    status_changed_date_time: new Date().toISOString(),
    assigned_person: designerId,
    assigned_person_name: designer?.name,
    note: `Assigned to designer ${designer?.name} by salesperson ${salesPerson?.name}`
  });
};

// Return task to salesperson after designer completes
export const returnDesignToSalesperson = async (enquiryId: string): Promise<void> => {
  const enquiry = mockEnquiries.find(e => e.id === enquiryId);
  if (!enquiry) return;
  
  const salesPerson = getUserById(enquiry.enquiry_by);
  const now = new Date().toISOString();
  
  const enquiryIndex = mockEnquiries.findIndex(e => e.id === enquiryId);
  mockEnquiries[enquiryIndex] = {
    ...enquiry,
    status: 'BOQ', // Back to salesperson for review
    current_assigned_person: enquiry.enquiry_by, // Return to salesperson
    work_assigned_date: now
  };
  
  mockEnquiryHistory.push({
    id: `hist-${Date.now()}`,
    enquiry_id: enquiryId,
    status: 'BOQ',
    status_changed_date_time: now,
    assigned_person: enquiry.enquiry_by,
    assigned_person_name: salesPerson?.name,
    note: 'Design work completed, returned to salesperson for review'
  });
};

export const confirmOrderAndAssignToProduction = async (
  enquiryId: string,
  salesPersonId: string,
  productionUserId?: string
): Promise<void> => {
  const enquiry = mockEnquiries.find(e => e.id === enquiryId);
  if (!enquiry) return;
  
  const salesPerson = getUserById(salesPersonId);
  const productionUsers = getUsersByRole('production');
  const productionUser = productionUserId 
    ? getUserById(productionUserId) 
    : productionUsers[0];
  
  if (!productionUser) return;
  
  const enquiryIndex = mockEnquiries.findIndex(e => e.id === enquiryId);
  const now = new Date().toISOString();
  mockEnquiries[enquiryIndex] = {
    ...enquiry,
    status: 'ReadyForProduction',
    order_number: enquiry.order_number || `ORD-${Date.now()}`,
    order_date: enquiry.order_date || now,
    current_assigned_person: productionUser.id,
    work_assigned_date: now
  };
  
  const initialTask: ProductionTask = {
    id: `task-${Date.now()}`,
    enquiry_id: enquiryId,
    step: 'cutting',
    assigned_to: productionUser.id,
    assigned_to_name: productionUser.name,
    status: 'pending',
    started_at: null,
    completed_at: null,
    notes: '',
    created_at: now
  };
  
  await updateProductionWorkflow(enquiryId, {
    production_lead: productionUser.id,
    status: 'in_progress',
    current_step: 'cutting',
    tasks: [initialTask],
    started_at: now
  });
  
  mockEnquiryHistory.push({
    id: `hist-${Date.now()}`,
    enquiry_id: enquiryId,
    status: 'ReadyForProduction',
    status_changed_date_time: now,
    assigned_person: productionUser.id,
    assigned_person_name: productionUser.name,
    note: `Order confirmed and assigned to production team`
  });
};

export const completeProduction = async (enquiryId: string): Promise<void> => {
  const enquiry = mockEnquiries.find(e => e.id === enquiryId);
  if (!enquiry) return;
  
  const productionWorkflow = getProductionWorkflow(enquiryId);
  if (!productionWorkflow) return;
  
  await updateProductionWorkflow(enquiryId, {
    status: 'completed',
    completed_at: new Date().toISOString()
  });
  
  const enquiryIndex = mockEnquiries.findIndex(e => e.id === enquiryId);
  const salesPerson = getUserById(enquiry.enquiry_by);
  const now = new Date().toISOString();
  
  // Return to salesperson for dispatch assignment
  mockEnquiries[enquiryIndex] = {
    ...enquiry,
    status: 'ReadyForDispatch',
    current_assigned_person: enquiry.enquiry_by, // Return to salesperson
    work_assigned_date: now
  };
  
  mockEnquiryHistory.push({
    id: `hist-${Date.now()}`,
    enquiry_id: enquiryId,
    status: 'ReadyForDispatch',
    status_changed_date_time: now,
    assigned_person: enquiry.enquiry_by,
    assigned_person_name: salesPerson?.name,
    note: 'Production completed, returned to salesperson for dispatch assignment'
  });
};

export const completeDispatch = async (enquiryId: string): Promise<void> => {
  const enquiry = mockEnquiries.find(e => e.id === enquiryId);
  if (!enquiry) return;
  
  await updateDispatchWork(enquiryId, {
    status: 'dispatched'
  });
  
  const enquiryIndex = mockEnquiries.findIndex(e => e.id === enquiryId);
  const now = new Date().toISOString();
  
  mockEnquiries[enquiryIndex] = {
    ...enquiry,
    status: 'Dispatched',
    work_assigned_date: now
  };
  
  mockEnquiryHistory.push({
    id: `hist-${Date.now()}`,
    enquiry_id: enquiryId,
    status: 'Dispatched',
    status_changed_date_time: now,
    assigned_person: enquiry.current_assigned_person,
    assigned_person_name: getUserById(enquiry.current_assigned_person)?.name,
    note: 'Order dispatched to client'
  });
};

export const getUsersByRole = (role: UserRole): User[] => {
  return mockUsers.filter(user => user.role === role);
};

// Quotation helper functions
export const getQuotationsByEnquiry = (enquiryId: string) => {
  // Mock quotations - in real app, fetch from API
  const mockQuotations = [
    { id: 'quo-1', number: 'QUO-2024-001', enquiry_id: 'enq-001', date: '2024-10-01', amount: 1250000, status: 'accepted' },
    { id: 'quo-2', number: 'QUO-2024-002', enquiry_id: 'enq-002', date: '2024-10-05', amount: 875000, status: 'pending' },
  ];
  return mockQuotations.filter(q => q.enquiry_id === enquiryId);
};
