export type UserRole = 'admin' | 'recruiter' | 'vendor';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type VendorStatus = 'pending' | 'approved' | 'rejected';

export interface VendorProfile {
  id: string; // Maps to user uid
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  status: VendorStatus;
  services: string[];
  languages: string[];
  hourlyRate: number;
  rating?: number;
  submittedAt: string;
  updatedAt: string;
}

export type ApplicationStatus = 'submitted' | 'under_review' | 'accepted' | 'declined';

export interface RecruitmentApplication {
  id: string;
  vendorId: string;
  jobTitle: string;
  status: ApplicationStatus;
  notes?: string;
  appliedAt: string;
  updatedAt: string;
}
