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
  | 'outreach' 
  | 'nda' 
  | 'ready_for_testing' 
  | 'in_testing' 
  | 'xtrf_onboarding' 
  | 'ready_for_pm' 
  | 'dnu';

export type TestGrade = 'pass' | 'fail' | 'pass_caution';

export interface WorkingLanguage {
  language: string;
  proficiency: 'native' | 'bilingual' | 'professional' | 'working';
}

export interface VendorProfile {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  secondaryEmail?: string;
  phone?: string;
  isGmail: boolean;
  workingLanguages: WorkingLanguage[];
  services: string[];
  classificationTier: 1 | 2 | 3;
  source: 'external' | 'xtrf';
  category: VendorCategory;
  stage: WorkflowStage;
  mlcHourlyRate: number; // Client Charge
  adjustedRate: number;  // System Offer
  confirmedRate: number; // Agreed/Negotiated
  status: string; // custom status value mapping
  submittedAt: string;
  updatedAt: string;
  mtPeExperience?: '1-3' | '3-5' | '5+';
  prozProfile?: string;
  linkedInProfile?: string;
  resumeName?: string;
  resumeUrl?: string;
  hoursAvailable?: number;
  hasSignedNda: boolean;
  ndaUrl?: string; // Link to the signed NDA
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  stage: WorkflowStage;
  lastUpdated: string;
}

export interface WorkflowAction {
  id: string;
  name: string;
  triggerStage: WorkflowStage;
  field: string; // e.g. "isGmail" or "hasSignedNda"
  operator: '==' | '!=' | 'empty' | 'not_empty';
  value: string; // e.g. "false" or "true"
  actionType: 'send_email' | 'update_status';
  templateId?: string; // If send_email
  updateValue?: string; // If update_status
  recipientType: 'vendor' | 'mlc' | 'both'; // Target of the email
  isActive: boolean;
}

export interface StatusConfig {
  key: string;
  color: string; // e.g. "blue" | "red" | "yellow" | "green" | "purple" | "indigo" | "pink"
}

export interface TestingModeConfig {
  enabled: boolean;
  recipientEmail: string;
}

export interface SystemConfig {
  languages: string[];
  statuses: StatusConfig[];
  testingMode: TestingModeConfig;
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
