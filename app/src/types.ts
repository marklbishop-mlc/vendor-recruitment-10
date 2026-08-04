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
  testRequired?: boolean;
  testStatus?: 'untested' | 'pending' | 'passed' | 'failed' | 'waived';
  testId?: string;
  testGrade?: TestGrade;
  score?: number;
  evaluatedAt?: string;
  evaluatorName?: string;
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
  ndaSignedAt?: string;
  ndaSignatureName?: string;
  stageStatus?: string; // Stage progress key e.g. 'started', 'completed', 'failed', 'non_responsive', or dynamic key
  parentVendorId?: string; // Reference to original candidate profile if split by language
  splitLanguage?: string;  // Specific language pair for split candidate profile
  applicationId?: string;  // Application Form ID candidate applied through
  applicationName?: string; // Application Form Name candidate applied through
}

export interface ApplicationConfig {
  id: string;
  slug: string;               // Public clean key (e.g. "app-8f2a9")
  name: string;               // Internal campaign name (e.g. "YouTube Localization Q3")
  description?: string;        // Internal notes/description
  isActive: boolean;
  
  // Form Behavior Controls
  allowedServices: string[];  // e.g. ["Translation", "Editing"] or ["all"]
  serviceMode: 'single' | 'multiple';
  allowedLanguages: string[]; // e.g. ["Spanish (ES)", "Spanish (MX)"] or ["all"]
  collectRates: boolean;      // true / false
  requireResume?: boolean;
  requireXtrfId?: boolean;
  
  // Custom Copy
  portalTitle?: string;
  portalSubtitle?: string;
  
  // Audit & Analytics
  submissionsCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  stage?: WorkflowStage;
  triggerStage?: WorkflowStage;
  lastUpdated: string;
}

export interface WorkflowAction {
  id: string;
  name: string;
  triggerStage: WorkflowStage;
  triggerStatus?: string; // When rule triggers e.g. 'started', 'completed', 'failed', 'non_responsive', or 'any'
  field?: string; // Optional e.g. "isGmail" or "hasSignedNda"
  operator: '==' | '!=' | 'empty' | 'not_empty' | 'always';
  value?: string; // Optional target value
  actionType?: 'send_email' | 'update_status' | 'both'; // Optional legacy field
  templateId?: string; // Optional email template to send ('none' or template ID)
  updateValue?: string; // Legacy alias for updateStatus
  updateStatus?: string; // Optional candidate status to update ('none' or status key)
  updateStage?: WorkflowStage | 'none'; // Optional workflow stage to update
  updateStageStatus?: string; // Optional stage status to update
  autoAdvanceStage?: WorkflowStage | 'none'; // Alias for updateStage
  recipientType: 'vendor' | 'mlc' | 'both'; // Target of the email
  isActive: boolean;
}

export interface WorkflowStageConfig {
  id: string;
  name: string;
  description: string;
  order: number;
}

export interface StatusConfig {
  key: string;
  color: string; // e.g. "blue" | "red" | "yellow" | "green" | "purple" | "indigo" | "pink"
}

export interface StageProgressConfig {
  key: string;   // e.g. "started", "completed", "failed", "non_responsive"
  label: string; // e.g. "Started", "Completed", "Failed", "Non Responsive"
  color: string; // e.g. "yellow", "green", "red", "purple", "blue", "indigo", "pink", "gray"
}

export const DEFAULT_STAGE_PROGRESS_OPTIONS: StageProgressConfig[] = [
  { key: 'started', label: 'Started', color: 'yellow' },
  { key: 'completed', label: 'Completed', color: 'green' },
  { key: 'failed', label: 'Failed', color: 'red' },
  { key: 'non_responsive', label: 'Non Responsive', color: 'purple' }
];

export const getStageProgressStyle = (color?: string, key?: string) => {
  const c = (color || '').toLowerCase();
  const k = (key || '').toLowerCase();
  
  if (c === 'green' || c === 'emerald' || k === 'completed') {
    return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';
  }
  if (c === 'red' || c === 'rose' || k === 'failed') {
    return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25';
  }
  if (c === 'purple' || k === 'non_responsive') {
    return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25';
  }
  if (c === 'blue' || c === 'indigo') {
    return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25';
  }
  if (c === 'pink') {
    return 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/25';
  }
  if (c === 'gray' || c === 'slate') {
    return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/25';
  }
  return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25';
};

export const getStageProgressTextColor = (color?: string, key?: string) => {
  const c = (color || '').toLowerCase();
  const k = (key || '').toLowerCase();
  
  if (c === 'green' || c === 'emerald' || k === 'completed') return 'text-emerald-500 dark:text-emerald-400';
  if (c === 'red' || c === 'rose' || k === 'failed') return 'text-rose-500 dark:text-rose-400';
  if (c === 'purple' || k === 'non_responsive') return 'text-purple-500 dark:text-purple-400';
  if (c === 'blue' || c === 'indigo') return 'text-blue-500 dark:text-blue-400';
  if (c === 'pink') return 'text-pink-500 dark:text-pink-400';
  if (c === 'gray' || c === 'slate') return 'text-slate-500 dark:text-slate-400';
  return 'text-amber-500 dark:text-amber-400';
};

export interface TestingModeConfig {
  enabled: boolean;
  recipientEmails: string[];
}

export interface SlaNudgeConfig {
  enabled: boolean;
  mode: 'automated' | 'one_click';
  ndaWaitDays: number;
  maxNudges: number;
}

export interface LanguageConfig {
  name: string;        // e.g. "Spanish"
  code: string;        // ISO code e.g. "es" or "es-ES"
  shortName?: string;  // Short abbreviation e.g. "SPA"
  isActive: boolean;   // If false, hidden from candidate dropdowns
  isPriority?: boolean;// If true, displayed at top of language lists
}

export interface SystemConfig {
  languages: (string | LanguageConfig)[];
  statuses: StatusConfig[];
  stageProgressOptions?: StageProgressConfig[];
  stages: WorkflowStageConfig[];
  testingMode: TestingModeConfig;
  slaNudges: SlaNudgeConfig;
}

export function normalizeLanguageList(rawList: (string | LanguageConfig)[]): LanguageConfig[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((item) => {
    if (typeof item === 'string') {
      return {
        name: item,
        code: item.substring(0, 2).toLowerCase(),
        shortName: item.substring(0, 3).toUpperCase(),
        isActive: true,
        isPriority: false,
      };
    }
    return {
      name: item.name || '',
      code: item.code || (item.name ? item.name.substring(0, 2).toLowerCase() : ''),
      shortName: item.shortName || (item.name ? item.name.substring(0, 3).toUpperCase() : ''),
      isActive: item.isActive !== false,
      isPriority: !!item.isPriority,
    };
  });
}

export function getActiveSortedLanguages(rawList: (string | LanguageConfig)[]): LanguageConfig[] {
  const normalized = normalizeLanguageList(rawList);
  const active = normalized.filter((l) => l.isActive);
  return active.sort((a, b) => {
    if (a.isPriority && !b.isPriority) return -1;
    if (!a.isPriority && b.isPriority) return 1;
    return a.name.localeCompare(b.name);
  });
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
  vendorName?: string;
  language?: string; // Specific language pair tested e.g. "Spanish"
  service?: string;
  assignmentLink: string;
  projectNumber: string;
  deadline: string;
  status: 'assigned' | 'in_progress' | 'completed';
  graderId: string;
  score?: number; // Numerical score
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
