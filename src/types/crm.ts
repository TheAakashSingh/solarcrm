export type UserRole = 'superadmin' | 'director' | 'salesman' | 'designer' | 'production' | 'purchase';

export type EnquiryStatus = 
  | 'Enquiry'
  | 'Design'
  | 'BOQ'
  | 'ReadyForProduction'
  | 'PurchaseWaiting'
  | 'InProduction'
  | 'ProductionComplete'
  | 'Hotdip'
  | 'ReadyForDispatch'
  | 'Dispatched';

export type MaterialType = 'Aluminium' | 'GI' | 'GP' | 'BOS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  workflow_status: EnquiryStatus[]; // Statuses this user handles
  avatar?: string;
  created_at: string;
}

export interface Client {
  id: string;
  client_name: string;
  email: string;
  contact_no: string;
  contact_person: string;
  address: string;
  created_at: string;
}

export interface Enquiry {
  id: string;
  enquiry_num: string;
  order_number: string | null;
  client_id: string;
  client?: Client;
  material_type: MaterialType;
  enquiry_detail: string;
  enquiry_by: string; // User ID of salesman
  enquiry_by_user?: User;
  enquiry_amount: number;
  purchase_detail: string | null;
  enquiry_date: string;
  order_date: string | null;
  expected_dispatch_date: string | null;
  status: EnquiryStatus;
  current_assigned_person: string; // User ID
  assigned_user?: User;
  work_assigned_date: string;
  delivery_address: string;
  created_at: string;
}

export interface EnquiryStatusHistory {
  id: string;
  enquiry_id: string;
  status: EnquiryStatus;
  status_changed_date_time: string;
  assigned_person: string; // User ID
  assigned_person_name?: string;
  note: string;
}

// Design-related interfaces
export interface DesignAttachment {
  id: string;
  enquiry_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  uploaded_by: string; // User ID
  uploaded_at: string;
}

export interface DesignWork {
  id: string;
  enquiry_id: string;
  designer_id: string;
  designer_notes: string;
  client_requirements: string;
  design_status: 'pending' | 'in_progress' | 'completed';
  completed_at: string | null;
  created_at: string;
}

// Communication logs
export interface CommunicationLog {
  id: string;
  enquiry_id: string;
  logged_by: string; // User ID
  logged_by_name?: string;
  communication_type: 'call' | 'email' | 'meeting' | 'note';
  subject: string;
  message: string;
  communication_date: string;
  client_response?: string;
  created_at: string;
}

// Production workflow
export type ProductionStep = 
  | 'cutting'
  | 'welding'
  | 'fabrication'
  | 'assembly'
  | 'quality_check'
  | 'packaging';

export interface ProductionTask {
  id: string;
  enquiry_id: string;
  step: ProductionStep;
  assigned_to: string; // User ID
  assigned_to_name?: string;
  status: 'pending' | 'in_progress' | 'completed';
  started_at: string | null;
  completed_at: string | null;
  notes: string;
  created_at: string;
}

export interface ProductionWorkflow {
  id: string;
  enquiry_id: string;
  production_lead: string; // User ID
  production_lead_name?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  current_step: ProductionStep | null;
  tasks: ProductionTask[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// Dispatch workflow
export interface DispatchWork {
  id: string;
  enquiry_id: string;
  dispatch_assigned_to: string; // User ID
  dispatch_assigned_to_name?: string;
  tracking_number: string | null;
  dispatch_date: string | null;
  estimated_delivery_date: string | null;
  status: 'pending' | 'dispatched' | 'delivered';
  notes: string;
  created_at: string;
}

export const STATUS_LIST: EnquiryStatus[] = [
  'Enquiry',
  'Design',
  'BOQ',
  'ReadyForProduction',
  'PurchaseWaiting',
  'InProduction',
  'ProductionComplete',
  'Hotdip',
  'ReadyForDispatch',
  'Dispatched'
];

export const MATERIAL_TYPES: MaterialType[] = ['Aluminium', 'GI', 'GP', 'BOS'];

export const STATUS_COLORS: Record<EnquiryStatus, string> = {
  'Enquiry': 'status-enquiry',
  'Design': 'status-design',
  'BOQ': 'status-boq',
  'ReadyForProduction': 'status-ready-production',
  'PurchaseWaiting': 'status-purchase',
  'InProduction': 'status-in-production',
  'ProductionComplete': 'status-production-complete',
  'Hotdip': 'status-hotdip',
  'ReadyForDispatch': 'status-ready-dispatch',
  'Dispatched': 'status-dispatched'
};

export const ROLE_STATUS_MAPPING: Record<UserRole, EnquiryStatus[]> = {
  'superadmin': STATUS_LIST,
  'director': STATUS_LIST, // Director has access to all statuses
  'salesman': STATUS_LIST, // Salesperson has access to all statuses to manage workflow
  'designer': ['Design'],
  'production': ['ReadyForProduction', 'InProduction', 'ProductionComplete', 'Hotdip', 'ReadyForDispatch', 'Dispatched'],
  'purchase': ['PurchaseWaiting']
};

// Role hierarchy - who can manage whom
export const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  'superadmin': ['superadmin', 'director', 'salesman', 'designer', 'production', 'purchase'], // Can manage all
  'director': ['director', 'salesman', 'designer', 'production', 'purchase'], // Can manage all except superadmin
  'salesman': [], // Cannot manage anyone
  'designer': [], // Cannot manage anyone
  'production': [], // Cannot manage anyone
  'purchase': [] // Cannot manage anyone
};
