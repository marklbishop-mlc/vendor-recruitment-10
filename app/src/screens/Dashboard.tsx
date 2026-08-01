import React, { useState, useMemo, useEffect } from 'react';
import type { VendorProfile, WorkflowStage, WorkingLanguage, StatusConfig, WorkflowAction, EmailTemplate, TestRecord } from '../types';
import { 
  Plus, Search, Filter, ShieldAlert, X, 
  FileText, Check, UploadCloud, Grid, List, ArrowUpDown,
  FileCheck, Info, ExternalLink, Edit2, AlertTriangle, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Mock candidates list matching expanded profile attributes with new 7 stages
const INITIAL_VENDORS_MOCK: VendorProfile[] = [
  {
    id: 'v-1',
    companyName: 'Apex Translations LLC',
    contactName: 'Carlos Santillan',
    email: 'carlos@apextrans.com',
    phone: '+1 (555) 123-4567',
    status: 'approved',
    category: 'active',
    stage: 'ready_for_pm',
    services: ['Translation', 'Localization'],
    workingLanguages: [
      { language: 'Spanish', proficiency: 'native' },
      { language: 'English', proficiency: 'professional' }
    ],
    classificationTier: 1,
    source: 'external',
    mlcHourlyRate: 45,
    adjustedRate: 42,
    confirmedRate: 45,
    isGmail: false,
    secondaryEmail: 'carlos.santillan.mlc@gmail.com',
    mtPeExperience: '5+',
    prozProfile: 'https://proz.com/profile/carlos-trans',
    linkedInProfile: 'https://linkedin.com/in/carlos-santillan',
    hoursAvailable: 35,
    hasSignedNda: true,
    ndaUrl: 'https://mlconnections.com/nda/verify-cs-987.pdf',
    resumeName: 'carlos_resume_2026.pdf',
    submittedAt: '2026-07-20T10:00:00Z',
    updatedAt: '2026-07-20T10:00:00Z'
  },
  {
    id: 'v-2',
    companyName: '',
    contactName: 'Hana Tanaka',
    email: 'hana@lingoglobe.jp',
    phone: '+81 3 1234 5678',
    status: 'pending',
    category: 'unassigned',
    stage: 'in_testing',
    services: ['Interpretation', 'Subtitling'],
    workingLanguages: [
      { language: 'Japanese', proficiency: 'native' },
      { language: 'English', proficiency: 'professional' }
    ],
    classificationTier: 2,
    source: 'xtrf',
    mlcHourlyRate: 60,
    adjustedRate: 50,
    confirmedRate: 0,
    isGmail: true,
    mtPeExperience: '3-5',
    hoursAvailable: 20,
    hasSignedNda: true,
    ndaUrl: 'https://mlconnections.com/nda/verify-ht-554.pdf',
    resumeName: 'hana_tanaka_cv.docx',
    submittedAt: '2026-07-28T14:30:00Z',
    updatedAt: '2026-07-28T14:30:00Z'
  },
  {
    id: 'v-3',
    companyName: 'Nordic Words',
    contactName: 'Freja Lindstrom',
    email: 'freja@nordicwords.se',
    phone: '+46 8 123 45 67',
    status: 'pending',
    category: 'outreach',
    stage: 'outreach',
    services: ['Translation', 'Proofreading'],
    workingLanguages: [
      { language: 'Swedish', proficiency: 'native' },
      { language: 'English', proficiency: 'professional' }
    ],
    classificationTier: 1,
    source: 'external',
    mlcHourlyRate: 50,
    adjustedRate: 45,
    confirmedRate: 0,
    isGmail: true,
    mtPeExperience: '1-3',
    hoursAvailable: 15,
    hasSignedNda: false,
    submittedAt: '2026-07-30T09:15:00Z',
    updatedAt: '2026-07-30T09:15:00Z'
  },
  {
    id: 'v-4',
    companyName: '',
    contactName: 'Amara Diop',
    email: 'amara@globalvoice.sn',
    phone: '+221 33 123 45 67',
    status: 'pending',
    category: 'network',
    stage: 'nda',
    services: ['Transcription'],
    workingLanguages: [
      { language: 'Wolof', proficiency: 'native' },
      { language: 'French', proficiency: 'bilingual' }
    ],
    classificationTier: 3,
    source: 'xtrf',
    mlcHourlyRate: 35,
    adjustedRate: 30,
    confirmedRate: 32,
    isGmail: false,
    secondaryEmail: 'amara.diop.work@gmail.com',
    mtPeExperience: '5+',
    prozProfile: 'https://proz.com/profile/amara-diop',
    hoursAvailable: 40,
    hasSignedNda: true,
    ndaUrl: 'https://mlconnections.com/nda/verify-ad-122.pdf',
    resumeName: 'amara_diop_resume.pdf',
    submittedAt: '2026-07-15T08:00:00Z',
    updatedAt: '2026-07-18T16:00:00Z'
  }
];

export const STAGE_LABELS: Record<WorkflowStage, string> = {
  outreach: 'Outreach',
  nda: 'NDA',
  ready_for_testing: 'Ready for Testing',
  in_testing: 'In Testing',
  xtrf_onboarding: 'XTRF Onboarding',
  ready_for_pm: 'Ready for PM',
  dnu: 'DNU'
};



const STATUS_COLORS_MAP: Record<string, string> = {
  blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20',
  red: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20',
  yellow: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
  green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  purple: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20',
  indigo: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  pink: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/20',
  gray: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20'
};

export const Dashboard: React.FC = () => {
  
  // Settings configurations
  const [activeLanguages, setActiveLanguages] = useState<string[]>([]);
  const [activeStatuses, setActiveStatuses] = useState<StatusConfig[]>([]);

  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [workflowActions, setWorkflowActions] = useState<WorkflowAction[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  
  // Slide-out drawers
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Default view is now table view
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  
  // Table sorting states
  const [sortField, setSortField] = useState<keyof VendorProfile>('contactName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Side Drawers / Modals
  const [isAddOpen, setIsAddOpen] = useState(false);

  // XTRF import click banner alert
  const [showXtrfAlert, setShowXtrfAlert] = useState(false);

  // Form Field States for New Intake
  const [formContactName, setFormContactName] = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSecondaryEmail, setFormSecondaryEmail] = useState('');
  const [formIsGmail, setFormIsGmail] = useState(true);
  const [formPhone, setFormPhone] = useState('');
  const [formHours, setFormHours] = useState('20');
  const [formExperience, setFormExperience] = useState<'1-3' | '3-5' | '5+'>('1-3');
  const [formProz, setFormProz] = useState('');
  const [formLinkedin, setFormLinkedin] = useState('');
  const [formServices, setFormServices] = useState('');
  const [formMlcRate, setFormMlcRate] = useState('45');
  const [formTier, setFormTier] = useState<'1' | '2' | '3'>('2');
  const [formStatus, setFormStatus] = useState('pending');
  const [formNdaUrl, setFormNdaUrl] = useState('');
  
  // Selected multiple languages in form
  const [formLanguages, setFormLanguages] = useState<{ language: string; proficiency: WorkingLanguage['proficiency'] }[]>([]);
  const [selectedLangToAdd, setSelectedLangToAdd] = useState('');
  const [selectedProfToAdd, setSelectedProfToAdd] = useState<WorkingLanguage['proficiency']>('native');

  // Resume Upload simulation
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingName, setUploadingName] = useState('');
  const [uploadedResumeName, setUploadedResumeName] = useState('');

  // Editing Candidate Profile state
  const [editContactName, setEditContactName] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSecondaryEmail, setEditSecondaryEmail] = useState('');
  const [editIsGmail, setEditIsGmail] = useState(true);
  const [editPhone, setEditPhone] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editExperience, setEditExperience] = useState<'1-3' | '3-5' | '5+'>('1-3');
  const [editProz, setEditProz] = useState('');
  const [editLinkedin, setEditLinkedin] = useState('');
  const [editServices, setEditServices] = useState('');
  const [editMlcRate, setEditMlcRate] = useState('');
  const [editTier, setEditTier] = useState<1 | 2 | 3>(2);
  const [editStatus, setEditStatus] = useState('');
  const [editNdaUrl, setEditNdaUrl] = useState('');
  const [editHasSignedNda, setEditHasSignedNda] = useState(false);
  const [editLanguages, setEditLanguages] = useState<{ language: string; proficiency: WorkingLanguage['proficiency'] }[]>([]);
  const [editConfirmedRate, setEditConfirmedRate] = useState('');

  // Validation transition modal states
  const [pendingTransition, setPendingTransition] = useState<{
    vendorId: string;
    targetStage: WorkflowStage;
    actionName: string;
    templateName: string;
    recipientType: string;
  } | null>(null);

  // Load configurations and Firestore collections
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Fetch system configs from Firestore
        const systemConfigSnap = await getDoc(doc(db, 'settings', 'global_config'));
        if (systemConfigSnap.exists()) {
          const config = systemConfigSnap.data();
          if (config.languages) {
            setActiveLanguages(config.languages);
          }
          if (config.statuses) {
            setActiveStatuses(config.statuses);
          }
        } else {
          // Fallback to local storage
          const savedLangs = localStorage.getItem('mlc_settings_languages');
          const savedStatuses = localStorage.getItem('mlc_settings_statuses_v2');
          
          if (savedLangs) {
            setActiveLanguages(JSON.parse(savedLangs));
          } else {
            setActiveLanguages(['English', 'Spanish', 'German', 'Japanese', 'Mandarin', 'Swedish', 'Wolof', 'French', 'Portuguese']);
          }
          
          if (savedStatuses) {
            setActiveStatuses(JSON.parse(savedStatuses));
          } else {
            setActiveStatuses([
              { key: 'pending', color: 'yellow' },
              { key: 'approved', color: 'green' },
              { key: 'rejected', color: 'red' },
              { key: 'on_hold', color: 'blue' },
              { key: 'blacklisted', color: 'purple' },
              { key: 'active', color: 'indigo' }
            ]);
          }
        }

        // 2. Fetch Vendors
        const vendorSnap = await getDocs(collection(db, 'vendors'));
        const vendorList: VendorProfile[] = [];
        vendorSnap.forEach((doc) => {
          vendorList.push(doc.data() as VendorProfile);
        });
        if (vendorList.length > 0) {
          setVendors(vendorList);
        } else {
          // Seed
          for (const v of INITIAL_VENDORS_MOCK) {
            await setDoc(doc(db, 'vendors', v.id), v);
          }
          setVendors(INITIAL_VENDORS_MOCK);
        }

        // 3. Fetch Trigger Rules
        const actionSnap = await getDocs(collection(db, 'workflow_actions'));
        const actionList: WorkflowAction[] = [];
        actionSnap.forEach((doc) => {
          actionList.push(doc.data() as WorkflowAction);
        });
        if (actionList.length > 0) {
          setWorkflowActions(actionList);
        }

        // 4. Fetch Templates
        const templateSnap = await getDocs(collection(db, 'templates'));
        const templateList: EmailTemplate[] = [];
        templateSnap.forEach((doc) => {
          templateList.push(doc.data() as EmailTemplate);
        });
        if (templateList.length > 0) {
          setTemplates(templateList);
        }
      } catch (err) {
        console.error("Dashboard failed to load database collections", err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (activeLanguages.length > 0 && !selectedLangToAdd) {
      setSelectedLangToAdd(activeLanguages[0]);
    }
  }, [activeLanguages, selectedLangToAdd]);

  const handleAddLanguageToForm = () => {
    if (!selectedLangToAdd) return;
    if (formLanguages.some((l) => l.language === selectedLangToAdd)) return;
    
    setFormLanguages((prev) => [
      ...prev, 
      { language: selectedLangToAdd, proficiency: selectedProfToAdd }
    ]);
  };

  const handleRemoveLanguageFromForm = (langName: string) => {
    setFormLanguages((prev) => prev.filter((l) => l.language !== langName));
  };

  const handleAddLanguageToEdit = (lang: string, prof: WorkingLanguage['proficiency']) => {
    if (editLanguages.some((l) => l.language === lang)) return;
    setEditLanguages((prev) => [...prev, { language: lang, proficiency: prof }]);
  };

  const handleRemoveLanguageFromEdit = (langName: string) => {
    setEditLanguages((prev) => prev.filter((l) => l.language !== langName));
  };

  const simulateResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingName(file.name);
    setUploadProgress(10);
    
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadedResumeName(file.name);
          setUploadingName('');
          return 100;
        }
        return prev + 30;
      });
    }, 200);
  };



  // Stage change trigger with validation check
  const handleStageChangeRequest = (vendorId: string, nextStage: WorkflowStage) => {
    const candidate = vendors.find((v) => v.id === vendorId);
    if (!candidate) return;

    // Look for matching action rule triggered on nextStage
    const matchingAction = workflowActions.find(
      (act) => act.triggerStage === nextStage && act.isActive
    );

    if (matchingAction && matchingAction.actionType === 'send_email') {
      const template = templates.find((t) => t.id === matchingAction.templateId);
      const templateName = template ? template.name : 'Outbound Notification';
      setPendingTransition({
        vendorId,
        targetStage: nextStage,
        actionName: matchingAction.name,
        templateName,
        recipientType: matchingAction.recipientType === 'both' ? 'Vendor & MLC Copy' : matchingAction.recipientType.toUpperCase()
      });
    } else {
      // Direct commit
      commitStageChange(vendorId, nextStage);
    }
  };

  const commitStageChange = async (vendorId: string, nextStage: WorkflowStage) => {
    const existingVendor = vendors.find((v) => v.id === vendorId);
    if (!existingVendor) return;

    let newStatus = existingVendor.status;
    if (nextStage === 'ready_for_pm') {
      newStatus = 'approved';
    }

    const updatedVendor: VendorProfile = {
      ...existingVendor,
      stage: nextStage,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };

    try {
      // Save updated vendor in Firestore
      await setDoc(doc(db, 'vendors', vendorId), updatedVendor);

      // Auto-provision test record if candidate transitions to testing stages
      if (nextStage === 'ready_for_testing' || nextStage === 'in_testing') {
        const testId = `test-${vendorId}`;
        const testDocRef = doc(db, 'tests', testId);
        const testDocSnap = await getDoc(testDocRef);
        if (!testDocSnap.exists()) {
          const newTest: TestRecord = {
            id: testId,
            vendorId: vendorId,
            projectNumber: `PR-${Math.floor(1000 + Math.random() * 9000)}-${vendorId.toUpperCase().slice(-2)}`,
            assignmentLink: `https://mlconnections.com/portal/assess-${vendorId}`,
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'assigned',
            graderId: 'admin'
          };
          await setDoc(testDocRef, newTest);
        }
      }

      // Update state locally
      setVendors((prev) => 
        prev.map((v) => v.id === vendorId ? updatedVendor : v)
      );

      setSelectedVendor((prev) => {
        if (!prev || prev.id !== vendorId) return prev;
        return updatedVendor;
      });

      setPendingTransition(null);
    } catch (err) {
      console.error("Failed to commit stage change to Firestore", err);
      alert("Failed to change stage: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const startEditingVendor = (vendor: VendorProfile) => {
    setEditContactName(vendor.contactName);
    setEditCompanyName(vendor.companyName);
    setEditEmail(vendor.email);
    setEditSecondaryEmail(vendor.secondaryEmail || '');
    setEditIsGmail(vendor.isGmail);
    setEditPhone(vendor.phone || '');
    setEditHours(vendor.hoursAvailable?.toString() || '');
    setEditExperience(vendor.mtPeExperience || '1-3');
    setEditProz(vendor.prozProfile || '');
    setEditLinkedin(vendor.linkedInProfile || '');
    setEditServices(vendor.services.join(', '));
    setEditMlcRate(vendor.mlcHourlyRate.toString());
    setEditTier(vendor.classificationTier);
    setEditStatus(vendor.status);
    setEditNdaUrl(vendor.ndaUrl || '');
    setEditHasSignedNda(vendor.hasSignedNda);
    setEditLanguages([...vendor.workingLanguages]);
    setEditConfirmedRate(vendor.confirmedRate.toString());
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;

    if (!editIsGmail && !editSecondaryEmail.trim()) {
      alert("A secondary Google Account (Gmail/Workspace) email is required when the primary account is an external domain.");
      return;
    }

    const updatedProfile: VendorProfile = {
      ...selectedVendor,
      contactName: editContactName.trim(),
      companyName: editCompanyName.trim(),
      email: editEmail.trim(),
      secondaryEmail: editIsGmail ? undefined : editSecondaryEmail.trim(),
      isGmail: editIsGmail,
      phone: editPhone.trim() || undefined,
      hoursAvailable: parseInt(editHours) || undefined,
      mtPeExperience: editExperience,
      prozProfile: editProz.trim() || undefined,
      linkedInProfile: editLinkedin.trim() || undefined,
      services: editServices.split(',').map((s) => s.trim()).filter(Boolean),
      classificationTier: editTier,
      mlcHourlyRate: parseFloat(editMlcRate) || 0,
      adjustedRate: Math.round((parseFloat(editMlcRate) || 0) * 0.9),
      confirmedRate: parseFloat(editConfirmedRate) || 0,
      status: editStatus,
      ndaUrl: editNdaUrl.trim() || undefined,
      hasSignedNda: editHasSignedNda,
      workingLanguages: editLanguages.length > 0 ? editLanguages : [{ language: 'English', proficiency: 'working' }],
      updatedAt: new Date().toISOString()
    };

    try {
      // Save updated vendor in Firestore
      await setDoc(doc(db, 'vendors', selectedVendor.id), updatedProfile);

      setVendors((prev) => prev.map((v) => v.id === selectedVendor.id ? updatedProfile : v));
      setSelectedVendor(updatedProfile);
      setIsEditing(false);
      alert(`Candidate profile for "${editContactName}" saved successfully.`);
    } catch (err) {
      console.error("Failed to commit profile edit to Firestore", err);
      alert("Failed to save changes: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: secondary email is required if isGmail is false
    if (!formIsGmail && !formSecondaryEmail.trim()) {
      alert("A secondary Google Account (Gmail/Workspace) email is required when the primary account is an external domain.");
      return;
    }

    const newLead: VendorProfile = {
      id: `sourced-${Date.now()}`,
      companyName: formCompanyName.trim(),
      contactName: formContactName.trim(),
      email: formEmail.trim(),
      secondaryEmail: formIsGmail ? undefined : formSecondaryEmail.trim(),
      phone: formPhone.trim() || undefined,
      isGmail: formIsGmail,
      workingLanguages: formLanguages.length > 0 ? formLanguages : [{ language: 'English', proficiency: 'working' }],
      services: formServices.split(',').map((s) => s.trim()).filter(Boolean),
      classificationTier: parseInt(formTier) as 1 | 2 | 3,
      source: 'external',
      category: 'outreach',
      stage: 'outreach',
      mlcHourlyRate: parseFloat(formMlcRate) || 0,
      adjustedRate: Math.round((parseFloat(formMlcRate) || 0) * 0.9),
      confirmedRate: 0,
      status: formStatus,
      hoursAvailable: parseInt(formHours) || undefined,
      mtPeExperience: formExperience,
      prozProfile: formProz.trim() || undefined,
      linkedInProfile: formLinkedin.trim() || undefined,
      ndaUrl: formNdaUrl.trim() || undefined,
      resumeName: uploadedResumeName || undefined,
      hasSignedNda: false,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // Save new vendor in Firestore
      await setDoc(doc(db, 'vendors', newLead.id), newLead);

      setVendors((prev) => [newLead, ...prev]);
      setIsAddOpen(false);
      alert(`Candidate "${formContactName}" registered successfully.`);
    } catch (err) {
      console.error("Failed to save new candidate", err);
      alert("Failed to create candidate: " + (err instanceof Error ? err.message : String(err)));
    }

    // Reset Form fields
    setFormContactName('');
    setFormCompanyName('');
    setFormEmail('');
    setFormSecondaryEmail('');
    setFormIsGmail(true);
    setFormPhone('');
    setFormLanguages([]);
    setFormServices('');
    setFormMlcRate('45');
    setFormTier('2');
    setFormNdaUrl('');
    setUploadedResumeName('');
    setUploadProgress(0);
  };

  // Toggle sorting logic
  const toggleSort = (field: keyof VendorProfile) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter candidates
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchesSearch = 
        v.contactName.toLowerCase().includes(search.toLowerCase()) ||
        v.companyName.toLowerCase().includes(search.toLowerCase()) ||
        v.workingLanguages.some((l) => l.language.toLowerCase().includes(search.toLowerCase())) ||
        v.services.some((s) => s.toLowerCase().includes(search.toLowerCase()));
      
      const matchesStage = stageFilter === 'all' || v.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [vendors, search, stageFilter]);

  // Sort candidates dynamically
  const sortedVendors = useMemo(() => {
    const sorted = [...filteredVendors];
    sorted.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle undefined cases
      if (valA === undefined) return 1;
      if (valB === undefined) return -1;

      // Handle objects/arrays specifically
      if (sortField === 'workingLanguages') {
        valA = a.workingLanguages[0]?.language || '';
        valB = b.workingLanguages[0]?.language || '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredVendors, sortField, sortOrder]);

  // Stage aggregates (funnel count)
  const funnelStats = useMemo(() => {
    const aggregates: Record<WorkflowStage, number> = {
      outreach: 0,
      nda: 0,
      ready_for_testing: 0,
      in_testing: 0,
      xtrf_onboarding: 0,
      ready_for_pm: 0,
      dnu: 0
    };

    vendors.forEach((v) => {
      if (v.stage in aggregates) {
        aggregates[v.stage]++;
      }
    });

    return aggregates;
  }, [vendors]);

  const handleExportCSV = () => {
    const headers = [
      'Company Name', 'Contact Name', 'Email', 'Secondary Email', 'Phone',
      'Services', 'Languages', 'Tier', 'Hourly Rate (Client)', 'Adjusted Rate (Offer)',
      'Confirmed Rate (Negotiated)', 'Stage', 'Status', 'Signed NDA', 'Submitted At'
    ];
    
    const rows = sortedVendors.map((v) => [
      v.companyName || 'N/A',
      v.contactName,
      v.email,
      v.secondaryEmail || '',
      v.phone || '',
      v.services.join('; '),
      v.workingLanguages.map(l => `${l.language} (${l.proficiency})`).join('; '),
      v.classificationTier,
      v.mlcHourlyRate,
      v.adjustedRate,
      v.confirmedRate,
      v.stage,
      v.status,
      v.hasSignedNda ? 'Yes' : 'No',
      v.submittedAt || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'mlc_candidates_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logomark.png" alt="Logomark" className="w-10 h-10 object-contain" />
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Pipeline Dashboard</h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm pl-1.5">
            Evaluate, transition, and onboard language specialists across active workflows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Card / Table view toggler */}
          <div className="bg-slate-100 dark:bg-bg-dark border border-slate-200/50 dark:border-border-dark p-1 rounded-xl flex items-center shadow-inner">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'cards' 
                  ? 'bg-white dark:bg-card-dark text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table' 
                  ? 'bg-white dark:bg-card-dark text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              Table
            </button>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="py-2.5 px-4 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl flex items-center gap-2 btn-animate shadow-md shadow-primary/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Sourced Lead
          </button>
          
          <button
            onClick={() => {
              setShowXtrfAlert(true);
              setTimeout(() => setShowXtrfAlert(false), 3000);
            }}
            className="py-2.5 px-4 bg-rose-800 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 btn-animate border border-white/5 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-rose-300" />
            XTRF Import: NOT ACTIVE
          </button>
        </div>
      </div>

      {/* Funnel Pipeline aggregated counts */}
      <section className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm">
        <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Workflow Stages
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          {(Object.keys(STAGE_LABELS) as WorkflowStage[]).map((stage) => {
            const count = funnelStats[stage];
            return (
              <div 
                key={stage} 
                onClick={() => setStageFilter(stage)}
                className={`flex flex-col items-center p-3 rounded-2xl border transition-all text-center relative group cursor-pointer ${
                  stageFilter === stage 
                    ? 'bg-primary/5 border-primary shadow-sm' 
                    : 'bg-slate-50 dark:bg-bg-dark border-slate-200/10 hover:border-primary/20'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-2 ${
                  count > 0 ? 'bg-primary text-white shadow-md shadow-primary/25' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 tracking-tight line-clamp-1">
                  {STAGE_LABELS[stage]}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Search Toolbar */}
      <section className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white dark:bg-card-dark p-4 rounded-2xl border border-slate-200/50 dark:border-border-dark shadow-sm">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, company, service, language..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
            />
          </div>
          
          <div className="relative">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white appearance-none cursor-pointer font-bold"
            >
              <option value="all">All Stages</option>
              {Object.keys(STAGE_LABELS).map((key) => (
                <option key={key} value={key}>{STAGE_LABELS[key as WorkflowStage]}</option>
              ))}
            </select>
            <Filter className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          
          <button
            type="button"
            onClick={handleExportCSV}
            className="py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-border-dark text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 btn-animate cursor-pointer"
          >
            <Download className="w-4.5 h-4.5 text-primary" />
            Export CSV
          </button>
        </div>
      </section>

      {/* Pipeline View Mode Render */}
      <section>
        {viewMode === 'cards' ? (
          /* Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {sortedVendors.length > 0 ? (
                sortedVendors.map((candidate) => {
                  const statusConf = activeStatuses.find(s => s.key === candidate.status);
                  const statusColorClass = statusConf 
                    ? STATUS_COLORS_MAP[statusConf.color] || STATUS_COLORS_MAP.gray
                    : STATUS_COLORS_MAP.gray;
                    
                  return (
                    <motion.div
                      key={candidate.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="glass dark:dark-glass p-6 rounded-3xl border border-slate-200/50 dark:border-white/10 flex flex-col justify-between shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="cursor-pointer flex-1" onClick={() => setSelectedVendor(candidate)}>
                            {/* Candidate Custom Status badge connected to System Settings color tags */}
                            <span className={`inline-flex px-2 py-0.5 border text-[9px] font-bold rounded-lg uppercase tracking-wider mb-2 ${statusColorClass}`}>
                              {candidate.status.replace('_', ' ')}
                            </span>
                            {/* Name Priority (Primary Bold title) */}
                            <h4 className="font-extrabold text-lg text-slate-900 dark:text-white mt-0.5">{candidate.contactName}</h4>
                            {/* Secondary Company Label */}
                            {candidate.companyName ? (
                              <p className="text-xs text-slate-500 font-medium">Company: {candidate.companyName}</p>
                            ) : (
                              <p className="text-xs text-slate-400 italic">Individual Vendor</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {candidate.hasSignedNda ? (
                              candidate.ndaUrl ? (
                                <a 
                                  href={candidate.ndaUrl} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="p-1 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20" 
                                  title="View NDA Link"
                                >
                                  <FileCheck className="w-4 h-4" />
                                </a>
                              ) : (
                                <span className="p-1 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" title="NDA Checked/Signed">
                                  <Check className="w-4 h-4" />
                                </span>
                              )
                            ) : (
                              <span className="p-1 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20" title="NDA Required">
                                <ShieldAlert className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Working Languages & Proficiencies */}
                        <div className="flex flex-wrap gap-1.5 cursor-pointer" onClick={() => setSelectedVendor(candidate)}>
                          {candidate.workingLanguages.map((l, i) => (
                            <span key={i} className="text-[10px] bg-primary/10 text-primary py-0.5 px-2.5 rounded-md font-semibold">
                              {l.language} ({l.proficiency})
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Quick-Stage selector directly in Card View */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Workflow stage:</span>
                          <select
                            value={candidate.stage}
                            onChange={(e) => handleStageChangeRequest(candidate.id, e.target.value as WorkflowStage)}
                            className="p-1 text-[11px] font-bold bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-lg dark:text-white cursor-pointer focus:outline-none focus:border-primary"
                          >
                            {Object.entries(STAGE_LABELS).map(([k, label]) => (
                              <option key={k} value={k}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Stats summary block */}
                      <div 
                        onClick={() => setSelectedVendor(candidate)}
                        className="mt-4 pt-3 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 cursor-pointer"
                      >
                        <div>
                          <span className="text-[9px] block uppercase font-medium">Weekly Hours</span>
                          <span className="font-bold text-slate-800 dark:text-white">{candidate.hoursAvailable ? `${candidate.hoursAvailable}h` : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] block uppercase font-medium">MT PE Exp</span>
                          <span className="font-bold text-slate-800 dark:text-white">{candidate.mtPeExperience ? `${candidate.mtPeExperience} yrs` : 'None'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] block uppercase font-medium">Agreed Rate</span>
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {candidate.confirmedRate > 0 ? `$${candidate.confirmedRate}/hr` : 'Negotiating'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-full py-16 text-center text-slate-400 bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark">
                  <ShieldAlert className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <h4 className="font-semibold text-lg text-slate-700 dark:text-slate-300">No candidates match filters</h4>
                  <p className="text-xs mt-1">Adjust your pipeline stage or search query.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* Default: Table View */
          <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-bg-dark border-b border-slate-200/50 dark:border-border-dark text-slate-500 dark:text-slate-400 font-bold text-xs select-none">
                    <th className="p-4 pl-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => toggleSort('contactName')}>
                      <div className="flex items-center gap-1.5">
                        Candidate Name
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => toggleSort('companyName')}>
                      <div className="flex items-center gap-1.5">
                        Company Name
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="p-4">Languages</th>
                    <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => toggleSort('status')}>
                      <div className="flex items-center gap-1.5">
                        Linguist Status
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    {/* Quick stage transition column inside Pipeline View table */}
                    <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => toggleSort('stage')}>
                      <div className="flex items-center gap-1.5">
                        Workflow Stage
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-center" onClick={() => toggleSort('hoursAvailable')}>
                      <div className="flex items-center gap-1.5 justify-center">
                        Hours
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="p-4">NDA</th>
                    <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-right pr-6" onClick={() => toggleSort('confirmedRate')}>
                      <div className="flex items-center gap-1.5 justify-end">
                        Agreed Rate
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {sortedVendors.map((candidate) => {
                    const statusConf = activeStatuses.find(s => s.key === candidate.status);
                    const statusColorClass = statusConf 
                      ? STATUS_COLORS_MAP[statusConf.color] || STATUS_COLORS_MAP.gray
                      : STATUS_COLORS_MAP.gray;
                      
                    return (
                      <tr 
                        key={candidate.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <td className="p-4 pl-6 font-bold text-slate-900 dark:text-white" onClick={() => setSelectedVendor(candidate)}>
                          {candidate.contactName}
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 font-medium" onClick={() => setSelectedVendor(candidate)}>
                          {candidate.companyName || <span className="text-slate-400 italic">Individual</span>}
                        </td>
                        <td className="p-4" onClick={() => setSelectedVendor(candidate)}>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {candidate.workingLanguages.map((l, i) => (
                              <span key={i} className="text-[10px] bg-primary/10 text-primary py-0.5 px-2 rounded-md font-semibold">
                                {l.language}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4" onClick={() => setSelectedVendor(candidate)}>
                          <span className={`inline-flex px-2 py-0.5 border text-[9px] font-bold rounded-lg uppercase tracking-wider ${statusColorClass}`}>
                            {candidate.status.replace('_', ' ')}
                          </span>
                        </td>
                        {/* Interactive dropdown stage selector in table row */}
                        <td className="p-4">
                          <select
                            value={candidate.stage}
                            onChange={(e) => handleStageChangeRequest(candidate.id, e.target.value as WorkflowStage)}
                            onClick={(e) => e.stopPropagation()} // Stop drawer triggers
                            className="p-1.5 text-xs font-bold bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl dark:text-white cursor-pointer focus:outline-none"
                          >
                            {Object.entries(STAGE_LABELS).map(([k, label]) => (
                              <option key={k} value={k}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300" onClick={() => setSelectedVendor(candidate)}>
                          {candidate.hoursAvailable ? `${candidate.hoursAvailable}h/wk` : 'N/A'}
                        </td>
                        {/* Direct NDA link support */}
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          {candidate.hasSignedNda ? (
                            candidate.ndaUrl ? (
                              <a 
                                href={candidate.ndaUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-500 font-bold text-xs"
                              >
                                <FileCheck className="w-4 h-4" />
                                Link
                              </a>
                            ) : (
                              <span className="text-emerald-600 font-semibold text-xs">Signed</span>
                            )
                          ) : (
                            <span className="text-rose-600 text-xs font-semibold">Missing</span>
                          )}
                        </td>
                        <td className="p-4 text-right pr-6 font-extrabold text-slate-950 dark:text-white" onClick={() => setSelectedVendor(candidate)}>
                          {candidate.confirmedRate > 0 ? `$${candidate.confirmedRate}/hr` : 'Negotiating'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Drawer: Detailed Candidate Viewer & Full Edit Mode */}
      <AnimatePresence>
        {selectedVendor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedVendor(null);
                setIsEditing(false);
              }}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-card-dark border-l border-slate-200 dark:border-border-dark p-6 overflow-y-auto flex flex-col justify-between"
            >
              <div className="space-y-6">
                
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Candidate Profile Drawer</span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      {isEditing ? `Editing ${selectedVendor.contactName}` : selectedVendor.contactName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <button
                        onClick={() => startEditingVendor(selectedVendor)}
                        className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Profile
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setSelectedVendor(null);
                        setIsEditing(false);
                      }} 
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  /* Form: EDIT ALL CANDIDATE FIELDS */
                  <form id="edit-vendor-form" onSubmit={handleSaveEdit} className="space-y-4 text-xs font-semibold">
                    
                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Specialist Full Name</label>
                      <input
                        type="text"
                        required
                        value={editContactName}
                        onChange={(e) => setEditContactName(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white"
                      />
                    </div>

                    {/* Company Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Company Name (Optional)</label>
                      <input
                        type="text"
                        value={editCompanyName}
                        onChange={(e) => setEditCompanyName(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white"
                      />
                    </div>

                    {/* Email and Google Workspace Verification */}
                    <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/20 dark:border-white/5">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Primary Contact Email</label>
                        <input
                          type="email"
                          required
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2 py-1 select-none">
                        <input
                          type="checkbox"
                          id="edit-is-gmail"
                          checked={editIsGmail}
                          onChange={(e) => setEditIsGmail(e.target.checked)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary bg-slate-50 cursor-pointer"
                        />
                        <label htmlFor="edit-is-gmail" className="text-slate-700 dark:text-slate-300 cursor-pointer font-bold">
                          This is a Gmail or Google Workspace Account
                        </label>
                      </div>

                      {!editIsGmail && (
                        <div className="space-y-1.5 pt-1.5 border-t border-slate-200/40">
                          <label className="text-[10px] text-primary uppercase tracking-wider block">Secondary Google Account Email</label>
                          <input
                            type="email"
                            required
                            value={editSecondaryEmail}
                            onChange={(e) => setEditSecondaryEmail(e.target.value)}
                            placeholder="e.g. user.auth@gmail.com"
                            className="w-full p-2.5 text-xs bg-white dark:bg-card-dark border border-primary/20 rounded-xl focus:outline-none dark:text-white"
                          />
                        </div>
                      )}
                    </div>

                    {/* Phone & Hours */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Phone Number</label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Hours Available/wk</label>
                        <input
                          type="number"
                          value={editHours}
                          onChange={(e) => setEditHours(e.target.value)}
                          className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white"
                        />
                      </div>
                    </div>

                    {/* MT PE Experience & Custom Status dropdown connected to settings statuses */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block">MT PE Experience</label>
                        <select
                          value={editExperience}
                          onChange={(e) => setEditExperience(e.target.value as any)}
                          className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white cursor-pointer"
                        >
                          <option value="1-3">1-3 years</option>
                          <option value="3-5">3-5 years</option>
                          <option value="5+">5+ years</option>
                        </select>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Candidate Status</label>
                        {/* Dynamic statuses list fetched from settings configuration */}
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white cursor-pointer capitalize font-bold"
                        >
                          {activeStatuses.map((s) => (
                            <option key={s.key} value={s.key}>{s.key.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* ProZ & LinkedIn Links */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block">ProZ Profile URL</label>
                        <input
                          type="text"
                          value={editProz}
                          onChange={(e) => setEditProz(e.target.value)}
                          placeholder="proz.com/profile/username"
                          className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block">LinkedIn Profile URL</label>
                        <input
                          type="text"
                          value={editLinkedin}
                          onChange={(e) => setEditLinkedin(e.target.value)}
                          placeholder="linkedin.com/in/username"
                          className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* NDA links url & checkbox */}
                    <div className="space-y-2 p-3 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/20 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">NDA Compliance Link</span>
                      <div className="flex items-center gap-2 select-none mb-1">
                        <input
                          type="checkbox"
                          id="edit-has-signed-nda"
                          checked={editHasSignedNda}
                          onChange={(e) => setEditHasSignedNda(e.target.checked)}
                          className="w-4 h-4 rounded text-primary bg-slate-50 cursor-pointer"
                        />
                        <label htmlFor="edit-has-signed-nda" className="text-slate-700 dark:text-slate-300 font-bold cursor-pointer">
                          Signed NDA Verified
                        </label>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 uppercase block">Signed NDA PDF Contract URL</label>
                        <input
                          type="text"
                          value={editNdaUrl}
                          onChange={(e) => setEditNdaUrl(e.target.value)}
                          placeholder="https://docusign.com/..."
                          className="w-full p-2 bg-white dark:bg-card-dark border rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    {/* Services and Working Languages list */}
                    <div className="space-y-2 p-3 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/20 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Working Languages</span>
                      
                      <div className="flex gap-2">
                        <select
                          id="edit-lang-select"
                          className="flex-1 p-2 text-xs bg-white dark:bg-card-dark border rounded text-slate-900 dark:text-white"
                        >
                          {activeLanguages.map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                        <select
                          id="edit-prof-select"
                          className="p-2 text-xs bg-white dark:bg-card-dark border rounded text-slate-900 dark:text-white"
                        >
                          <option value="native">Native</option>
                          <option value="bilingual">Bilingual</option>
                          <option value="professional">Professional</option>
                          <option value="working">Working</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const lSelect = document.getElementById('edit-lang-select') as HTMLSelectElement;
                            const pSelect = document.getElementById('edit-prof-select') as HTMLSelectElement;
                            if (lSelect && pSelect) {
                              handleAddLanguageToEdit(lSelect.value, pSelect.value as any);
                            }
                          }}
                          className="py-1 px-3 bg-slate-800 text-white rounded font-bold text-[10px]"
                        >
                          Add
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1.5">
                        {editLanguages.map((l) => (
                          <span key={l.language} className="inline-flex items-center gap-1 bg-primary/10 text-primary py-0.5 px-2.5 rounded font-bold">
                            {l.language} ({l.proficiency})
                            <button
                              type="button"
                              onClick={() => handleRemoveLanguageFromEdit(l.language)}
                              className="text-primary hover:text-red-500 font-extrabold pl-1 cursor-pointer"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Services Offered (Comma Separated)</label>
                        <input
                          type="text"
                          value={editServices}
                          onChange={(e) => setEditServices(e.target.value)}
                          placeholder="e.g. Translation, Localization"
                          className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Classification Tier</label>
                        <select
                          value={editTier}
                          onChange={(e) => setEditTier(parseInt(e.target.value) as 1 | 2 | 3)}
                          className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none cursor-pointer"
                        >
                          <option value={1}>Tier 1 (Highest Quality)</option>
                          <option value={2}>Tier 2 (Standard)</option>
                          <option value={3}>Tier 3 (Budget/Emerging)</option>
                        </select>
                      </div>
                    </div>

                    {/* Rates Edit fields */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-bg-dark border border-slate-200/20 rounded-2xl">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 uppercase block">Client Charge ($/hr)</label>
                        <input
                          type="number"
                          value={editMlcRate}
                          onChange={(e) => setEditMlcRate(e.target.value)}
                          className="w-full p-2 bg-white dark:bg-card-dark border rounded-lg text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 uppercase block">Target Offer ($/hr)</label>
                        <span className="w-full p-2 bg-slate-200/40 dark:bg-slate-800 rounded-lg text-xs font-bold block text-center leading-normal">
                          {Math.round((parseFloat(editMlcRate) || 0) * 0.9)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 uppercase block">Confirmed Rate ($/hr)</label>
                        <input
                          type="number"
                          value={editConfirmedRate}
                          onChange={(e) => setEditConfirmedRate(e.target.value)}
                          className="w-full p-2 bg-white dark:bg-card-dark border border-primary/20 rounded-lg text-xs font-bold text-primary"
                        />
                      </div>
                    </div>

                  </form>
                ) : (
                  /* Display details drawer view */
                  <div className="space-y-6 text-sm">
                    {/* Status Badge mapping config colors */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Candidate Current Status</span>
                      {(() => {
                        const statusConf = activeStatuses.find(s => s.key === selectedVendor.status);
                        const statusColorClass = statusConf 
                          ? STATUS_COLORS_MAP[statusConf.color] || STATUS_COLORS_MAP.gray
                          : STATUS_COLORS_MAP.gray;
                        return (
                          <span className={`px-2.5 py-0.5 border text-xs font-bold rounded-lg uppercase tracking-wider ${statusColorClass}`}>
                            {selectedVendor.status.replace('_', ' ')}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Signed NDA verified status and Direct link */}
                    <div className="flex flex-col gap-2 p-3.5 bg-slate-50 dark:bg-bg-dark border border-slate-200/20 dark:border-white/5 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCheck className={`w-5 h-5 ${selectedVendor.hasSignedNda ? 'text-emerald-500' : 'text-slate-400'}`} />
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">Non-Disclosure Agreement</span>
                            <span className="text-[10px] text-slate-500 block">{selectedVendor.hasSignedNda ? 'Signed NDA Verified' : 'NDA Missing / Required'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {selectedVendor.ndaUrl && (
                        <div className="pt-2 border-t border-slate-200/40">
                          <a 
                            href={selectedVendor.ndaUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1.5 text-primary font-bold hover:underline text-xs"
                          >
                            <ExternalLink className="w-4 h-4 text-primary" />
                            Open Signed NDA PDF Document
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Stage selector dropdown inside sidebar details */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Workflow Stage</label>
                      <select
                        value={selectedVendor.stage}
                        onChange={(e) => handleStageChangeRequest(selectedVendor.id, e.target.value as WorkflowStage)}
                        className="w-full pl-3 pr-8 py-2.5 text-xs font-bold bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl dark:text-white cursor-pointer focus:outline-none"
                      >
                        {Object.entries(STAGE_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Rates negotiation values */}
                    <div className="space-y-3">
                      <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Negotiated Rates</h5>
                      <div className="bg-slate-50 dark:bg-bg-dark rounded-2xl p-4 border border-slate-100 dark:border-white/5 space-y-3">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <span className="text-[9px] text-slate-500 block font-medium">Charge Rate</span>
                            <span className="font-bold text-slate-800 dark:text-white">${selectedVendor.mlcHourlyRate}/hr</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 block font-medium">Target Rate</span>
                            <span className="font-bold text-slate-800 dark:text-white">${selectedVendor.adjustedRate}/hr</span>
                          </div>
                          <div className="bg-primary/10 border border-primary/20 rounded-xl p-1">
                            <span className="text-[9px] text-primary block font-extrabold">Agreed Rate</span>
                            <span className="font-extrabold text-primary">${selectedVendor.confirmedRate}/hr</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Specialist Attributes */}
                    <div className="space-y-3">
                      <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider font-semibold">Specialist Attributes</h5>
                      <div className="bg-slate-50 dark:bg-bg-dark rounded-2xl p-4 border border-slate-100 dark:border-white/5 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span>Primary Email:</span>
                          <span className="font-bold">{selectedVendor.email}</span>
                        </div>
                        
                        {selectedVendor.secondaryEmail && (
                          <div className="flex justify-between">
                            <span>Secondary Google Acc:</span>
                            <span className="font-bold text-primary">{selectedVendor.secondaryEmail}</span>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span>Weekly Available Hours:</span>
                          <span className="font-bold">{selectedVendor.hoursAvailable ? `${selectedVendor.hoursAvailable} hrs` : 'Unspecified'}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span>MT Post-Editing Exp:</span>
                          <span className="font-bold">{selectedVendor.mtPeExperience ? `${selectedVendor.mtPeExperience} years` : 'Unspecified'}</span>
                        </div>

                        {selectedVendor.prozProfile && (
                          <div className="flex justify-between">
                            <span>ProZ Profile:</span>
                            <a href={selectedVendor.prozProfile} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">View ProZ Portfolio</a>
                          </div>
                        )}

                        {selectedVendor.linkedInProfile && (
                          <div className="flex justify-between">
                            <span>LinkedIn Profile:</span>
                            <a href={selectedVendor.linkedInProfile} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline flex items-center gap-1">
                              <ExternalLink className="w-3.5 h-3.5" />
                              View LinkedIn
                            </a>
                          </div>
                        )}

                        {selectedVendor.resumeName && (
                          <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/40 dark:border-white/5">
                            <span>Resume File:</span>
                            <span className="inline-flex items-center gap-1.5 text-primary font-bold bg-primary/5 py-1 px-2.5 rounded-lg border border-primary/10">
                              <UploadCloud className="w-3.5 h-3.5" />
                              {selectedVendor.resumeName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer footer actions */}
              <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex gap-3">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-2.5 border border-slate-200 dark:border-border-dark text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 btn-animate cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      form="edit-vendor-form"
                      className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl btn-animate cursor-pointer"
                    >
                      Save Profile Updates
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedVendor(null);
                      setIsEditing(false);
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl btn-animate cursor-pointer"
                  >
                    Close Candidate Details
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Drawer: Add Sourced Candidate Intake Form */}
      <AnimatePresence>
        {isAddOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-card-dark border-l border-slate-200 dark:border-border-dark p-6 overflow-y-auto flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add Sourced Candidate</h3>
                    <p className="text-xs text-slate-500 mt-1">Submit a new candidate profile to the recruitment database.</p>
                  </div>
                  <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form id="sourced-intake-form" onSubmit={handleDirectSubmit} className="space-y-4 text-xs font-semibold">
                  
                  {/* Name field (Primary priority) */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Specialist's Full Name</label>
                    <input
                      type="text"
                      required
                      value={formContactName}
                      onChange={(e) => setFormContactName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                    />
                  </div>

                  {/* Company Name (Secondary optional) */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Company Name (Optional)</label>
                    <input
                      type="text"
                      value={formCompanyName}
                      onChange={(e) => setFormCompanyName(e.target.value)}
                      placeholder="e.g. JD Translations"
                      className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none"
                    />
                  </div>

                  {/* Email & Google account guard */}
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Primary Contact Email</label>
                      <input
                        type="email"
                        required
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 py-1 select-none">
                      <input
                        type="checkbox"
                        id="form-is-gmail"
                        checked={formIsGmail}
                        onChange={(e) => setFormIsGmail(e.target.checked)}
                        className="w-4 h-4 rounded text-primary bg-slate-50 border-slate-200 cursor-pointer"
                      />
                      <label htmlFor="form-is-gmail" className="text-slate-600 dark:text-slate-300 cursor-pointer font-bold flex items-center gap-1">
                        This is a Gmail or Google Workspace Account
                      </label>
                    </div>

                    {!formIsGmail && (
                      <div className="space-y-1.5 p-3.5 bg-primary/5 rounded-2xl border border-primary/10">
                        <label className="text-[10px] text-primary uppercase tracking-wider block flex items-center gap-1">
                          <Info className="w-3.5 h-3.5" />
                          Secondary Google Account Email
                        </label>
                        <input
                          type="email"
                          required
                          value={formSecondaryEmail}
                          onChange={(e) => setFormSecondaryEmail(e.target.value)}
                          placeholder="e.g. john.doe.auth@gmail.com"
                          className="w-full p-2.5 text-xs bg-white dark:bg-bg-dark border border-primary/20 rounded-xl focus:outline-none dark:text-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Multi-language selector */}
                  <div className="space-y-2 p-3 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/20 dark:border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Languages and Proficiency</span>
                    
                    <div className="flex gap-2">
                      <select
                        value={selectedLangToAdd}
                        onChange={(e) => setSelectedLangToAdd(e.target.value)}
                        className="flex-1 p-2 text-xs bg-white dark:bg-card-dark border rounded text-slate-900 dark:text-white"
                      >
                        {activeLanguages.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                      
                      <select
                        value={selectedProfToAdd}
                        onChange={(e) => setSelectedProfToAdd(e.target.value as any)}
                        className="p-2 text-xs bg-white dark:bg-card-dark border rounded text-slate-900 dark:text-white"
                      >
                        <option value="native">Native</option>
                        <option value="bilingual">Bilingual</option>
                        <option value="professional">Professional</option>
                        <option value="working">Working</option>
                      </select>
                      
                      <button
                        type="button"
                        onClick={handleAddLanguageToForm}
                        className="py-1.5 px-3 bg-slate-800 text-white rounded-lg font-bold"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {formLanguages.map((l) => (
                        <span key={l.language} className="inline-flex items-center gap-1 bg-primary/10 text-primary py-0.5 px-2.5 rounded font-bold">
                          {l.language} ({l.proficiency})
                          <button
                            type="button"
                            onClick={() => handleRemoveLanguageFromForm(l.language)}
                            className="text-primary hover:text-red-500 font-extrabold pl-1 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Hours and Experience */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Weekly Hours Available</label>
                      <input
                        type="number"
                        required
                        value={formHours}
                        onChange={(e) => setFormHours(e.target.value)}
                        placeholder="e.g. 20"
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">MT PE Experience</label>
                      <select
                        value={formExperience}
                        onChange={(e) => setFormExperience(e.target.value as any)}
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none cursor-pointer"
                      >
                        <option value="1-3">1 - 3 years</option>
                        <option value="3-5">3 - 5 years</option>
                        <option value="5+">More than 5 years</option>
                      </select>
                    </div>
                  </div>

                  {/* ProZ, LinkedIn, and NDA link url */}
                  <div className="space-y-2 p-3 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/20 dark:border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Portfolio and NDA urls</span>
                    
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        type="text"
                        value={formProz}
                        onChange={(e) => setFormProz(e.target.value)}
                        placeholder="ProZ Link"
                        className="p-2 border rounded-lg text-xs bg-white dark:bg-card-dark"
                      />
                      <input
                        type="text"
                        value={formLinkedin}
                        onChange={(e) => setFormLinkedin(e.target.value)}
                        placeholder="LinkedIn Link"
                        className="p-2 border rounded-lg text-xs bg-white dark:bg-card-dark"
                      />
                    </div>
                    
                    <input
                      type="text"
                      value={formNdaUrl}
                      onChange={(e) => setFormNdaUrl(e.target.value)}
                      placeholder="Signed NDA document URL (e.g. DocuSign)"
                      className="w-full p-2 border rounded-lg text-xs bg-white dark:bg-card-dark"
                    />
                  </div>

                  {/* Resume Upload simulation */}
                  <div className="space-y-2 p-3 bg-slate-50 dark:bg-bg-dark border border-slate-200/20 dark:border-white/5 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Resume Attachment</span>
                    
                    <div className="flex items-center justify-center p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl relative cursor-pointer hover:bg-slate-100/50">
                      <input
                        type="file"
                        accept=".pdf,.docx"
                        onChange={simulateResumeUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="text-center">
                        <UploadCloud className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                        <span className="text-[10px] text-slate-500 font-semibold block">Click to Upload Resume (PDF/DOCX)</span>
                      </div>
                    </div>

                    {uploadingName && (
                      <div className="space-y-1.5 pt-1.5">
                        <span className="text-[9px] text-slate-500 block truncate font-bold">Uploading {uploadingName}...</span>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.1 }}
                          ></motion.div>
                        </div>
                      </div>
                    )}

                    {uploadedResumeName && (
                      <div className="flex items-center justify-between p-2 bg-primary/5 border border-primary/20 rounded-lg text-primary font-bold">
                        <span className="truncate max-w-[200px]">{uploadedResumeName}</span>
                        <button type="button" onClick={() => setUploadedResumeName('')} className="text-primary hover:text-red-500 font-extrabold cursor-pointer">×</button>
                      </div>
                    )}
                  </div>

                  {/* Hourly rate and Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Hourly MLC Rate ($)</label>
                      <input
                        type="number"
                        required
                        value={formMlcRate}
                        onChange={(e) => setFormMlcRate(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Initial Status</label>
                      {/* Dynamically connected to System Settings custom statuses */}
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white cursor-pointer capitalize"
                      >
                        {activeStatuses.map((s) => (
                          <option key={s.key} value={s.key}>{s.key.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </form>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-border-dark text-slate-500 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 btn-animate"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="sourced-intake-form"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl btn-animate"
                >
                  Add Lead
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Validation modal for stage transitions triggered by workflow rules */}
      <AnimatePresence>
        {pendingTransition && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setPendingTransition(null)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-card-dark rounded-3xl p-6 border border-slate-200 dark:border-border-dark shadow-2xl z-50 overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Workflow Action Trigger</h3>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">
                  <p>
                    Transitioning this candidate to <span className="font-bold text-primary">{STAGE_LABELS[pendingTransition.targetStage]}</span> triggers the following automated email rule:
                  </p>
                  
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-slate-700 dark:text-slate-200 font-bold">
                    <div>Rule Name: <span className="text-slate-900 dark:text-white font-extrabold">{pendingTransition.actionName}</span></div>
                    <div>Email Template: <span className="font-normal font-mono">{pendingTransition.templateName}</span></div>
                    <div>Recipient Group: <span className="text-primary">{pendingTransition.recipientType}</span></div>
                  </div>

                  <p className="text-[10px] text-slate-400 font-medium italic">
                    If you confirm, the stage updates and the email dispatch is placed in the notification queue log.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setPendingTransition(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs btn-animate cursor-pointer"
                >
                  Cancel transition
                </button>
                <button
                  type="button"
                  onClick={() => commitStageChange(pendingTransition.vendorId, pendingTransition.targetStage)}
                  className="flex-1 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg text-xs btn-animate cursor-pointer"
                >
                  Confirm & Trigger
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sync Status Banner */}
      <AnimatePresence>
        {showXtrfAlert && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 dark:dark-glass bg-rose-500/20 text-rose-600 dark:text-rose-400 px-6 py-3 rounded-2xl border border-rose-500/20 shadow-2xl font-bold flex items-center gap-2"
          >
            <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
            <span>XTRF Import Integration is currently NOT ACTIVE on this client setup.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
