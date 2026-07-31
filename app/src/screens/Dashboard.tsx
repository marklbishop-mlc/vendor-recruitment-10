import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import type { VendorProfile, WorkflowStage, WorkingLanguage } from '../types';
import { 
  Plus, Search, Filter, ShieldAlert, CheckCircle2, Clock, X, 
  FileText, Check, UploadCloud, Grid, List, ArrowUpDown,
  FileCheck, Info, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock candidates list matching expanded profile attributes
const INITIAL_VENDORS_MOCK: VendorProfile[] = [
  {
    id: 'v-1',
    companyName: 'Apex Translations LLC',
    contactName: 'Carlos Santillan',
    email: 'carlos@apextrans.com',
    phone: '+1 (555) 123-4567',
    status: 'approved',
    category: 'active',
    stage: 'approved',
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
    stage: 'testing_assigned',
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
    stage: 'sourced',
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
    stage: 'nda_verified',
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
    resumeName: 'amara_diop_resume.pdf',
    submittedAt: '2026-07-15T08:00:00Z',
    updatedAt: '2026-07-18T16:00:00Z'
  }
];

const STAGE_LABELS: Record<WorkflowStage, string> = {
  sourced: 'Sourced / Intake',
  nda_pending: 'NDA Pending',
  nda_verified: 'NDA Verified',
  outreach_sent: 'Outreach Sent',
  intake_complete: 'Intake Complete',
  testing_assigned: 'Testing Assigned',
  grading: 'Grading / Results',
  xtrf_sync: 'System Onboarding',
  approved: 'Approved / Ready'
};

const CATEGORY_LABELS: Record<string, string> = {
  outreach: 'New Outreach',
  network: 'Existing Network',
  unassigned: 'Tested & Unassigned',
  active: 'Active Vendor'
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Normalized configurations from Settings (localStorage)
  const [activeLanguages, setActiveLanguages] = useState<string[]>([]);
  const [activeStatuses, setActiveStatuses] = useState<string[]>([]);

  // Pipeline lists
  const [vendors, setVendors] = useState<VendorProfile[]>(INITIAL_VENDORS_MOCK);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);

  // View toggle: 'cards' or 'table'
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Table sorting states
  const [sortField, setSortField] = useState<keyof VendorProfile>('contactName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Side Drawers / Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isXtrfOpen, setIsXtrfOpen] = useState(false);

  // Form Field States
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
  
  // Selected multiple languages in form
  const [formLanguages, setFormLanguages] = useState<{ language: string; proficiency: WorkingLanguage['proficiency'] }[]>([]);
  const [selectedLangToAdd, setSelectedLangToAdd] = useState('');
  const [selectedProfToAdd, setSelectedProfToAdd] = useState<WorkingLanguage['proficiency']>('native');

  // Resume Upload simulation
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingName, setUploadingName] = useState('');
  const [uploadedResumeName, setUploadedResumeName] = useState('');

  // Load configuration lists on boot
  useEffect(() => {
    const savedLangs = localStorage.getItem('mlc_settings_languages');
    const savedStatuses = localStorage.getItem('mlc_settings_statuses');
    
    if (savedLangs) {
      setActiveLanguages(JSON.parse(savedLangs));
    } else {
      setActiveLanguages(['English', 'Spanish', 'German', 'Japanese', 'Mandarin', 'Swedish', 'Wolof', 'French', 'Portuguese']);
    }
    
    if (savedStatuses) {
      setActiveStatuses(JSON.parse(savedStatuses));
    } else {
      setActiveStatuses(['pending', 'approved', 'rejected', 'on_hold', 'blacklisted', 'active']);
    }
  }, []);

  // Set default added language from active list
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

  const handleStageChange = (vendorId: string, nextStage: WorkflowStage) => {
    setVendors((prev) => 
      prev.map((v) => {
        if (v.id !== vendorId) return v;
        
        let newStatus = v.status;
        if (nextStage === 'approved') {
          newStatus = 'approved';
        }
        
        return { 
          ...v, 
          stage: nextStage, 
          status: newStatus,
          updatedAt: new Date().toISOString() 
        };
      })
    );

    setSelectedVendor((prev) => {
      if (!prev || prev.id !== vendorId) return prev;
      let newStatus = prev.status;
      if (nextStage === 'approved') newStatus = 'approved';
      return { ...prev, stage: nextStage, status: newStatus, updatedAt: new Date().toISOString() };
    });
  };

  const handleCustomStatusChange = (vendorId: string, newStatus: string) => {
    setVendors((prev) => 
      prev.map((v) => 
        v.id === vendorId 
          ? { ...v, status: newStatus, updatedAt: new Date().toISOString() } 
          : v
      )
    );

    setSelectedVendor((prev) => {
      if (!prev || prev.id !== vendorId) return prev;
      return { ...prev, status: newStatus, updatedAt: new Date().toISOString() };
    });
  };

  const handleNdaToggle = (vendorId: string) => {
    setVendors((prev) => 
      prev.map((v) => 
        v.id === vendorId 
          ? { ...v, hasSignedNda: !v.hasSignedNda, updatedAt: new Date().toISOString() } 
          : v
      )
    );

    setSelectedVendor((prev) => {
      if (!prev || prev.id !== vendorId) return prev;
      return { ...prev, hasSignedNda: !prev.hasSignedNda, updatedAt: new Date().toISOString() };
    });
  };

  const handleRateOverride = (vendorId: string, confirmedRate: number) => {
    setVendors((prev) => 
      prev.map((v) => 
        v.id === vendorId 
          ? { ...v, confirmedRate, updatedAt: new Date().toISOString() } 
          : v
      )
    );
    
    setSelectedVendor((prev) => {
      if (!prev || prev.id !== vendorId) return prev;
      return { ...prev, confirmedRate, updatedAt: new Date().toISOString() };
    });
  };

  const handleDirectSubmit = (e: React.FormEvent) => {
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
      stage: 'sourced',
      mlcHourlyRate: parseFloat(formMlcRate) || 0,
      adjustedRate: Math.round((parseFloat(formMlcRate) || 0) * 0.9),
      confirmedRate: 0,
      status: formStatus,
      hoursAvailable: parseInt(formHours) || undefined,
      mtPeExperience: formExperience,
      prozProfile: formProz.trim() || undefined,
      linkedInProfile: formLinkedin.trim() || undefined,
      resumeName: uploadedResumeName || undefined,
      hasSignedNda: false,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setVendors((prev) => [newLead, ...prev]);
    setIsAddOpen(false);

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
    setUploadedResumeName('');
    setUploadProgress(0);
  };

  const triggerXtrfImport = () => {
    const xtrfLead: VendorProfile = {
      id: `xtrf-${Date.now()}`,
      companyName: '',
      contactName: 'Zheng Wei',
      email: 'zheng.wei@lingoex.cn',
      phone: '+86 10 9999 8888',
      isGmail: false,
      secondaryEmail: 'zheng.wei.google@gmail.com',
      workingLanguages: [{ language: 'Mandarin', proficiency: 'native' }],
      services: ['Translation', 'Interpretation'],
      classificationTier: 1,
      source: 'xtrf',
      category: 'network',
      stage: 'intake_complete',
      mlcHourlyRate: 50,
      adjustedRate: 45,
      confirmedRate: 0,
      status: 'pending',
      mtPeExperience: '5+',
      hoursAvailable: 30,
      hasSignedNda: false,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setVendors((prev) => [xtrfLead, ...prev]);
    setIsXtrfOpen(true);
    setTimeout(() => setIsXtrfOpen(false), 2500);
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
      sourced: 0,
      nda_pending: 0,
      nda_verified: 0,
      outreach_sent: 0,
      intake_complete: 0,
      testing_assigned: 0,
      grading: 0,
      xtrf_sync: 0,
      approved: 0
    };

    vendors.forEach((v) => {
      if (v.stage in aggregates) {
        aggregates[v.stage]++;
      }
    });

    return aggregates;
  }, [vendors]);

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
            Evaluate, test, and sync language specialists through verification stages.
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
            className="py-2.5 px-4 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl flex items-center gap-2 btn-animate shadow-md shadow-primary/20 cursor-pointer animate-fade-in"
          >
            <Plus className="w-4 h-4" />
            Add Sourced Lead
          </button>
          
          <button
            onClick={triggerXtrfImport}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 btn-animate border border-white/5 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-slate-400" />
            XTRF Import
          </button>
        </div>
      </div>

      {/* Funnel Pipeline aggregated counts */}
      <section className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm">
        <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Workflow Stage Gates
        </h4>
        <div className="grid grid-cols-3 md:grid-cols-9 gap-4">
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
                  {STAGE_LABELS[stage].split(' ')[0]}
                </span>
                <span className="absolute bottom-full mb-2 bg-slate-900 text-white text-[9px] font-semibold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
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
        </div>
      </section>

      {/* Pipeline View Mode Render */}
      <section>
        {viewMode === 'cards' ? (
          /* Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {sortedVendors.length > 0 ? (
                sortedVendors.map((candidate) => (
                  <motion.div
                    key={candidate.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedVendor(candidate)}
                    className="glass dark:dark-glass p-6 rounded-3xl border border-slate-200/50 dark:border-white/10 flex flex-col justify-between shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">
                            {CATEGORY_LABELS[candidate.category] || 'Specialist'}
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
                            <span className="p-1 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" title="Signed NDA Active">
                              <FileCheck className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="p-1 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20" title="NDA Required">
                              <ShieldAlert className="w-4 h-4" />
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/30">
                            {candidate.source.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Working Languages & Proficiencies */}
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.workingLanguages.map((l, i) => (
                          <span key={i} className="text-[10px] bg-primary/10 text-primary py-0.5 px-2.5 rounded-md font-semibold">
                            {l.language} ({l.proficiency})
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats summary block */}
                    <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-xs text-slate-500">
                      <div>
                        <span className="text-[9px] block uppercase font-medium">Weekly Hours</span>
                        <span className="font-bold text-slate-800 dark:text-white">{candidate.hoursAvailable ? `${candidate.hoursAvailable}h` : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] block uppercase font-medium">MT PE Experience</span>
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
                ))
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
          /* Table View */
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
                    <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => toggleSort('stage')}>
                      <div className="flex items-center gap-1.5">
                        Stage Gate
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-center" onClick={() => toggleSort('hoursAvailable')}>
                      <div className="flex items-center gap-1.5 justify-center">
                        Hours
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="p-4">Experience</th>
                    <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-right pr-6" onClick={() => toggleSort('confirmedRate')}>
                      <div className="flex items-center gap-1.5 justify-end">
                        Agreed Rate
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {sortedVendors.map((candidate) => (
                    <tr 
                      key={candidate.id} 
                      onClick={() => setSelectedVendor(candidate)}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="p-4 pl-6 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {candidate.contactName}
                        {candidate.hasSignedNda && (
                          <span className="p-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" title="NDA Active">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">
                        {candidate.companyName || <span className="text-slate-400 italic">Individual</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {candidate.workingLanguages.map((l, i) => (
                            <span key={i} className="text-[10px] bg-primary/10 text-primary py-0.5 px-2 rounded-md font-semibold">
                              {l.language}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 dark:text-white">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          {STAGE_LABELS[candidate.stage]}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        {candidate.hoursAvailable ? `${candidate.hoursAvailable}h/wk` : 'N/A'}
                      </td>
                      <td className="p-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {candidate.mtPeExperience ? `${candidate.mtPeExperience} yrs` : 'N/A'}
                      </td>
                      <td className="p-4 text-right pr-6 font-extrabold text-slate-950 dark:text-white">
                        {candidate.confirmedRate > 0 ? `$${candidate.confirmedRate}/hr` : 'Negotiating'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Drawer: Detailed pipeline candidate viewer & manual stage-gate overrides */}
      <AnimatePresence>
        {selectedVendor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVendor(null)}
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
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Candidate evaluation</span>
                    {/* Name Priority */}
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{selectedVendor.contactName}</h3>
                    {selectedVendor.companyName && (
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Company: {selectedVendor.companyName}</p>
                    )}
                  </div>
                  <button onClick={() => setSelectedVendor(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6 text-sm">
                  {/* Signed NDA verified status */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-bg-dark border border-slate-200/20 dark:border-white/5 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <FileCheck className={`w-5 h-5 ${selectedVendor.hasSignedNda ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Non-Disclosure Agreement</span>
                        <span className="text-[10px] text-slate-500 block">{selectedVendor.hasSignedNda ? 'Signed NDA Verified' : 'NDA Missing / Pending'}</span>
                      </div>
                    </div>

                    {(user?.role === 'admin' || user?.role === 'manager') && (
                      <button
                        onClick={() => handleNdaToggle(selectedVendor.id)}
                        className={`py-1.5 px-3 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                          selectedVendor.hasSignedNda 
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                      >
                        {selectedVendor.hasSignedNda ? 'NDA Verified' : 'Set Signed'}
                      </button>
                    )}
                  </div>

                  {/* Stage Dropdown override for admins/managers (move between any workflow stage) */}
                  {(user?.role === 'admin' || user?.role === 'manager') ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Workflow Stage Gate</label>
                      <div className="relative">
                        <select
                          value={selectedVendor.stage}
                          onChange={(e) => handleStageChange(selectedVendor.id, e.target.value as WorkflowStage)}
                          className="w-full pl-3 pr-8 py-2.5 text-xs font-bold bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white cursor-pointer"
                        >
                          {Object.entries(STAGE_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 dark:bg-bg-dark border border-slate-200/20 dark:border-white/5 rounded-2xl">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Status Stage-Gate</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="font-extrabold text-slate-900 dark:text-white">{STAGE_LABELS[selectedVendor.stage]}</span>
                      </div>
                    </div>
                  )}

                  {/* Custom Status selector dropdown */}
                  {(user?.role === 'admin' || user?.role === 'manager') && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Candidate Custom Status</label>
                      <select
                        value={selectedVendor.status}
                        onChange={(e) => handleCustomStatusChange(selectedVendor.id, e.target.value)}
                        className="w-full pl-3 pr-8 py-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white cursor-pointer capitalize font-bold"
                      >
                        {activeStatuses.map((stat) => (
                          <option key={stat} value={stat}>{stat.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Manual Rate Negotiator (Managers/Admin only) */}
                  {(user?.role === 'admin' || user?.role === 'manager') && (
                    <div className="space-y-3">
                      <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Negotiate Contract Rates</h5>
                      <div className="bg-slate-50 dark:bg-bg-dark rounded-2xl p-4 border border-slate-100 dark:border-white/5 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] text-slate-500 block font-medium">MLC Charge Rate</span>
                            <span className="font-bold text-slate-800 dark:text-white">${selectedVendor.mlcHourlyRate}/hr</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block font-medium">Offer Target Rate</span>
                            <span className="font-bold text-slate-800 dark:text-white">${selectedVendor.adjustedRate}/hr</span>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-slate-200/40 dark:border-white/5 flex items-center gap-3">
                          <input
                            type="number"
                            id="override-rate-val"
                            defaultValue={selectedVendor.confirmedRate || selectedVendor.adjustedRate}
                            className="w-24 p-2 text-xs bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:outline-none"
                            placeholder="Agreed Rate"
                          />
                          <button
                            onClick={() => {
                              const input = document.getElementById('override-rate-val') as HTMLInputElement;
                              const rate = parseFloat(input?.value) || 0;
                              handleRateOverride(selectedVendor.id, rate);
                            }}
                            className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg btn-animate cursor-pointer border border-white/5"
                          >
                            Set Rate
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Candidate Details & Resume link */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider font-semibold">Specialist Attributes</h5>
                    <div className="bg-slate-50 dark:bg-bg-dark rounded-2xl p-4 border border-slate-100 dark:border-white/5 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between">
                        <span>Email address:</span>
                        <span className="font-bold">{selectedVendor.email}</span>
                      </div>
                      
                      {/* Secondary Google account if external domain */}
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
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                <button
                  onClick={() => setSelectedVendor(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl btn-animate cursor-pointer"
                >
                  Close Pipeline Details
                </button>
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
                      className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
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
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 py-1 select-none">
                      <input
                        type="checkbox"
                        id="form-is-gmail"
                        checked={formIsGmail}
                        onChange={(e) => setFormIsGmail(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary bg-slate-50 dark:bg-bg-dark border-slate-200 cursor-pointer"
                      />
                      <label htmlFor="form-is-gmail" className="text-slate-600 dark:text-slate-300 cursor-pointer font-bold flex items-center gap-1">
                        This is a Gmail or Google Workspace Account
                      </label>
                    </div>

                    {/* Conditional Secondary Google account field */}
                    {!formIsGmail && (
                      <div className="space-y-1.5 p-3.5 bg-primary/5 rounded-2xl border border-primary/10 animate-fade-in">
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
                          className="w-full p-2.5 text-xs bg-white dark:bg-bg-dark border border-primary/20 rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                        />
                        <span className="text-[9px] text-slate-400 font-normal leading-normal block mt-1">
                          Required for secure portal access and file collaboration since primary email is not hosted on Google.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Multi-language selector from normalized Settings list */}
                  <div className="space-y-2 p-3 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/20 dark:border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Languages and Proficiency</span>
                    
                    <div className="flex gap-2">
                      <select
                        value={selectedLangToAdd}
                        onChange={(e) => setSelectedLangToAdd(e.target.value)}
                        className="flex-1 p-2 text-xs bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white"
                      >
                        {activeLanguages.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                      
                      <select
                        value={selectedProfToAdd}
                        onChange={(e) => setSelectedProfToAdd(e.target.value as any)}
                        className="p-2 text-xs bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-lg text-slate-900 dark:text-white"
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

                  <div className="grid grid-cols-2 gap-4">
                    {/* Hours available */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Weekly Hours Available</label>
                      <input
                        type="number"
                        required
                        value={formHours}
                        onChange={(e) => setFormHours(e.target.value)}
                        placeholder="e.g. 20"
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                      />
                    </div>
                    
                    {/* Experience MT PE years */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">MT PE Experience</label>
                      <select
                        value={formExperience}
                        onChange={(e) => setFormExperience(e.target.value as any)}
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white cursor-pointer"
                      >
                        <option value="1-3">1 - 3 years</option>
                        <option value="3-5">3 - 5 years</option>
                        <option value="5+">More than 5 years</option>
                      </select>
                    </div>
                  </div>

                  {/* Portfolio Profiles links */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">ProZ Profile URL</label>
                      <input
                        type="text"
                        value={formProz}
                        onChange={(e) => setFormProz(e.target.value)}
                        placeholder="proz.com/profile/username"
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">LinkedIn Profile URL</label>
                      <input
                        type="text"
                        value={formLinkedin}
                        onChange={(e) => setFormLinkedin(e.target.value)}
                        placeholder="linkedin.com/in/username"
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none"
                      />
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

                    {/* Upload progress indicator */}
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
                      <div className="flex items-center justify-between p-2 bg-primary/5 border border-primary/20 rounded-lg text-primary font-bold pt-1.5">
                        <span className="truncate max-w-[200px]">{uploadedResumeName}</span>
                        <button type="button" onClick={() => setUploadedResumeName('')} className="text-primary hover:text-red-500 font-extrabold cursor-pointer">×</button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Hourly rate and Status */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Hourly MLC Rate ($)</label>
                      <input
                        type="number"
                        required
                        value={formMlcRate}
                        onChange={(e) => setFormMlcRate(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Initial Status</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white cursor-pointer capitalize"
                      >
                        {activeStatuses.map((stat) => (
                          <option key={stat} value={stat}>{stat.replace('_', ' ')}</option>
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
                  className="flex-1 py-2.5 border border-slate-200 dark:border-border-dark text-slate-500 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 btn-animate cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="sourced-intake-form"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl btn-animate cursor-pointer"
                >
                  Add Lead
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sync Status Banner */}
      <AnimatePresence>
        {isXtrfOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 dark:dark-glass bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-6 py-3 rounded-2xl border border-emerald-500/20 shadow-2xl font-bold flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>XTRF candidate successfully synced to intake_complete!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
