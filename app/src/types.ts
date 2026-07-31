export type UserRole = 'admin' | 'manager' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type VendorCategory = 'outreach' | 'network' | 'unassigned' | 'active';

export type WorkflowStage = 
  | 'sourced' 
  | 'nda_pending' 
  | 'nda_verified' 
  | 'outreach_sent' 
  | 'intake_complete' 
  | 'testing_assigned' 
  | 'grading' 
  | 'xtrf_sync' 
  | 'approved';

export type TestGrade = 'pass' | 'fail' | 'pass_caution';

export type VendorStatus = 'pending' | 'approved' | 'rejected';

export interface VendorProfile {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  secondaryEmail?: string;
  phone?: string;
  isGmail: boolean;
  languages: string[]; // e.g. ["Spanish -> English", "French -> English"]
  services: string[];
  classificationTier: 1 | 2 | 3;
  source: 'external' | 'xtrf';
  category: VendorCategory;
  stage: WorkflowStage;
  mlcHourlyRate: number; // Client Charge
  adjustedRate: number;  // System Offer
  confirmedRate: number; // Agreed/Negotiated
  status: VendorStatus; // high-level workflow status
  submittedAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  stage: WorkflowStage;
  lastUpdated: string;
}

export interface NotificationLog {
  id: string;
  vendorId: string;
  email: string;
  subject: string;
  status: 'queued' | 'sent' | 'failed';
  sentAt?: string;
  error?: string;
}

export interface TestRecord {
  id: string;
  vendorId: string;
  assignmentLink: string;
  projectNumber: string;
  deadline: string;
  status: 'assigned' | 'in_progress' | 'completed';
  graderId: string;
  score?: 1 | 2 | 3; // Numerical 1-3
  grade?: TestGrade; // Pass, Fail, Pass with Caution
  internalNotes?: string;
  completedAt?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetId: string;
  timestamp: string;
  details: string;
}
