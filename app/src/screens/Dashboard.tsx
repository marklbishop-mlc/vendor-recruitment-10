import React, { useState, useMemo, useEffect } from 'react';
import type { VendorProfile, WorkflowStage, WorkingLanguage, StatusConfig, WorkflowAction, EmailTemplate, TestRecord, WorkflowStageConfig, SlaNudgeConfig, StageProgressConfig, ApplicationConfig, WeeklyAvailabilityOption, MtqaExperienceYears, ErrorTaggingExpLevel, AgilitySelfAssessment } from '../types';
import { getActiveSortedLanguages, DEFAULT_STAGE_PROGRESS_OPTIONS, getStageProgressStyle, getStageProgressTextColor, FULL_DEFAULT_LANGUAGES } from '../types';
import { COUNTRIES, TIME_ZONES } from '../utils/locationData';
import { 
  Plus, Search, ShieldAlert, X, ChevronDown,
  FileText, Check, Copy, UploadCloud, Grid, List, ArrowUpDown,
  FileCheck, Info, ExternalLink, Edit2, AlertTriangle, Download, Trash2, Mail, Link as LinkIcon, Layers, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, doc, setDoc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { seed10DummyVendors, SEEDED_DUMMY_VENDORS } from '../seedVendors';

const DEFAULT_STAGES: WorkflowStageConfig[] = [
  { id: 'outreach', name: 'Outreach', description: 'Initial contact and profile submission', order: 1 },
  { id: 'nda', name: 'NDA Sign', description: 'Non-disclosure agreement verification', order: 2 },
  { id: 'ready_for_testing', name: 'Ready for Testing', description: 'Vetted candidate queued for assessment', order: 3 },
  { id: 'in_testing', name: 'In Testing', description: 'Active translation test evaluation', order: 4 },
  { id: 'xtrf_onboarding', name: 'XTRF Onboarding', description: 'Portal account & system registration', order: 5 },
  { id: 'ready_for_pm', name: 'Ready for PM', description: 'Compliance approved and available in PM Directory', order: 6 },
  { id: 'dnu', name: 'DNU', description: 'Do Not Use / Disqualified candidate', order: 7 }
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

const DEFAULT_LANGUAGES = FULL_DEFAULT_LANGUAGES.map((l) => l.name);

export const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();
  
  // Settings & Workflow Stage configurations
  const [stages, setStages] = useState<WorkflowStageConfig[]>(DEFAULT_STAGES);
  const [activeLanguages, setActiveLanguages] = useState<string[]>(DEFAULT_LANGUAGES);
  const [activeStatuses, setActiveStatuses] = useState<StatusConfig[]>([]);
  const [stageProgressOptions, setStageProgressOptions] = useState<StageProgressConfig[]>(DEFAULT_STAGE_PROGRESS_OPTIONS);

  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [workflowActions, setWorkflowActions] = useState<WorkflowAction[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStageFilters, setSelectedStageFilters] = useState<string[]>([]);
  const [selectedLanguageFilters, setSelectedLanguageFilters] = useState<string[]>([]);
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>([]);
  const [selectedAppFilters, setSelectedAppFilters] = useState<string[]>([]);
  
  // Dropdown open states for multi-select popovers
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isAppDropdownOpen, setIsAppDropdownOpen] = useState(false);
  
  // Slide-out drawers
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Default view is now table view
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [presetView, setPresetView] = useState<'standard' | 'detailed_eval' | 'workflow_hiring' | 'domain_agility'>('standard');
  
  // Table sorting states
  const [sortField, setSortField] = useState<keyof VendorProfile>('contactName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Side Drawers / Modals
  const [isAddOpen, setIsAddOpen] = useState(false);

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

  // Detailed Evaluation Fields for New Intake
  const [formCountry, setFormCountry] = useState('United States');
  const [formTimeZone, setFormTimeZone] = useState('UTC-05:00 Eastern Time');
  const [formAvailableStartDate, setFormAvailableStartDate] = useState('Immediately');
  const [formWeeklyAvailability, setFormWeeklyAvailability] = useState<WeeklyAvailabilityOption>('up_to_20');
  const [formOtherLanguages, setFormOtherLanguages] = useState('');
  const [formMtqaExperienceYears, setFormMtqaExperienceYears] = useState<MtqaExperienceYears>('1_to_3');
  const [formHandsOnExperienceAreas, setFormHandsOnExperienceAreas] = useState<string[]>([
    'Machine Translation Quality Assurance (MTQA)',
    'Machine Translation Post-Editing (MTPE)'
  ]);
  const [formAgilitySelfAssessment, setFormAgilitySelfAssessment] = useState<AgilitySelfAssessment>({
    qaPlatforms: 2,
    grammarStyle: 3,
    errorTagging: 3,
    policyFeedback: 2
  });
  const [formErrorTaggingExperience, setFormErrorTaggingExperience] = useState<ErrorTaggingExpLevel>('basic');
  
  // Selected multiple languages in form
  const [formLanguages, setFormLanguages] = useState<{ language: string; proficiency: WorkingLanguage['proficiency'] }[]>([]);
  const [selectedLangToAdd, setSelectedLangToAdd] = useState('English');
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
  const [editLanguages, setEditLanguages] = useState<WorkingLanguage[]>([]);
  const [editConfirmedRate, setEditConfirmedRate] = useState('');

  // Detailed Evaluation Fields for Edit Candidate
  const [editCountry, setEditCountry] = useState('');
  const [editTimeZone, setEditTimeZone] = useState('');
  const [editAvailableStartDate, setEditAvailableStartDate] = useState('');
  const [editWeeklyAvailability, setEditWeeklyAvailability] = useState<WeeklyAvailabilityOption>('up_to_20');
  const [editOtherLanguages, setEditOtherLanguages] = useState('');
  const [editMtqaExperienceYears, setEditMtqaExperienceYears] = useState<MtqaExperienceYears>('1_to_3');
  const [editHandsOnExperienceAreas, setEditHandsOnExperienceAreas] = useState<string[]>([]);
  const [editAgilitySelfAssessment, setEditAgilitySelfAssessment] = useState<AgilitySelfAssessment>({
    qaPlatforms: 2,
    grammarStyle: 3,
    errorTagging: 3,
    policyFeedback: 2
  });
  const [editErrorTaggingExperience, setEditErrorTaggingExperience] = useState<ErrorTaggingExpLevel>('basic');

  // Applications Multi-Link States
  const [applicationsList, setApplicationsList] = useState<ApplicationConfig[]>([]);
  const [isCopyLinkModalOpen, setIsCopyLinkModalOpen] = useState(false);
  const [copiedAppSlug, setCopiedAppSlug] = useState<string | null>(null);

  const [splitPrompt, setSplitPrompt] = useState<{ vendor: VendorProfile; targetStage: WorkflowStage } | null>(null);

  const [slaNudgesConfig, setSlaNudgesConfig] = useState<SlaNudgeConfig>({
    enabled: true,
    mode: 'one_click',
    ndaWaitDays: 3,
    maxNudges: 2
  });

  const handleSendNdaNudge = (vendor: VendorProfile) => {
    const ndaUrl = `https://mlc-vendor-recruitment.web.app/portal/nda/${vendor.id}`;
    setPendingTransition({
      vendorId: vendor.id,
      targetStage: vendor.stage,
      actionName: '1-Click SLA NDA Nudge Reminder',
      templateName: 'NDA Signature Request',
      recipientType: 'vendor',
      previewSubject: `Reminder: Action Required - Sign NDA for Multilingual Connections (${vendor.contactName})`,
      previewBody: `Hi ${vendor.contactName},\n\nWe noticed you haven't completed your Non-Disclosure Agreement (NDA) yet.\n\nPlease click the link below to review and sign your NDA online so we can move forward with your application:\n${ndaUrl}\n\nThank you,\nMLC Recruitment & Compliance Team`
    });
  };

  // Validation transition modal states
  const [pendingTransition, setPendingTransition] = useState<{
    vendorId: string;
    targetStage: WorkflowStage;
    actionName: string;
    templateName: string;
    recipientType: string;
    previewSubject: string;
    previewBody: string;
    matchedRule?: WorkflowAction;
  } | null>(null);

  const handleConfirmSplitProfiles = async (vendor: VendorProfile) => {
    try {
      const now = new Date().toISOString();
      
      for (let i = 0; i < vendor.workingLanguages.length; i++) {
        const lang = vendor.workingLanguages[i];
        const newVendorId = `v-split-${Date.now()}-${i + 1}`;
        
        const splitVendor: VendorProfile = {
          ...vendor,
          id: newVendorId,
          contactName: `${vendor.contactName} (${lang.language})`,
          workingLanguages: [lang],
          stage: vendor.stage,
          stageStatus: vendor.stageStatus || 'started',
          parentVendorId: vendor.id,
          splitLanguage: lang.language,
          updatedAt: now
        };

        await setDoc(doc(db, 'vendors', newVendorId), sanitizePayload(splitVendor));
      }

      await deleteDoc(doc(db, 'vendors', vendor.id));

      const vendorSnap = await getDocs(collection(db, 'vendors'));
      const updatedList: VendorProfile[] = [];
      vendorSnap.forEach((doc) => updatedList.push(doc.data() as VendorProfile));
      setVendors(updatedList);

      setSplitPrompt(null);
      if (selectedVendor?.id === vendor.id) {
        setSelectedVendor(null);
      }

      alert(`Successfully split ${vendor.contactName} into ${vendor.workingLanguages.length} separate language candidate profiles!`);
    } catch (err) {
      console.error("Failed to split candidate profiles", err);
      alert("Failed to split profiles: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Load configurations and Firestore collections
  useEffect(() => {
    if (loading) return;

    // Real-time listener for system config (stages, languages, statuses)
    const unsubConfig = onSnapshot(doc(db, 'settings', 'global_config'), (snapshot) => {
      if (snapshot.exists()) {
        const config = snapshot.data();
        if (config.stages && config.stages.length > 0) {
          setStages(config.stages.sort((a: WorkflowStageConfig, b: WorkflowStageConfig) => a.order - b.order));
        }
        if (config.languages) {
          setActiveLanguages(getActiveSortedLanguages(config.languages).map((l) => l.name));
        }
        if (config.statuses) {
          setActiveStatuses(config.statuses);
        }
        if (config.stageProgressOptions && config.stageProgressOptions.length > 0) {
          setStageProgressOptions(config.stageProgressOptions);
        }
        if (config.slaNudges) {
          setSlaNudgesConfig(config.slaNudges);
        }
      }
    }, (err) => {
      console.error("Failed to subscribe to global_config in real-time:", err);
    });

    const loadData = async () => {
      try {
        // 1. Initial system config check fallback
        const systemConfigSnap = await getDoc(doc(db, 'settings', 'global_config'));
        if (systemConfigSnap.exists()) {
          const config = systemConfigSnap.data();
          if (config.stages && config.stages.length > 0) {
            setStages(config.stages.sort((a: WorkflowStageConfig, b: WorkflowStageConfig) => a.order - b.order));
          }
          if (config.languages) {
            setActiveLanguages(getActiveSortedLanguages(config.languages).map((l) => l.name));
          }
          if (config.statuses) {
            setActiveStatuses(config.statuses);
          }
          if (config.stageProgressOptions && config.stageProgressOptions.length > 0) {
            setStageProgressOptions(config.stageProgressOptions);
          }
          if (config.slaNudges) {
            setSlaNudgesConfig(config.slaNudges);
          }
        } else {
          // Fallback to local storage
          const savedLangs = localStorage.getItem('mlc_settings_languages');
          const savedStatuses = localStorage.getItem('mlc_settings_statuses_v2');
          
          if (savedLangs) {
            setActiveLanguages(getActiveSortedLanguages(JSON.parse(savedLangs)).map((l) => l.name));
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
          // Seed 10 rich dummy vendors into Cloud Firestore
          await seed10DummyVendors();
          const newSnap = await getDocs(collection(db, 'vendors'));
          const seededList: VendorProfile[] = [];
          newSnap.forEach((doc) => seededList.push(doc.data() as VendorProfile));
          setVendors(seededList.length > 0 ? seededList : SEEDED_DUMMY_VENDORS);
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

        // 5. Subscribe to Applications
        onSnapshot(collection(db, 'applications'), (snapshot) => {
          const list: ApplicationConfig[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as ApplicationConfig);
          });
          setApplicationsList(list);
        });
      } catch (err) {
        console.error("Dashboard failed to load database collections", err);
      }
    };

    loadData();
    return () => unsubConfig();
  }, [loading, user]);

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



  // Helper to evaluate workflow trigger rules with conditional precedence & fallback
  const findMatchingActionRule = (candidate: VendorProfile, targetStage: WorkflowStage, rules: WorkflowAction[]) => {
    const activeStageRules = rules.filter(
      (act) => act.triggerStage === targetStage && act.isActive
    );

    // 1. Separate specific conditional rules from unconditional ('always') rules
    const conditionalRules = activeStageRules.filter(r => r.operator !== 'always' && r.field);
    const unconditionalRules = activeStageRules.filter(r => r.operator === 'always' || !r.field);

    // 2. Evaluate conditional rules first
    for (const rule of conditionalRules) {
      if (!rule.field) continue;
      const candidateVal = (candidate as any)[rule.field];
      const targetVal = rule.value;

      if (rule.operator === '==') {
        if (String(candidateVal) === String(targetVal)) return rule;
      } else if (rule.operator === '!=') {
        if (String(candidateVal) !== String(targetVal)) return rule;
      } else if (rule.operator === 'empty') {
        if (candidateVal === undefined || candidateVal === null || candidateVal === '') return rule;
      } else if (rule.operator === 'not_empty') {
        if (candidateVal !== undefined && candidateVal !== null && candidateVal !== '') return rule;
      }
    }

    // 3. Fallback to unconditional rule if no specific condition matched
    if (unconditionalRules.length > 0) {
      return unconditionalRules[0];
    }

    return null;
  };

  // Stage change trigger with validation check & rule evaluation
  const handleStageChangeRequest = (vendorId: string, nextStage: WorkflowStage) => {
    const candidate = vendors.find((v) => v.id === vendorId);
    if (!candidate) return;

    if ((nextStage === 'ready_for_testing' || nextStage === 'in_testing') && candidate.workingLanguages && candidate.workingLanguages.length > 1) {
      setSplitPrompt({ vendor: candidate, targetStage: nextStage });
      return;
    }

    const matchingAction = findMatchingActionRule(candidate, nextStage, workflowActions);

    const hasEmail = matchingAction && matchingAction.templateId && matchingAction.templateId !== 'none';

    if (matchingAction && hasEmail) {
      const template = templates.find((t) => t.id === matchingAction.templateId);
      const templateName = template ? template.name : 'Outbound Notification';

      // Perform full merge-tag replacement for live preview & editing
      const languagesStr = Array.isArray(candidate.workingLanguages) && candidate.workingLanguages.length > 0
        ? candidate.workingLanguages.map((l) => `${l.language} (${l.proficiency})`).join(", ")
        : "N/A";

      const mergeValues: Record<string, string> = {
        Vendor_Name:    candidate.contactName   || "Specialist",
        Contact_Name:   candidate.contactName   || "Specialist",
        Company_Name:   candidate.companyName   || "",
        Email:          candidate.email         || "",
        Language:       languagesStr,
        Adjusted_Rate:  candidate.adjustedRate  ? `$${candidate.adjustedRate}` : "Negotiated",
        Project_Link:   nextStage === 'nda' || candidate.stage === 'nda'
          ? `https://mlc-vendor-recruitment.web.app/portal/nda/${candidate.id}`
          : `https://mlc-vendor-recruitment.web.app/portal/onboarding/${candidate.id}`,
        NDA_Status:     candidate.hasSignedNda  ? "NDA Verified" : "NDA Missing / Required",
        Stage:          stages.find(s => s.id === nextStage)?.name || nextStage,
        Status:         candidate.status        || "",
      };

      const replaceMergeTags = (text: string): string => {
        let result = text;
        Object.entries(mergeValues).forEach(([key, val]) => {
          const tag = `{{${key}}}`;
          while (result.includes(tag)) {
            result = result.split(tag).join(val);
          }
        });
        return result;
      };

      const rawSubject = template ? template.subject : 'Stage Transition Notification';
      const rawBody = template ? template.body : 'Your candidate profile stage has been updated.';

      const previewSubject = replaceMergeTags(rawSubject);
      const previewBody = replaceMergeTags(rawBody);

      setPendingTransition({
        vendorId,
        targetStage: nextStage,
        actionName: matchingAction.name,
        templateName,
        recipientType: matchingAction.recipientType === 'both' ? 'Vendor & MLC Copy' : matchingAction.recipientType.toUpperCase(),
        previewSubject,
        previewBody,
        matchedRule: matchingAction
      });
    } else {
      // Direct commit with status update rule applied (no email attached)
      commitStageChange(vendorId, nextStage, matchingAction || undefined, { sendEmail: false });
    }
  };

  const commitStageChange = async (
    vendorId: string, 
    nextStage: WorkflowStage, 
    matchedRule?: WorkflowAction,
    emailOptions?: { sendEmail: boolean; customSubject?: string; customBody?: string }
  ) => {
    const existingVendor = vendors.find((v) => v.id === vendorId);
    if (!existingVendor) return;

    let newStatus = existingVendor.status;
    
    // Apply rule status update if configured
    if (matchedRule && matchedRule.updateStatus && matchedRule.updateStatus !== 'none') {
      newStatus = matchedRule.updateStatus;
    } else if (matchedRule && matchedRule.updateValue && matchedRule.updateValue !== 'none') {
      newStatus = matchedRule.updateValue;
    } else if (nextStage === 'ready_for_pm') {
      newStatus = 'approved';
    }

    const updatedVendor: VendorProfile = {
      ...existingVendor,
      stage: nextStage,
      status: newStatus,
      stageStatus: 'started', // Resets to started for the newly assigned stage
      updatedAt: new Date().toISOString()
    };

    // Set suppressWorkflowEmail: true on vendor payload so Cloud Function won't double-send unedited template
    const vendorPayload = sanitizePayload({
      ...updatedVendor,
      suppressWorkflowEmail: true
    });

    try {
      // Save updated vendor in Firestore
      await setDoc(doc(db, 'vendors', vendorId), vendorPayload);

      // Auto-provision test record if candidate transitions to testing stages
      if (nextStage === 'ready_for_testing' || nextStage === 'in_testing') {
        const testId = `test-${vendorId}`;
        const testDocRef = doc(db, 'tests', testId);
        const testDocSnap = await getDoc(testDocRef);
        if (!testDocSnap.exists()) {
          const primaryLang = existingVendor.workingLanguages?.[0]?.language || 'Primary Language';
          const newTest: TestRecord = {
            id: testId,
            vendorId: vendorId,
            vendorName: existingVendor.contactName,
            language: primaryLang,
            service: existingVendor.services?.[0] || 'Translation',
            projectNumber: `PR-${Math.floor(1000 + Math.random() * 9000)}-${vendorId.toUpperCase().slice(-2)}`,
            assignmentLink: `https://mlconnections.com/portal/assess-${vendorId}`,
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'assigned',
            graderId: 'admin'
          };
          await setDoc(testDocRef, newTest);

          const updatedLangs = (existingVendor.workingLanguages || []).map((l, idx) => {
            if (idx === 0) {
              return { ...l, testRequired: true, testStatus: 'pending' as const, testId };
            }
            return l;
          });
          await setDoc(doc(db, 'vendors', vendorId), { workingLanguages: updatedLangs }, { merge: true });
        }
      }

      // If user chose "Confirm & Send", queue the customized email in notifications collection
      if (emailOptions?.sendEmail && matchedRule && matchedRule.templateId && matchedRule.templateId !== 'none') {
        const tmpl = templates.find((t) => t.id === matchedRule.templateId);
        const templateName = tmpl ? tmpl.name : 'Outbound Notification';
        const subject = emailOptions.customSubject || (tmpl ? tmpl.subject : 'Stage Transition Notification');
        const body = emailOptions.customBody || (tmpl ? tmpl.body : 'Your candidate profile stage has been updated.');

        const notifId = `notif-${Date.now()}`;
        const notifRecord = {
          id: notifId,
          vendorId: existingVendor.id,
          vendorName: existingVendor.contactName,
          vendorEmail: existingVendor.email,
          actionName: matchedRule.name,
          templateId: matchedRule.templateId,
          templateName,
          recipientType: matchedRule.recipientType,
          status: 'queued',
          subject,
          body,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'notifications', notifId), notifRecord);
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

    // Populate Detailed Evaluation fields for edit mode
    setEditCountry(vendor.country || 'United States');
    setEditTimeZone(vendor.timeZone || 'UTC-05:00 Eastern Time');
    setEditAvailableStartDate(vendor.availableStartDate || 'Immediately');
    setEditWeeklyAvailability(vendor.weeklyAvailability || 'up_to_20');
    setEditOtherLanguages(vendor.otherLanguages || '');
    setEditMtqaExperienceYears(vendor.mtqaExperienceYears || '1_to_3');
    setEditHandsOnExperienceAreas(vendor.handsOnExperienceAreas || []);
    setEditAgilitySelfAssessment(vendor.agilitySelfAssessment || {
      qaPlatforms: 2,
      grammarStyle: 3,
      errorTagging: 3,
      policyFeedback: 2
    });
    setEditErrorTaggingExperience(vendor.errorTaggingExperience || 'basic');
    setIsEditing(true);
  };

const sanitizePayload = <T extends Record<string, any>>(obj: T): T => {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned as T;
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
      secondaryEmail: editIsGmail ? '' : editSecondaryEmail.trim(),
      isGmail: editIsGmail,
      phone: editPhone.trim(),
      hoursAvailable: parseInt(editHours) || 0,
      mtPeExperience: editExperience,
      prozProfile: editProz.trim(),
      linkedInProfile: editLinkedin.trim(),
      services: editServices.split(',').map((s) => s.trim()).filter(Boolean),
      classificationTier: editTier,
      mlcHourlyRate: parseFloat(editMlcRate) || 0,
      adjustedRate: Math.round((parseFloat(editMlcRate) || 0) * 0.9),
      confirmedRate: parseFloat(editConfirmedRate) || 0,
      status: editStatus,
      ndaUrl: editNdaUrl.trim(),
      hasSignedNda: editHasSignedNda,
      workingLanguages: editLanguages.length > 0 ? editLanguages : [{ language: 'English', proficiency: 'working' }],
      country: editCountry,
      timeZone: editTimeZone,
      availableStartDate: editAvailableStartDate,
      weeklyAvailability: editWeeklyAvailability,
      otherLanguages: editOtherLanguages,
      mtqaExperienceYears: editMtqaExperienceYears,
      handsOnExperienceAreas: editHandsOnExperienceAreas,
      agilitySelfAssessment: editAgilitySelfAssessment,
      errorTaggingExperience: editErrorTaggingExperience,
      updatedAt: new Date().toISOString()
    };

    try {
      const cleanPayload = sanitizePayload(updatedProfile);
      await setDoc(doc(db, 'vendors', selectedVendor.id), cleanPayload);

      setVendors((prev) => prev.map((v) => v.id === selectedVendor.id ? updatedProfile : v));
      setSelectedVendor(updatedProfile);
      setIsEditing(false);
      alert(`Candidate profile for "${editContactName}" saved successfully.`);
    } catch (err) {
      console.error("Failed to commit profile edit to Firestore", err);
      alert("Failed to save changes: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteVendor = async (vendor: VendorProfile) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete the profile for "${vendor.contactName}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'vendors', vendor.id));
      setVendors((prev) => prev.filter((v) => v.id !== vendor.id));
      setSelectedVendor(null);
      setIsEditing(false);
      alert(`Candidate profile "${vendor.contactName}" deleted successfully.`);
    } catch (err) {
      console.error("Failed to delete candidate profile from Firestore", err);
      alert("Failed to delete profile: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleUpdateStageStatus = async (
    vendorId: string, 
    newStageStatus: 'started' | 'completed' | 'failed' | 'non_responsive'
  ) => {
    const candidate = vendors.find((v) => v.id === vendorId);
    if (!candidate) return;

    const updatedCandidate: VendorProfile = {
      ...candidate,
      stageStatus: newStageStatus,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'vendors', vendorId), sanitizePayload(updatedCandidate));
      setVendors((prev) => prev.map((v) => v.id === vendorId ? updatedCandidate : v));
      setSelectedVendor((prev) => prev && prev.id === vendorId ? updatedCandidate : prev);
    } catch (err) {
      console.error("Failed to update stage status in Firestore", err);
    }
  };

  const renderStageStatusSelector = (candidate: VendorProfile) => {
    const currentStatus = candidate.stageStatus || 'started';
    const matchedOpt = stageProgressOptions.find((o) => o.key === currentStatus);
    const statusStyle = getStageProgressStyle(matchedOpt?.color, currentStatus);

    return (
      <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
        <select
          value={currentStatus}
          onChange={(e) => handleUpdateStageStatus(candidate.id, e.target.value as any)}
          className={`py-1 pl-2 pr-6 text-[10px] font-extrabold border rounded-lg cursor-pointer focus:outline-none font-sans appearance-none ${statusStyle}`}
          title="Click to update Stage Progress status"
        >
          {stageProgressOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
        <span className="w-1.5 h-1.5 rounded-full absolute right-2 pointer-events-none bg-current"></span>
      </div>
    );
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
      secondaryEmail: formIsGmail ? '' : formSecondaryEmail.trim(),
      phone: formPhone.trim(),
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
      hoursAvailable: parseInt(formHours) || 0,
      mtPeExperience: formExperience,
      prozProfile: formProz.trim(),
      linkedInProfile: formLinkedin.trim(),
      ndaUrl: formNdaUrl.trim(),
      resumeName: uploadedResumeName || '',
      hasSignedNda: false,
      stageStatus: 'started',
      country: formCountry,
      timeZone: formTimeZone,
      availableStartDate: formAvailableStartDate,
      weeklyAvailability: formWeeklyAvailability,
      otherLanguages: formOtherLanguages,
      mtqaExperienceYears: formMtqaExperienceYears,
      handsOnExperienceAreas: formHandsOnExperienceAreas,
      agilitySelfAssessment: formAgilitySelfAssessment,
      errorTaggingExperience: formErrorTaggingExperience,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const cleanPayload = sanitizePayload(newLead);
      await setDoc(doc(db, 'vendors', newLead.id), cleanPayload);

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
      const contact = (v.contactName || '').toLowerCase();
      const company = (v.companyName || '').toLowerCase();
      const query = (search || '').trim().toLowerCase();

      const matchesSearch = !query || 
        contact.includes(query) ||
        company.includes(query) ||
        (Array.isArray(v.workingLanguages) && (v.workingLanguages as any[]).some((l: any) => {
          if (!l) return false;
          if (typeof l === 'string') return String(l).toLowerCase().includes(query);
          return l.language && String(l.language).toLowerCase().includes(query);
        })) ||
        (Array.isArray(v.services) && (v.services as any[]).some((s: any) => s && String(s).toLowerCase().includes(query)));
      
      const matchesStage = selectedStageFilters.length === 0 || (v.stage && selectedStageFilters.includes(v.stage));
      
      const matchesLang = selectedLanguageFilters.length === 0 || (Array.isArray(v.workingLanguages) && (v.workingLanguages as any[]).some((l: any) => {
        if (!l) return false;
        const langName = typeof l === 'string' ? l : l.language;
        return selectedLanguageFilters.includes(langName);
      }));

      const candidateStatus = v.status || 'pending';
      const matchesStatus = selectedStatusFilters.length === 0 || selectedStatusFilters.includes(candidateStatus);

      const candidateApp = v.applicationName || (v.applicationId ? v.applicationId : 'Default Application');
      const matchesApp = selectedAppFilters.length === 0 || selectedAppFilters.includes(candidateApp);

      return matchesSearch && matchesStage && matchesLang && matchesStatus && matchesApp;
    });
  }, [vendors, search, selectedStageFilters, selectedLanguageFilters, selectedStatusFilters, selectedAppFilters]);

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
        const langsA = Array.isArray(a.workingLanguages) ? a.workingLanguages : [];
        const langsB = Array.isArray(b.workingLanguages) ? b.workingLanguages : [];
        valA = typeof langsA[0] === 'string' ? langsA[0] : (langsA[0]?.language || '');
        valB = typeof langsB[0] === 'string' ? langsB[0] : (langsB[0]?.language || '');
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredVendors, sortField, sortOrder]);

  // Stage aggregates (funnel count)
  const funnelStats = useMemo(() => {
    const aggregates: Record<string, { total: number; counts: Record<string, number> }> = {};
    stages.forEach((stg) => {
      aggregates[stg.id] = { total: 0, counts: {} };
      stageProgressOptions.forEach((opt) => {
        aggregates[stg.id].counts[opt.key] = 0;
      });
    });

    vendors.forEach((v) => {
      const vStage = v.stage || 'outreach';
      if (!aggregates[vStage]) {
        aggregates[vStage] = { total: 0, counts: {} };
        stageProgressOptions.forEach((opt) => {
          aggregates[vStage].counts[opt.key] = 0;
        });
      }
      aggregates[vStage].total++;
      const st = v.stageStatus || 'started';
      aggregates[vStage].counts[st] = (aggregates[vStage].counts[st] || 0) + 1;
    });

    return aggregates;
  }, [vendors, stages, stageProgressOptions]);

  const handleExportCSV = () => {
    const headers = [
      'Company Name', 'Contact Name', 'Email', 'Secondary Email', 'Phone',
      'Services', 'Languages', 'Tier', 'Hourly Rate (Client)', 'Adjusted Rate (Offer)',
      'Confirmed Rate (Negotiated)', 'Stage', 'Status', 'Signed NDA', 'Submitted At'
    ];
    
    const rows = sortedVendors.map((v) => [
      v.companyName || 'N/A',
      v.contactName || 'N/A',
      v.email || '',
      v.secondaryEmail || '',
      v.phone || '',
      Array.isArray(v.services) ? v.services.join('; ') : '',
      Array.isArray(v.workingLanguages) 
        ? v.workingLanguages.map((l) => typeof l === 'string' ? l : `${l?.language || 'N/A'} (${l?.proficiency || 'working'})`).join('; ') 
        : '',
      v.classificationTier || 2,
      v.mlcHourlyRate || 0,
      v.adjustedRate || 0,
      v.confirmedRate || 0,
      v.stage || 'outreach',
      v.status || 'pending',
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
            onClick={handleExportCSV}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-border-dark text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 btn-animate cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4 text-primary" />
            Export CSV
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="py-2.5 px-4 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl flex items-center gap-2 btn-animate shadow-md shadow-primary/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Linguist
          </button>
        </div>
      </div>

      {/* Funnel Pipeline aggregated counts */}
      <section className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Workflow Stages Filter ({selectedStageFilters.length === 0 ? 'Showing All Stages' : `${selectedStageFilters.length} Selected`})
          </h4>

          {selectedStageFilters.length > 0 && (
            <button
              onClick={() => setSelectedStageFilters([])}
              className="text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 py-1 px-3 rounded-lg transition-colors cursor-pointer"
            >
              Clear Stage Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
          {stages.map((stg) => {
            const stat = funnelStats[stg.id] || { total: 0, counts: {} };
            const isSelected = selectedStageFilters.includes(stg.id);
            const activeCounts = stageProgressOptions.filter((opt) => (stat.counts[opt.key] || 0) > 0);

            return (
              <div 
                key={stg.id} 
                onClick={() => {
                  setSelectedStageFilters((prev) => 
                    prev.includes(stg.id) 
                      ? prev.filter((id) => id !== stg.id) 
                      : [...prev, stg.id]
                  );
                }}
                className={`flex flex-col items-center p-3 rounded-2xl border transition-all text-center relative group cursor-pointer ${
                  isSelected 
                    ? 'bg-primary/10 border-primary shadow-sm ring-2 ring-primary/20' 
                    : 'bg-slate-50 dark:bg-bg-dark border-slate-200/10 hover:border-primary/30'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center text-[9px] font-extrabold shadow-sm">
                    ✓
                  </div>
                )}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 ${
                  stat.total > 0 ? 'bg-primary text-white shadow-md shadow-primary/25' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                }`}>
                  {stat.total}
                </div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 tracking-tight line-clamp-1">
                  {stg.name}
                </span>
                <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 mt-1 text-[9px] font-bold">
                  {activeCounts.length === 0 ? (
                    <span className="text-slate-400">0</span>
                  ) : (
                    activeCounts.map((opt, i) => (
                      <React.Fragment key={opt.key}>
                        {i > 0 && <span className="text-slate-300 dark:text-slate-700">|</span>}
                        <span className={getStageProgressTextColor(opt.color, opt.key)} title={opt.label}>
                          {opt.label}: {stat.counts[opt.key]}
                        </span>
                      </React.Fragment>
                    ))
                  )}
                </div>
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
          
          {/* Multi-Select Language Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsLangDropdownOpen(!isLangDropdownOpen);
                setIsStatusDropdownOpen(false);
              }}
              className="pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white flex items-center gap-2 font-bold cursor-pointer shadow-sm relative"
            >
              <span>
                {selectedLanguageFilters.length === 0
                  ? 'All Languages'
                  : selectedLanguageFilters.length === 1
                  ? selectedLanguageFilters[0]
                  : `Languages (${selectedLanguageFilters.length})`}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            </button>

            {isLangDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-xl z-50 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2 text-xs font-bold text-slate-500">
                  <span>Filter by Language</span>
                  {selectedLanguageFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedLanguageFilters([])}
                      className="text-rose-500 hover:underline text-[10px]"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                  {activeLanguages.map((lang) => {
                    const isChecked = selectedLanguageFilters.includes(lang);
                    return (
                      <label
                        key={lang}
                        className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedLanguageFilters(selectedLanguageFilters.filter(l => l !== lang));
                            } else {
                              setSelectedLanguageFilters([...selectedLanguageFilters, lang]);
                            }
                          }}
                          className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                        <span>{lang}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Multi-Select Linguist Status Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsStatusDropdownOpen(!isStatusDropdownOpen);
                setIsLangDropdownOpen(false);
              }}
              className="pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white flex items-center gap-2 font-bold cursor-pointer shadow-sm relative"
            >
              <span>
                {selectedStatusFilters.length === 0
                  ? 'All Statuses'
                  : selectedStatusFilters.length === 1
                  ? selectedStatusFilters[0].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                  : `Statuses (${selectedStatusFilters.length})`}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-xl z-50 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2 text-xs font-bold text-slate-500">
                  <span>Filter by Status</span>
                  {selectedStatusFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedStatusFilters([])}
                      className="text-rose-500 hover:underline text-[10px]"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                  {activeStatuses.map((st) => {
                    const isChecked = selectedStatusFilters.includes(st.key);
                    const label = st.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    return (
                      <label
                        key={st.key}
                        className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedStatusFilters(selectedStatusFilters.filter(k => k !== st.key));
                            } else {
                              setSelectedStatusFilters([...selectedStatusFilters, st.key]);
                            }
                          }}
                          className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Multi-Select Application Source Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsAppDropdownOpen(!isAppDropdownOpen);
                setIsStatusDropdownOpen(false);
                setIsLangDropdownOpen(false);
              }}
              className="pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white flex items-center gap-2 font-bold cursor-pointer shadow-sm relative"
            >
              <span>
                {selectedAppFilters.length === 0
                  ? 'All Applications'
                  : selectedAppFilters.length === 1
                  ? selectedAppFilters[0]
                  : `Applications (${selectedAppFilters.length})`}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            </button>

            {isAppDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-xl z-50 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2 text-xs font-bold text-slate-500">
                  <span>Filter by Application</span>
                  {selectedAppFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedAppFilters([])}
                      className="text-rose-500 hover:underline text-[10px]"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                  {['Default Application', ...applicationsList.map(a => a.name)].map((appName) => {
                    const isChecked = selectedAppFilters.includes(appName);
                    return (
                      <label
                        key={appName}
                        className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedAppFilters(selectedAppFilters.filter(a => a !== appName));
                            } else {
                              setSelectedAppFilters([...selectedAppFilters, appName]);
                            }
                          }}
                          className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                        <span className="truncate text-xs">{appName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* View Switcher Presets */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-bg-dark p-1 rounded-2xl border border-slate-200/50 dark:border-border-dark overflow-x-auto">
            <button
              type="button"
              onClick={() => setPresetView('standard')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                presetView === 'standard'
                  ? 'bg-white dark:bg-card-dark text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Standard View
            </button>
            <button
              type="button"
              onClick={() => setPresetView('detailed_eval')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                presetView === 'detailed_eval'
                  ? 'bg-white dark:bg-card-dark text-primary shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Full Detailed View
            </button>
            <button
              type="button"
              onClick={() => setPresetView('workflow_hiring')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                presetView === 'workflow_hiring'
                  ? 'bg-white dark:bg-card-dark text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Workflow & Hiring View
            </button>
            <button
              type="button"
              onClick={() => setPresetView('domain_agility')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                presetView === 'domain_agility'
                  ? 'bg-white dark:bg-card-dark text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Fields View
            </button>
          </div>
          
          <button
            type="button"
            onClick={() => setIsCopyLinkModalOpen(true)}
            className="py-2 px-4 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-xl font-bold text-xs flex items-center gap-1.5 btn-animate cursor-pointer"
            title="Copy Public Linguist Application Form URL"
          >
            <LinkIcon className="w-4.5 h-4.5 text-primary" />
            Copy Application Link
          </button>
        </div>
      </section>

      {/* Copy Application Link Popover Modal */}
      <AnimatePresence>
        {isCopyLinkModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCopyLinkModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-card-dark rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200/50 dark:border-border-dark z-50 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    Copy Application Link
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Select an active intake form link to copy to clipboard.</p>
                </div>
                <button
                  onClick={() => setIsCopyLinkModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {/* Default General Form */}
                <div className="p-3 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/50 dark:border-border-dark flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">Default Application</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-primary/10 text-primary border border-primary/20">Default</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 block mt-0.5">/portal/apply</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/portal/apply`;
                      navigator.clipboard.writeText(url);
                      setCopiedAppSlug('default');
                      setTimeout(() => setCopiedAppSlug(null), 2500);
                    }}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                      copiedAppSlug === 'default'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-primary hover:bg-primary-dark text-white shadow-xs'
                    }`}
                  >
                    {copiedAppSlug === 'default' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedAppSlug === 'default' ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>

                {/* Custom Application Links */}
                {applicationsList.filter(a => a.isActive).map((app) => {
                  const slugKey = app.slug || app.id;
                  const isCopied = copiedAppSlug === slugKey;
                  const fullUrl = `${window.location.origin}/portal/apply/${slugKey}`;

                  return (
                    <div key={app.id} className="p-3 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/50 dark:border-border-dark flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">{app.name}</span>
                          {!app.collectRates && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">No Rates</span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 block mt-0.5">/{slugKey}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(fullUrl);
                          setCopiedAppSlug(slugKey);
                          setTimeout(() => setCopiedAppSlug(null), 2500);
                        }}
                        className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-500 text-white'
                            : 'bg-primary hover:bg-primary-dark text-white shadow-xs'
                        }`}
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Need to create a specialized application?</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsCopyLinkModalOpen(false);
                    window.location.hash = '#portals';
                  }}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Manage Applications →
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                        {/* SLA Nudge Stagnant Warning Banner */}
                        {(() => {
                          const daysStagnant = Math.floor((Date.now() - new Date(candidate.updatedAt || candidate.submittedAt || Date.now()).getTime()) / 86400000);
                          const isNdaStagnant = slaNudgesConfig.enabled && candidate.stage === 'nda' && !candidate.hasSignedNda && daysStagnant >= (slaNudgesConfig.ndaWaitDays || 3);
                          
                          if (!isNdaStagnant) return null;

                          return (
                            <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                <span>SLA Stagnant ({daysStagnant}d in NDA)</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendNdaNudge(candidate);
                                }}
                                className="py-1 px-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-extrabold text-[10px] btn-animate cursor-pointer shadow-sm flex items-center gap-1"
                                title="Send 1-Click NDA Nudge Email"
                              >
                                <Mail className="w-3 h-3" />
                                Send Nudge
                              </button>
                            </div>
                          );
                        })()}

                        <div className="flex flex-wrap gap-1.5 cursor-pointer" onClick={() => setSelectedVendor(candidate)}>
                          {Array.isArray(candidate.workingLanguages) && candidate.workingLanguages.map((l, i) => (
                            <span key={i} className="text-[10px] bg-primary/10 text-primary py-0.5 px-2.5 rounded-md font-semibold">
                              {typeof l === 'string' ? l : `${l?.language || 'N/A'} (${l?.proficiency || 'working'})`}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Quick-Stage & Progress selector directly in Card View */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Workflow stage:</span>
                          <select
                            value={candidate.stage}
                            onChange={(e) => handleStageChangeRequest(candidate.id, e.target.value as WorkflowStage)}
                            className="p-1 text-[11px] font-bold bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-lg dark:text-white cursor-pointer focus:outline-none focus:border-primary"
                          >
                            {stages.map((stg) => (
                              <option key={stg.id} value={stg.id}>{stg.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Stage Progress:</span>
                          {renderStageStatusSelector(candidate)}
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

                    {presetView === 'standard' && (
                      <>
                        <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => toggleSort('companyName')}>Company Name</th>
                        <th className="p-4">Languages</th>
                        <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => toggleSort('status')}>Linguist Status</th>
                        <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => toggleSort('stage')}>Workflow Stage</th>
                        <th className="p-4">Stage Progress</th>
                        <th className="p-4 text-center">Hours</th>
                        <th className="p-4">NDA</th>
                        <th className="p-4 text-right pr-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => toggleSort('confirmedRate')}>Agreed Rate</th>
                      </>
                    )}

                    {presetView === 'detailed_eval' && (
                      <>
                        <th className="p-4">Country & Timezone</th>
                        <th className="p-4">MTQA Exp (Years)</th>
                        <th className="p-4">Technical Agility Avg</th>
                        <th className="p-4">Error-Tagging Exp</th>
                        <th className="p-4">Start Date</th>
                        <th className="p-4">Availability</th>
                        <th className="p-4 text-right pr-6">Full Profile</th>
                      </>
                    )}

                    {presetView === 'workflow_hiring' && (
                      <>
                        <th className="p-4">Workflow Stage</th>
                        <th className="p-4">Stage Progress</th>
                        <th className="p-4">Available Start Date</th>
                        <th className="p-4">Weekly Availability</th>
                        <th className="p-4">NDA Verification</th>
                        <th className="p-4">Intake Application</th>
                        <th className="p-4 text-right pr-6">Actions</th>
                      </>
                    )}

                    {presetView === 'domain_agility' && (
                      <>
                        <th className="p-4">Languages</th>
                        <th className="p-4">Hands-On Domain Badges</th>
                        <th className="p-4">Agility Self-Assessment (QA/Grammar/Errors/Policy)</th>
                        <th className="p-4">Taxonomy Exp</th>
                        <th className="p-4 text-right pr-6">Profile</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {sortedVendors.map((candidate) => {
                    const statusConf = activeStatuses.find(s => s.key === candidate.status);
                    const statusColorClass = statusConf 
                      ? STATUS_COLORS_MAP[statusConf.color] || STATUS_COLORS_MAP.gray
                      : STATUS_COLORS_MAP.gray;
                    
                    const agilityScores = candidate.agilitySelfAssessment 
                      ? Object.values(candidate.agilitySelfAssessment) 
                      : [];
                    const agilityAvg = agilityScores.length > 0
                      ? (agilityScores.reduce((a, b) => a + b, 0) / agilityScores.length).toFixed(1)
                      : null;

                    return (
                      <tr 
                        key={candidate.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => setSelectedVendor(candidate)}
                      >
                        <td className="p-4 pl-6 font-bold text-slate-900 dark:text-white">
                          <div>
                            <span>{candidate.contactName}</span>
                            {candidate.email && (
                              <span className="text-[10px] text-slate-400 font-mono block font-normal">{candidate.email}</span>
                            )}
                          </div>
                        </td>

                        {/* Standard View Cells */}
                        {presetView === 'standard' && (
                          <>
                            <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">
                              {candidate.companyName || <span className="text-slate-400 italic">Individual</span>}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {Array.isArray(candidate.workingLanguages) && candidate.workingLanguages.map((l, i) => (
                                  <span key={i} className="text-[10px] bg-primary/10 text-primary py-0.5 px-2 rounded-md font-semibold">
                                    {typeof l === 'string' ? l : (l?.language || 'N/A')}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex px-2 py-0.5 border text-[9px] font-bold rounded-lg uppercase tracking-wider ${statusColorClass}`}>
                                {(candidate.status || 'pending').toString().replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={candidate.stage}
                                onChange={(e) => handleStageChangeRequest(candidate.id, e.target.value as WorkflowStage)}
                                className="p-1.5 text-xs font-bold bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl dark:text-white cursor-pointer focus:outline-none"
                              >
                                {stages.map((stg) => (
                                  <option key={stg.id} value={stg.id}>{stg.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                              {renderStageStatusSelector(candidate)}
                            </td>
                            <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">
                              {candidate.hoursAvailable ? `${candidate.hoursAvailable}h/wk` : 'N/A'}
                            </td>
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
                            <td className="p-4 text-right pr-6 font-extrabold text-slate-950 dark:text-white">
                              {candidate.confirmedRate > 0 ? `$${candidate.confirmedRate}/hr` : 'Negotiating'}
                            </td>
                          </>
                        )}

                        {/* Full Detailed Evaluation View Cells */}
                        {presetView === 'detailed_eval' && (
                          <>
                            <td className="p-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                              {candidate.country || candidate.timeZone ? (
                                <div>
                                  <span className="font-bold block">{candidate.country || 'N/A'}</span>
                                  <span className="text-[10px] text-slate-400 font-mono block">{candidate.timeZone}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Not specified</span>
                              )}
                            </td>
                            <td className="p-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                              {candidate.mtqaExperienceYears ? (
                                candidate.mtqaExperienceYears.replace('_to_', '–').replace('_plus', '+').replace('less_than_', '< ') + ' yrs'
                              ) : candidate.mtPeExperience ? (
                                candidate.mtPeExperience + ' yrs'
                              ) : (
                                <span className="text-slate-400 font-normal italic">N/A</span>
                              )}
                            </td>
                            <td className="p-4">
                              {agilityAvg ? (
                                <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                                  parseFloat(agilityAvg) >= 2.5 
                                    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25' 
                                    : 'bg-amber-500/15 text-amber-600 border-amber-500/25'
                                }`}>
                                  ★ {agilityAvg} / 3.0
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Unrated</span>
                              )}
                            </td>
                            <td className="p-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                              {candidate.errorTaggingExperience ? (
                                <span className="capitalize font-bold text-primary">
                                  {candidate.errorTaggingExperience.replace('_', ' ')}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">N/A</span>
                              )}
                            </td>
                            <td className="p-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {candidate.availableStartDate || 'Immediate'}
                            </td>
                            <td className="p-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {candidate.weeklyAvailability ? (
                                candidate.weeklyAvailability.replace('_than_', ' ').replace('_to_', '–').replace('_plus', '+') + ' hrs/wk'
                              ) : candidate.hoursAvailable ? (
                                `${candidate.hoursAvailable} hrs/wk`
                              ) : (
                                'N/A'
                              )}
                            </td>
                            <td className="p-4 text-right pr-6">
                              <button
                                type="button"
                                onClick={() => setSelectedVendor(candidate)}
                                className="px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-bold transition-colors"
                              >
                                Full View →
                              </button>
                            </td>
                          </>
                        )}

                        {/* Workflow & Hiring View Cells */}
                        {presetView === 'workflow_hiring' && (
                          <>
                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={candidate.stage}
                                onChange={(e) => handleStageChangeRequest(candidate.id, e.target.value as WorkflowStage)}
                                className="p-1.5 text-xs font-bold bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl dark:text-white cursor-pointer focus:outline-none"
                              >
                                {stages.map((stg) => (
                                  <option key={stg.id} value={stg.id}>{stg.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                              {renderStageStatusSelector(candidate)}
                            </td>
                            <td className="p-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                              {candidate.availableStartDate || 'Immediate'}
                            </td>
                            <td className="p-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                              {candidate.weeklyAvailability ? (
                                candidate.weeklyAvailability.replace('_than_', ' ').replace('_to_', '–').replace('_plus', '+') + ' hrs/wk'
                              ) : (
                                candidate.hoursAvailable ? `${candidate.hoursAvailable} hrs` : 'N/A'
                              )}
                            </td>
                            <td className="p-4">
                              {candidate.hasSignedNda ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">🟢 Signed</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-500/15 text-rose-600 border border-rose-500/20">🔴 Missing</span>
                              )}
                            </td>
                            <td className="p-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                              {candidate.applicationName || 'General Form'}
                            </td>
                            <td className="p-4 text-right pr-6">
                              <button
                                type="button"
                                onClick={() => setSelectedVendor(candidate)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
                              >
                                Manage
                              </button>
                            </td>
                          </>
                        )}

                        {/* Domain & Agility View Cells */}
                        {presetView === 'domain_agility' && (
                          <>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1 max-w-[180px]">
                                {Array.isArray(candidate.workingLanguages) && candidate.workingLanguages.map((l, i) => (
                                  <span key={i} className="text-[10px] bg-primary/10 text-primary py-0.5 px-2 rounded-md font-semibold">
                                    {typeof l === 'string' ? l : (l?.language || 'N/A')}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-4">
                              {candidate.handsOnExperienceAreas && candidate.handsOnExperienceAreas.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[240px]">
                                  {candidate.handsOnExperienceAreas.map((area, i) => (
                                    <span key={i} className="text-[9px] font-extrabold bg-purple-500/15 text-purple-600 dark:text-purple-400 py-0.5 px-2 rounded-md border border-purple-500/20">
                                      {area}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Unspecified</span>
                              )}
                            </td>
                            <td className="p-4">
                              {candidate.agilitySelfAssessment ? (
                                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold">
                                  <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded">QA: {candidate.agilitySelfAssessment.qaPlatforms}/3</span>
                                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded">Grammar: {candidate.agilitySelfAssessment.grammarStyle}/3</span>
                                  <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded">Tags: {candidate.agilitySelfAssessment.errorTagging}/3</span>
                                  <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-600 rounded">Policy: {candidate.agilitySelfAssessment.policyFeedback}/3</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Unrated</span>
                              )}
                            </td>
                            <td className="p-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {candidate.errorTaggingExperience ? (
                                <span className="capitalize">{candidate.errorTaggingExperience.replace('_', ' ')}</span>
                              ) : (
                                <span className="text-slate-400 italic">N/A</span>
                              )}
                            </td>
                            <td className="p-4 text-right pr-6">
                              <button
                                type="button"
                                onClick={() => setSelectedVendor(candidate)}
                                className="px-2.5 py-1 bg-purple-500/10 text-purple-600 hover:bg-purple-500 hover:text-white rounded-lg text-xs font-bold transition-colors"
                              >
                                Agility Details →
                              </button>
                            </td>
                          </>
                        )}
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
                    {!isEditing && selectedVendor.workingLanguages && selectedVendor.workingLanguages.length > 1 && (
                      <button
                        onClick={() => setSplitPrompt({ vendor: selectedVendor, targetStage: selectedVendor.stage })}
                        className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Split candidate into separate language profiles"
                      >
                        <Grid className="w-3.5 h-3.5" />
                        Split Languages
                      </button>
                    )}
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

                    {/* Working Languages */}
                    <div className="space-y-3 p-4 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/20 dark:border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">
                          Working Languages
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {editLanguages.length} Registered Pair(s)
                        </span>
                      </div>

                      {/* Add new language pair */}
                      <div className="flex gap-2">
                        <select
                          id="edit-lang-select"
                          className="flex-1 p-2 text-xs bg-white dark:bg-card-dark border rounded-xl text-slate-900 dark:text-white font-bold"
                        >
                          {activeLanguages.map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                        <select
                          id="edit-prof-select"
                          className="p-2 text-xs bg-white dark:bg-card-dark border rounded-xl text-slate-900 dark:text-white font-bold"
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
                          className="py-1.5 px-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-xs cursor-pointer btn-animate"
                        >
                          Add Pair
                        </button>
                      </div>

                      {/* Working Languages Tags List */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {editLanguages.map((l) => (
                          <div 
                            key={l.language} 
                            className="px-3 py-1.5 bg-white dark:bg-card-dark rounded-xl border border-slate-200/50 dark:border-border-dark flex items-center gap-2 text-xs shadow-sm"
                          >
                            <span className="font-extrabold text-slate-900 dark:text-white">{l.language}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary capitalize border border-primary/20">
                              {l.proficiency}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveLanguageFromEdit(l.language)}
                              className="text-slate-400 hover:text-rose-500 font-extrabold ml-1 cursor-pointer text-sm"
                              title="Remove Language Pair"
                            >
                              ×
                            </button>
                          </div>
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

                    {/* Edit Detailed Evaluation Section */}
                    <div className="space-y-3 p-3.5 bg-primary/5 rounded-2xl border border-primary/20">
                      <span className="text-[10px] text-primary uppercase font-extrabold tracking-wider block flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Detailed Evaluation & Location Profile
                      </span>

                      {/* Country & Time Zone */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase block">Country of Residence</label>
                          <select
                            value={editCountry}
                            onChange={(e) => setEditCountry(e.target.value)}
                            className="w-full p-2 text-xs bg-white dark:bg-card-dark border rounded-lg dark:text-white"
                          >
                            {COUNTRIES.map((c) => (
                              <option key={c.code} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase block">Time Zone</label>
                          <select
                            value={editTimeZone}
                            onChange={(e) => setEditTimeZone(e.target.value)}
                            className="w-full p-2 text-xs bg-white dark:bg-card-dark border rounded-lg dark:text-white"
                          >
                            {TIME_ZONES.map((tz) => (
                              <option key={tz.value} value={tz.label}>{tz.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Start Date & Weekly Availability */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase block">Available Start Date</label>
                          <input
                            type="text"
                            value={editAvailableStartDate}
                            onChange={(e) => setEditAvailableStartDate(e.target.value)}
                            placeholder="e.g. Immediately"
                            className="w-full p-2 text-xs bg-white dark:bg-card-dark border rounded-lg dark:text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase block">Weekly Availability</label>
                          <select
                            value={editWeeklyAvailability}
                            onChange={(e) => setEditWeeklyAvailability(e.target.value as WeeklyAvailabilityOption)}
                            className="w-full p-2 text-xs bg-white dark:bg-card-dark border rounded-lg dark:text-white"
                          >
                            <option value="less_than_10">Less than 10 hrs/week</option>
                            <option value="up_to_15">Up to 15 hrs/week</option>
                            <option value="up_to_20">Up to 20 hrs/week</option>
                            <option value="more_than_20">20+ hrs/week</option>
                          </select>
                        </div>
                      </div>

                      {/* Other Languages */}
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase block">Other Working Languages Handled</label>
                        <input
                          type="text"
                          value={editOtherLanguages}
                          onChange={(e) => setEditOtherLanguages(e.target.value)}
                          placeholder="e.g. French (Canadian), Catalan"
                          className="w-full p-2 text-xs bg-white dark:bg-card-dark border rounded-lg dark:text-white"
                        />
                      </div>

                      {/* MTQA Specific Experience Years & Error Tagging */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase block">MTQA / MTPE Years</label>
                          <select
                            value={editMtqaExperienceYears}
                            onChange={(e) => setEditMtqaExperienceYears(e.target.value as MtqaExperienceYears)}
                            className="w-full p-2 text-xs bg-white dark:bg-card-dark border rounded-lg dark:text-white"
                          >
                            <option value="less_than_1">Less than 1 year</option>
                            <option value="1_year">1 year</option>
                            <option value="1_to_3">1–3 years</option>
                            <option value="3_to_5">3–5 years</option>
                            <option value="5_plus">5+ years</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase block">Taxonomy Experience</label>
                          <select
                            value={editErrorTaggingExperience}
                            onChange={(e) => setEditErrorTaggingExperience(e.target.value as ErrorTaggingExpLevel)}
                            className="w-full p-2 text-xs bg-white dark:bg-card-dark border rounded-lg dark:text-white"
                          >
                            <option value="extensive">Extensive Experience</option>
                            <option value="basic">Basic Experience</option>
                            <option value="none_learning">None, Quick to Learn</option>
                          </select>
                        </div>
                      </div>

                      {/* Hands-On Domain Checkboxes */}
                      <div className="space-y-1 pt-1">
                        <label className="text-[9px] text-slate-500 uppercase block">Proven Hands-On Experience</label>
                        <div className="space-y-1">
                          {[
                            'Machine Translation Quality Assurance (MTQA)',
                            'Machine Translation Post-Editing (MTPE)',
                            'AI Training Data Annotation',
                            'PII Safety Auditing',
                            'Content Safety / Policy Enforcement Auditing',
                            'General Localization & Translation'
                          ].map((area) => (
                            <label key={area} className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editHandsOnExperienceAreas.includes(area)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditHandsOnExperienceAreas([...editHandsOnExperienceAreas, area]);
                                  } else {
                                    setEditHandsOnExperienceAreas(editHandsOnExperienceAreas.filter((a) => a !== area));
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded text-primary border-slate-300"
                              />
                              {area}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Agility Ratings 1-3 */}
                      <div className="space-y-1.5 pt-1 border-t border-primary/10">
                        <label className="text-[9px] text-slate-500 uppercase block font-bold">Agility Ratings (1-Beginner to 3-Expert)</label>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          {[
                            { key: 'qaPlatforms', label: 'QA Platforms' },
                            { key: 'grammarStyle', label: 'Grammar & Style' },
                            { key: 'errorTagging', label: 'Error Tagging' },
                            { key: 'policyFeedback', label: 'Policy Feedback' }
                          ].map((metric) => (
                            <div key={metric.key} className="p-1.5 bg-white dark:bg-card-dark rounded-lg border border-slate-200/50">
                              <span className="block text-slate-500 font-bold mb-1">{metric.label}</span>
                              <div className="flex gap-1">
                                {[1, 2, 3].map((num) => (
                                  <button
                                    key={num}
                                    type="button"
                                    onClick={() => setEditAgilitySelfAssessment({
                                      ...editAgilitySelfAssessment,
                                      [metric.key]: num
                                    })}
                                    className={`flex-1 py-0.5 rounded text-[9px] font-extrabold ${
                                      editAgilitySelfAssessment[metric.key as keyof AgilitySelfAssessment] === num
                                        ? 'bg-primary text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    {num}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
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
                        {stages.map((stg) => (
                          <option key={stg.id} value={stg.id}>{stg.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Stage Progress toggle inside sidebar details */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stage Progress & Status</label>
                      <div className="w-full">
                        {renderStageStatusSelector(selectedVendor)}
                      </div>
                    </div>

                    {/* Application Intake Source */}
                    {selectedVendor.applicationName && (
                      <div className="p-3 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Application Intake Source</span>
                            <span className="font-extrabold text-slate-900 dark:text-white">{selectedVendor.applicationName}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Working Languages Summary */}
                    <div className="space-y-3 p-4 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/20 dark:border-white/5">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider">
                          Working Languages
                        </h5>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {(selectedVendor.workingLanguages || []).length} Registered Pair(s)
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(selectedVendor.workingLanguages) && selectedVendor.workingLanguages.map((l, idx) => {
                          const langName = typeof l === 'string' ? l : (l?.language || 'Primary Language');
                          const prof = typeof l === 'string' ? 'working' : (l?.proficiency || 'working');
                          return (
                            <div 
                              key={langName + idx} 
                              className="px-3 py-2 bg-white dark:bg-card-dark rounded-xl border border-slate-200/50 dark:border-border-dark flex items-center gap-2 text-xs shadow-sm"
                            >
                              <span className="font-extrabold text-slate-900 dark:text-white">{langName}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary capitalize border border-primary/20">
                                {prof}
                              </span>
                            </div>
                          );
                        })}
                      </div>
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

                    {/* Detailed Application Evaluation & Agility Assessment */}
                    {(selectedVendor.country || selectedVendor.availableStartDate || selectedVendor.mtqaExperienceYears || selectedVendor.agilitySelfAssessment || selectedVendor.customAnswers) && (
                      <div className="space-y-3 p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20">
                        <h5 className="font-extrabold text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4" /> Full Evaluation & Agility Assessment
                        </h5>

                        <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                          {selectedVendor.country && (
                            <div className="flex justify-between border-b border-primary/10 pb-1.5">
                              <span className="text-slate-400">Country & Timezone:</span>
                              <span className="font-bold">{selectedVendor.country} ({selectedVendor.timeZone || 'N/A'})</span>
                            </div>
                          )}

                          {selectedVendor.availableStartDate && (
                            <div className="flex justify-between border-b border-primary/10 pb-1.5">
                              <span className="text-slate-400">Available Start Date:</span>
                              <span className="font-bold">{selectedVendor.availableStartDate}</span>
                            </div>
                          )}

                          {selectedVendor.weeklyAvailability && (
                            <div className="flex justify-between border-b border-primary/10 pb-1.5">
                              <span className="text-slate-400">Weekly Capacity:</span>
                              <span className="font-bold capitalize">{selectedVendor.weeklyAvailability.replace('_than_', ' ').replace('_to_', '–').replace('_plus', '+')} hrs/wk</span>
                            </div>
                          )}

                          {selectedVendor.otherLanguages && (
                            <div className="border-b border-primary/10 pb-1.5 space-y-1">
                              <span className="text-slate-400 block">Other Languages Handled:</span>
                              <span className="font-medium block italic bg-white dark:bg-card-dark p-2 rounded-lg border border-slate-200/50">{selectedVendor.otherLanguages}</span>
                            </div>
                          )}

                          {selectedVendor.mtqaExperienceYears && (
                            <div className="flex justify-between border-b border-primary/10 pb-1.5">
                              <span className="text-slate-400">MTQA / MTPE Exp:</span>
                              <span className="font-extrabold text-slate-900 dark:text-white">
                                {selectedVendor.mtqaExperienceYears.replace('_to_', '–').replace('_plus', '+').replace('less_than_', '< ')} years
                              </span>
                            </div>
                          )}

                          {selectedVendor.errorTaggingExperience && (
                            <div className="flex justify-between border-b border-primary/10 pb-1.5">
                              <span className="text-slate-400">Error-Tagging Taxonomies:</span>
                              <span className="font-bold capitalize text-primary">{selectedVendor.errorTaggingExperience.replace('_', ' ')}</span>
                            </div>
                          )}

                          {/* Hands-On Specialization Badges */}
                          {selectedVendor.handsOnExperienceAreas && selectedVendor.handsOnExperienceAreas.length > 0 && (
                            <div className="space-y-1 pt-1 border-b border-primary/10 pb-2">
                              <span className="text-slate-400 block">Proven Hands-On Experience:</span>
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {selectedVendor.handsOnExperienceAreas.map((area) => (
                                  <span key={area} className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                    {area}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Agility Ratings Matrix */}
                          {selectedVendor.agilitySelfAssessment && (
                            <div className="space-y-1.5 pt-1.5">
                              <span className="text-slate-400 font-bold block">Technical & Operational Agility Ratings (1-3):</span>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="p-2 bg-white dark:bg-card-dark rounded-xl border border-slate-200/50">
                                  <span className="text-[10px] text-slate-400 block">QA Platforms:</span>
                                  <span className="font-extrabold text-blue-600">★ {selectedVendor.agilitySelfAssessment.qaPlatforms} / 3</span>
                                </div>
                                <div className="p-2 bg-white dark:bg-card-dark rounded-xl border border-slate-200/50">
                                  <span className="text-[10px] text-slate-400 block">Grammar & Style:</span>
                                  <span className="font-extrabold text-emerald-600">★ {selectedVendor.agilitySelfAssessment.grammarStyle} / 3</span>
                                </div>
                                <div className="p-2 bg-white dark:bg-card-dark rounded-xl border border-slate-200/50">
                                  <span className="text-[10px] text-slate-400 block">Error Tagging:</span>
                                  <span className="font-extrabold text-amber-600">★ {selectedVendor.agilitySelfAssessment.errorTagging} / 3</span>
                                </div>
                                <div className="p-2 bg-white dark:bg-card-dark rounded-xl border border-slate-200/50">
                                  <span className="text-[10px] text-slate-400 block">Policy Feedback:</span>
                                  <span className="font-extrabold text-purple-600">★ {selectedVendor.agilitySelfAssessment.policyFeedback} / 3</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Custom Question Answers */}
                          {selectedVendor.customAnswers && Object.keys(selectedVendor.customAnswers).length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-primary/10">
                              <span className="text-slate-400 font-bold block">Custom Question Responses:</span>
                              <div className="space-y-2">
                                {Object.entries(selectedVendor.customAnswers).map(([qId, ans]) => (
                                  <div key={qId} className="p-2 bg-white dark:bg-card-dark rounded-xl border border-slate-200/50 space-y-0.5">
                                    <span className="text-[10px] font-mono text-slate-400 block">Question ID: {qId}</span>
                                    <span className="font-bold text-slate-900 dark:text-white block">{String(ans)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Drawer footer actions */}
              <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex gap-3">
                {isEditing ? (
                  <>
                    {selectedVendor && (
                      <button
                        type="button"
                        onClick={() => handleDeleteVendor(selectedVendor)}
                        className="py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold rounded-xl btn-animate cursor-pointer flex items-center justify-center gap-1.5"
                        title="Delete Candidate Profile"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Profile
                      </button>
                    )}
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
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add New Linguist</h3>
                    <p className="text-xs text-slate-500 mt-1">Submit a new linguist profile to the recruitment database.</p>
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

                  {/* Comprehensive Evaluation Fields */}
                  <div className="space-y-3 p-3.5 bg-primary/5 rounded-2xl border border-primary/20">
                    <span className="text-[10px] text-primary uppercase font-extrabold tracking-wider block flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Detailed Evaluation & Location Profile
                    </span>

                    {/* Country & Time Zone */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase block">Country of Residence</label>
                        <select
                          value={formCountry}
                          onChange={(e) => setFormCountry(e.target.value)}
                          className="w-full p-2 text-xs bg-white dark:bg-card-dark border rounded-lg dark:text-white"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase block">Time Zone</label>
                        <select
                          value={formTimeZone}
                          onChange={(e) => setFormTimeZone(e.target.value)}
                          className="w-full p-2 text-xs bg-white dark:bg-card-dark border rounded-lg dark:text-white"
                        >
                          {TIME_ZONES.map((tz) => (
                            <option key={tz.value} value={tz.label}>{tz.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Start Date & Weekly Availability */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase block">Available Start Date</label>
                        <input
                          type="text"
                          value={formAvailableStartDate}
                          onChange={(e) => setFormAvailableStartDate(e.target.value)}
                          placeholder="e.g. Immediately"
                          className="w-full p-2 text-xs bg-white dark:bg-card-dark border rounded-lg dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase block">Weekly Availability</label>
                        <select
                          value={formWeeklyAvailability}
                          onChange={(e) => setFormWeeklyAvailability(e.target.value as WeeklyAvailabilityOption)}
                          className="w-full p-2 text-xs bg-white dark:bg-card-dark border rounded-lg dark:text-white"
                        >
                          <option value="less_than_10">Less than 10 hrs/week</option>
                          <option value="up_to_15">Up to 15 hrs/week</option>
                          <option value="up_to_20">Up to 20 hrs/week</option>
                          <option value="more_than_20">20+ hrs/week</option>
                        </select>
                      </div>
                    </div>

                    {/* Other Languages */}
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 uppercase block">Other Working Languages Handled</label>
                      <input
                        type="text"
                        value={formOtherLanguages}
                        onChange={(e) => setFormOtherLanguages(e.target.value)}
                        placeholder="e.g. French (Canadian), Catalan"
                        className="w-full p-2 text-xs bg-white dark:bg-card-dark border rounded-lg dark:text-white"
                      />
                    </div>

                    {/* MTQA Specific Experience Years & Error Tagging */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase block">MTQA / MTPE Years</label>
                        <select
                          value={formMtqaExperienceYears}
                          onChange={(e) => setFormMtqaExperienceYears(e.target.value as MtqaExperienceYears)}
                          className="w-full p-2 text-xs bg-white dark:bg-card-dark border rounded-lg dark:text-white"
                        >
                          <option value="less_than_1">Less than 1 year</option>
                          <option value="1_year">1 year</option>
                          <option value="1_to_3">1–3 years</option>
                          <option value="3_to_5">3–5 years</option>
                          <option value="5_plus">5+ years</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase block">Taxonomy Experience</label>
                        <select
                          value={formErrorTaggingExperience}
                          onChange={(e) => setFormErrorTaggingExperience(e.target.value as ErrorTaggingExpLevel)}
                          className="w-full p-2 text-xs bg-white dark:bg-card-dark border rounded-lg dark:text-white"
                        >
                          <option value="extensive">Extensive Experience</option>
                          <option value="basic">Basic Experience</option>
                          <option value="none_learning">None, Quick to Learn</option>
                        </select>
                      </div>
                    </div>

                    {/* Hands-On Domain Checkboxes */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[9px] text-slate-500 uppercase block">Proven Hands-On Experience</label>
                      <div className="space-y-1">
                        {[
                          'Machine Translation Quality Assurance (MTQA)',
                          'Machine Translation Post-Editing (MTPE)',
                          'AI Training Data Annotation',
                          'PII Safety Auditing',
                          'Content Safety / Policy Enforcement Auditing',
                          'General Localization & Translation'
                        ].map((area) => (
                          <label key={area} className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formHandsOnExperienceAreas.includes(area)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormHandsOnExperienceAreas([...formHandsOnExperienceAreas, area]);
                                } else {
                                  setFormHandsOnExperienceAreas(formHandsOnExperienceAreas.filter((a) => a !== area));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded text-primary border-slate-300"
                            />
                            {area}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Agility Ratings 1-3 */}
                    <div className="space-y-1.5 pt-1 border-t border-primary/10">
                      <label className="text-[9px] text-slate-500 uppercase block font-bold">Agility Ratings (1-Beginner to 3-Expert)</label>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        {[
                          { key: 'qaPlatforms', label: 'QA Platforms' },
                          { key: 'grammarStyle', label: 'Grammar & Style' },
                          { key: 'errorTagging', label: 'Error Tagging' },
                          { key: 'policyFeedback', label: 'Policy Feedback' }
                        ].map((metric) => (
                          <div key={metric.key} className="p-1.5 bg-white dark:bg-card-dark rounded-lg border border-slate-200/50">
                            <span className="block text-slate-500 font-bold mb-1">{metric.label}</span>
                            <div className="flex gap-1">
                              {[1, 2, 3].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setFormAgilitySelfAssessment({
                                    ...formAgilitySelfAssessment,
                                    [metric.key]: num
                                  })}
                                  className={`flex-1 py-0.5 rounded text-[9px] font-extrabold ${
                                    formAgilitySelfAssessment[metric.key as keyof AgilitySelfAssessment] === num
                                      ? 'bg-primary text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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

      {/* Validation modal for stage transitions triggered by workflow rules with Email Preview & Edit */}
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
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl max-h-[90vh] bg-white dark:bg-card-dark rounded-3xl p-6 border border-slate-200 dark:border-border-dark shadow-2xl z-50 overflow-y-auto flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Confirm Workflow Action & Email Preview</h3>
                  </div>
                  <button onClick={() => setPendingTransition(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">
                  <p>
                    Transitioning this candidate to <span className="font-bold text-primary">{stages.find(s => s.id === pendingTransition.targetStage)?.name || pendingTransition.targetStage}</span> triggers an automated email action. You can preview and customize the email below before sending:
                  </p>
                  
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl grid grid-cols-3 gap-2 text-slate-700 dark:text-slate-200 font-semibold text-[11px]">
                    <div><span className="text-slate-400 block text-[9px] uppercase">Rule Name</span>{pendingTransition.actionName}</div>
                    <div><span className="text-slate-400 block text-[9px] uppercase">Template</span>{pendingTransition.templateName}</div>
                    <div><span className="text-slate-400 block text-[9px] uppercase">Recipient</span><span className="text-primary">{pendingTransition.recipientType}</span></div>
                  </div>

                  {/* Email Preview & Editor Panel */}
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-primary" />
                        Email Subject Line (Editable)
                      </label>
                      <input
                        type="text"
                        value={pendingTransition.previewSubject}
                        onChange={(e) => setPendingTransition({ ...pendingTransition, previewSubject: e.target.value })}
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary font-semibold dark:text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        Email Message Body (Editable - Merge Tags Pre-Filled)
                      </label>
                      <textarea
                        rows={7}
                        value={pendingTransition.previewBody}
                        onChange={(e) => setPendingTransition({ ...pendingTransition, previewBody: e.target.value })}
                        className="w-full p-3 text-xs font-sans leading-relaxed bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white resize-y"
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 Action Buttons Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setPendingTransition(null)}
                  className="py-2.5 px-3 border border-slate-200 dark:border-border-dark text-slate-500 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-white/5 btn-animate cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    commitStageChange(pendingTransition.vendorId, pendingTransition.targetStage, pendingTransition.matchedRule, { sendEmail: false });
                  }}
                  className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs btn-animate cursor-pointer"
                >
                  Confirm (No Email)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    commitStageChange(pendingTransition.vendorId, pendingTransition.targetStage, pendingTransition.matchedRule, {
                      sendEmail: true,
                      customSubject: pendingTransition.previewSubject,
                      customBody: pendingTransition.previewBody
                    });
                  }}
                  className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-xs btn-animate cursor-pointer shadow-md shadow-primary/20 flex items-center justify-center gap-1.5"
                >
                  Confirm & Send Email
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Split Candidate Language Modal */}
      <AnimatePresence>
        {splitPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSplitPrompt(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white dark:bg-card-dark rounded-3xl p-6 border border-slate-200 dark:border-border-dark shadow-2xl z-50 overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <Grid className="w-5 h-5 text-primary" />
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Split Candidate Profile by Language?
                    </h3>
                  </div>
                  <button onClick={() => setSplitPrompt(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">
                  <p>
                    <span className="font-bold text-slate-900 dark:text-white">{splitPrompt.vendor.contactName}</span> has <span className="font-bold text-primary">{splitPrompt.vendor.workingLanguages?.length} working languages</span>.
                  </p>
                  <p>
                    Splitting will create separate candidate cards for each language pair so you can choose which language(s) to push to testing manually:
                  </p>

                  <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-bg-dark rounded-xl border border-slate-200/40">
                    {splitPrompt.vendor.workingLanguages?.map((l) => (
                      <div key={l.language} className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        {splitPrompt.vendor.contactName} ({l.language}) — <span className="text-[10px] text-slate-400 font-normal capitalize">{l.proficiency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex flex-col gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => handleConfirmSplitProfiles(splitPrompt.vendor)}
                  className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-xs btn-animate cursor-pointer shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <Grid className="w-4 h-4" />
                  Yes, Split into {splitPrompt.vendor.workingLanguages?.length} Language Profiles
                </button>
                <button
                  type="button"
                  onClick={() => setSplitPrompt(null)}
                  className="w-full py-2.5 px-4 border border-slate-200 dark:border-border-dark text-slate-500 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-white/5 btn-animate cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
