import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Globe, Phone, Mail, Award, ChevronRight, ChevronDown, X,
  FileCheck, ShieldAlert, ExternalLink, Download, Grid, List, Edit2, Trash2
} from 'lucide-react';
import type { VendorProfile, WorkingLanguage, ApplicationConfig, LanguageProficiency } from '../types';
import { getActiveSortedLanguages, PROFICIENCY_OPTIONS, formatProficiency } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, doc, setDoc, query, where, getDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

// Mock list of approved vendors specifically filtered for PM Directory
const APPROVED_VENDORS_MOCK: VendorProfile[] = [
  {
    id: 'approved-1',
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
    resumeName: 'carlos_resume_2026.pdf',
    submittedAt: '2026-07-20T10:00:00Z',
    updatedAt: '2026-07-20T10:00:00Z'
  },
  {
    id: 'approved-2',
    companyName: 'EuroLoc Group',
    contactName: 'Elena Rostova',
    email: 'elena@euroloc.de',
    phone: '+49 30 9876543',
    status: 'approved',
    category: 'active',
    stage: 'ready_for_pm',
    services: ['Translation', 'Subtitling', 'Interpretation'],
    workingLanguages: [
      { language: 'German', proficiency: 'native' },
      { language: 'English', proficiency: 'professional' },
      { language: 'Russian', proficiency: 'working' }
    ],
    classificationTier: 2,
    source: 'xtrf',
    mlcHourlyRate: 55,
    adjustedRate: 50,
    confirmedRate: 52,
    isGmail: false,
    mtPeExperience: '3-5',
    hoursAvailable: 30,
    hasSignedNda: true,
    resumeName: 'elena_cv.pdf',
    submittedAt: '2026-06-12T08:30:00Z',
    updatedAt: '2026-07-15T11:00:00Z'
  },
  {
    id: 'approved-3',
    companyName: 'East-West Lingua',
    contactName: 'Li Wei',
    email: 'li.wei@ewlingua.cn',
    phone: '+86 10 5551234',
    status: 'approved',
    category: 'active',
    stage: 'ready_for_pm',
    services: ['Translation', 'Proofreading'],
    workingLanguages: [
      { language: 'Mandarin', proficiency: 'native' },
      { language: 'English', proficiency: 'professional' }
    ],
    classificationTier: 1,
    source: 'external',
    mlcHourlyRate: 50,
    adjustedRate: 45,
    confirmedRate: 48,
    isGmail: true,
    mtPeExperience: '5+',
    hoursAvailable: 40,
    hasSignedNda: true,
    resumeName: 'li_wei_cv_trans.pdf',
    submittedAt: '2026-07-02T09:15:00Z',
    updatedAt: '2026-07-12T14:30:00Z'
  }
];

export const VendorDirectory: React.FC = () => {
  const { user, loading } = useAuth();
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTierFilters, setSelectedTierFilters] = useState<string[]>([]);
  const [selectedLangFilters, setSelectedLangFilters] = useState<string[]>([]);
  const [selectedAppFilters, setSelectedAppFilters] = useState<string[]>([]);
  const [isTierDropdownOpen, setIsTierDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isAppDropdownOpen, setIsAppDropdownOpen] = useState(false);
  const [applicationsList, setApplicationsList] = useState<ApplicationConfig[]>([]);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  
  // Available system languages from config
  const [systemLanguages, setSystemLanguages] = useState<string[]>([]);

  // Edit Drawer Modal state
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit Form Fields
  const [editContactName, setEditContactName] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editServices, setEditServices] = useState('');
  const [editMlcRate, setEditMlcRate] = useState('');
  const [editConfirmedRate, setEditConfirmedRate] = useState('');
  const [editTier, setEditTier] = useState<1 | 2 | 3>(2);
  const [editStatus, setEditStatus] = useState('pending');
  const [editNdaUrl, setEditNdaUrl] = useState('');
  const [editHasSignedNda, setEditHasSignedNda] = useState(false);
  const [editLanguages, setEditLanguages] = useState<WorkingLanguage[]>([]);
  
  const [selectedLangToAdd, setSelectedLangToAdd] = useState('');
  const [selectedProfToAdd, setSelectedProfToAdd] = useState<LanguageProficiency>('native');

  useEffect(() => {
    if (loading) return;

    const loadDirectoryData = async () => {
      try {
        // Load configurations
        const configSnap = await getDoc(doc(db, 'settings', 'global_config'));
        if (configSnap.exists()) {
          const configData = configSnap.data();
          if (configData.languages) {
            const activeSortedNames = getActiveSortedLanguages(configData.languages).map((l) => l.name);
            setSystemLanguages(activeSortedNames);
            setSelectedLangToAdd(activeSortedNames[0] || '');
          }
        }

        // Query vendors
        let q;
        if (user && (user.role === 'admin' || user.role === 'manager')) {
          q = collection(db, 'vendors');
        } else {
          q = query(collection(db, 'vendors'), where('status', '==', 'approved'));
        }

        const vendorSnap = await getDocs(q);
        const list: VendorProfile[] = [];
        vendorSnap.forEach((doc) => {
          list.push(doc.data() as VendorProfile);
        });

        if (list.length > 0) {
          setVendors(list);
        } else {
          // Seed fallback if DB is empty
          for (const v of APPROVED_VENDORS_MOCK) {
            await setDoc(doc(db, 'vendors', v.id), v);
          }
          setVendors(APPROVED_VENDORS_MOCK);
        }
      } catch (err) {
        console.error("Failed to load directory data from Firestore", err);
      }
    };
    loadDirectoryData();

    const unsubApps = onSnapshot(collection(db, 'applications'), (snapshot) => {
      const apps: ApplicationConfig[] = [];
      snapshot.forEach((docSnap) => apps.push({ id: docSnap.id, ...docSnap.data() } as ApplicationConfig));
      setApplicationsList(apps);
    });

    return () => unsubApps();
  }, [user, loading]);

  // Filter approved directory
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

      const matchesTier = selectedTierFilters.length === 0 || (v.classificationTier && selectedTierFilters.includes(v.classificationTier.toString()));
      const matchesLang = selectedLangFilters.length === 0 || (Array.isArray(v.workingLanguages) && v.workingLanguages.some((l) => {
        const langName = typeof l === 'string' ? l : l.language;
        return selectedLangFilters.includes(langName);
      }));

      const candidateApp = v.applicationName || (v.applicationId ? v.applicationId : 'Default Application');
      const matchesApp = selectedAppFilters.length === 0 || selectedAppFilters.includes(candidateApp);

      return matchesSearch && matchesTier && matchesLang && matchesApp;
    });
  }, [vendors, search, selectedTierFilters, selectedLangFilters, selectedAppFilters]);

  const handleExportCSV = () => {
    const headers = [
      'Company Name', 'Contact Name', 'Email', 'Phone',
      'Services', 'Languages', 'Tier', 'MLC Hourly Rate',
      'Negotiated PM Rate', 'NDA Status'
    ];
    
    const rows = filteredVendors.map((v) => [
      v.companyName || 'Individual Vendor',
      v.contactName || 'N/A',
      v.email || '',
      v.phone || '',
      Array.isArray(v.services) ? v.services.join('; ') : '',
      Array.isArray(v.workingLanguages) 
        ? v.workingLanguages.map((l) => typeof l === 'string' ? l : `${l?.language || 'N/A'} (${formatProficiency(l?.proficiency)})`).join('; ') 
        : '',
      v.classificationTier || 2,
      v.mlcHourlyRate || 0,
      v.confirmedRate || 0,
      v.hasSignedNda ? 'Signed' : 'Pending'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'mlc_directory_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startEditingVendor = (vendor: VendorProfile) => {
    setEditContactName(vendor.contactName);
    setEditCompanyName(vendor.companyName || '');
    setEditEmail(vendor.email);
    setEditPhone(vendor.phone || '');
    setEditServices(vendor.services.join(', '));
    setEditMlcRate(vendor.mlcHourlyRate.toString());
    setEditConfirmedRate(vendor.confirmedRate.toString());
    setEditTier(vendor.classificationTier);
    setEditStatus(vendor.status);
    setEditNdaUrl(vendor.ndaUrl || '');
    setEditHasSignedNda(vendor.hasSignedNda);
    setEditLanguages([...vendor.workingLanguages]);
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;

    const updatedProfile: VendorProfile = {
      ...selectedVendor,
      contactName: editContactName.trim(),
      companyName: editCompanyName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim() || '',
      services: editServices.split(',').map((s) => s.trim()).filter(Boolean),
      classificationTier: editTier,
      mlcHourlyRate: parseFloat(editMlcRate) || 0,
      adjustedRate: Math.round((parseFloat(editMlcRate) || 0) * 0.9),
      confirmedRate: parseFloat(editConfirmedRate) || 0,
      status: editStatus,
      ndaUrl: editNdaUrl.trim() || '',
      hasSignedNda: editHasSignedNda,
      workingLanguages: editLanguages.length > 0 ? editLanguages : [{ language: 'English', proficiency: 'working' }],
      updatedAt: new Date().toISOString()
    };

    try {
      const cleanPayload: Record<string, any> = {};
      Object.keys(updatedProfile).forEach((k) => {
        if ((updatedProfile as any)[k] !== undefined) {
          cleanPayload[k] = (updatedProfile as any)[k];
        }
      });

      await setDoc(doc(db, 'vendors', selectedVendor.id), cleanPayload);
      setVendors((prev) => prev.map((v) => v.id === selectedVendor.id ? updatedProfile : v));
      setSelectedVendor(updatedProfile);
      setIsEditing(false);
      alert(`Directory listing for "${editContactName}" saved successfully.`);
    } catch (err) {
      console.error("Failed to save vendor directory edit", err);
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

  const handleAddLanguageToEdit = () => {
    if (!selectedLangToAdd) return;
    if (editLanguages.some((l) => l.language === selectedLangToAdd)) return;
    setEditLanguages((prev) => [...prev, { language: selectedLangToAdd, proficiency: selectedProfToAdd }]);
  };

  const handleRemoveLanguageFromEdit = (langName: string) => {
    setEditLanguages((prev) => prev.filter((l) => l.language !== langName));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Linguist Directory</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
            Browse vetted, compliance-ready localization specialists and negotiated rates.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
            <Download className="w-4.5 h-4.5 text-primary" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
          
          {/* Multi-Select Tier Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsTierDropdownOpen(!isTierDropdownOpen);
                setIsLangDropdownOpen(false);
              }}
              className="pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white flex items-center gap-2 font-bold cursor-pointer shadow-sm relative"
            >
              <span>
                {selectedTierFilters.length === 0
                  ? 'All Tiers'
                  : selectedTierFilters.length === 1
                  ? `Tier ${selectedTierFilters[0]}`
                  : `Tiers (${selectedTierFilters.length})`}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            </button>

            {isTierDropdownOpen && (
              <div className="absolute right-0 sm:left-0 top-full mt-2 w-56 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-xl z-50 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2 text-xs font-bold text-slate-500">
                  <span>Filter by Tier</span>
                  {selectedTierFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedTierFilters([])}
                      className="text-rose-500 hover:underline text-[10px]"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {[
                    { id: '1', label: 'Tier 1 (Highest Quality)' },
                    { id: '2', label: 'Tier 2 (Standard)' },
                    { id: '3', label: 'Tier 3 (Budget/Emerging)' }
                  ].map((t) => {
                    const isChecked = selectedTierFilters.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedTierFilters(selectedTierFilters.filter(id => id !== t.id));
                            } else {
                              setSelectedTierFilters([...selectedTierFilters, t.id]);
                            }
                          }}
                          className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                        <span>{t.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Multi-Select Language Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsLangDropdownOpen(!isLangDropdownOpen);
                setIsTierDropdownOpen(false);
              }}
              className="pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white flex items-center gap-2 font-bold cursor-pointer shadow-sm relative"
            >
              <span>
                {selectedLangFilters.length === 0
                  ? 'All Languages'
                  : selectedLangFilters.length === 1
                  ? selectedLangFilters[0]
                  : `Languages (${selectedLangFilters.length})`}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            </button>

            {isLangDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-xl z-50 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2 text-xs font-bold text-slate-500">
                  <span>Filter by Language</span>
                  {selectedLangFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedLangFilters([])}
                      className="text-rose-500 hover:underline text-[10px]"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                  {systemLanguages.map((l) => {
                    const isChecked = selectedLangFilters.includes(l);
                    return (
                      <label
                        key={l}
                        className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedLangFilters(selectedLangFilters.filter(lang => lang !== l));
                            } else {
                              setSelectedLangFilters([...selectedLangFilters, l]);
                            }
                          }}
                          className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                        <span>{l}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Multi-Select Campaign Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsAppDropdownOpen(!isAppDropdownOpen);
                setIsLangDropdownOpen(false);
                setIsTierDropdownOpen(false);
              }}
              className="pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white flex items-center gap-2 font-bold cursor-pointer shadow-sm relative"
            >
              <span>
                {selectedAppFilters.length === 0
                  ? 'All Campaigns'
                  : selectedAppFilters.length === 1
                  ? selectedAppFilters[0]
                  : `Campaigns (${selectedAppFilters.length})`}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            </button>

            {isAppDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-xl z-50 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2 text-xs font-bold text-slate-500">
                  <span>Filter by Campaign</span>
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
                  {Array.from(new Set(['General Intake', ...applicationsList.map(a => a.name), ...vendors.map(v => v.applicationName || 'General Intake')])).sort().map((appName) => {
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
        </div>
      </section>

      {/* Directory Grid */}
      {viewMode === 'cards' ? (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredVendors.length > 0 ? (
              filteredVendors.map((vendor) => (
                <motion.div
                  key={vendor.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass dark:dark-glass rounded-2xl border border-slate-200/50 dark:border-white/10 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        {/* Name Priority (Primary Bold title) */}
                        <h4 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1">{vendor.contactName}</h4>
                        {/* Company Name (Secondary) */}
                        {vendor.companyName ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{vendor.companyName}</p>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5 italic">Individual Vendor</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        vendor.classificationTier === 1 
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          : vendor.classificationTier === 2
                          ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}>
                        Tier {vendor.classificationTier}
                      </span>
                    </div>

                    {/* Languages and services tags */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {vendor.workingLanguages.map((l, i) => {
                          const isVerified = l.testStatus === 'passed' || l.testStatus === 'waived';
                          return (
                            <span 
                              key={i} 
                              className={`inline-flex items-center gap-1 text-[10px] py-0.5 px-2 rounded-md font-semibold border ${
                                isVerified 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200/40 dark:border-white/5'
                              }`}
                              title={isVerified ? 'Tested & Verified Language Pair' : 'Untested / Self-Reported Language Pair'}
                            >
                              <Globe className="w-2.5 h-2.5" />
                              {l.language} ({formatProficiency(l.proficiency)})
                              {isVerified && <span className="text-[9px]">🟢</span>}
                            </span>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {vendor.services.map((s, i) => (
                          <span key={i} className="text-[10px] bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-0.5 px-2 rounded-md">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Confirmed PM Rate</span>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">${vendor.confirmedRate}/hr</span>
                    </div>

                    <button
                      onClick={() => setSelectedVendor(vendor)}
                      className="py-1.5 px-3 border border-slate-200 dark:border-border-dark text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1.5 btn-animate cursor-pointer dark:text-white"
                    >
                      View Details
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center text-slate-400">
                <Award className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h4 className="font-semibold text-lg text-slate-700 dark:text-slate-300">No approved vendors match</h4>
                <p className="text-xs mt-1">Try updating your language filters or search parameters.</p>
              </div>
            )}
          </AnimatePresence>
        </section>
      ) : (
        /* Table List View */
        <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-bg-dark text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/50 dark:border-border-dark">
                  <th className="p-4 pl-6">Contact Name</th>
                  <th className="p-4">Company</th>
                  <th className="p-4">Campaign</th>
                  <th className="p-4">Tier</th>
                  <th className="p-4">Languages</th>
                  <th className="p-4">Services</th>
                  <th className="p-4">PM Rate</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                {filteredVendors.length > 0 ? (
                  filteredVendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-4 pl-6 font-bold text-slate-900 dark:text-white">{vendor.contactName}</td>
                      <td className="p-4 text-slate-500 dark:text-slate-400">{vendor.companyName || <span className="italic text-slate-400">Individual</span>}</td>
                      <td className="p-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {vendor.applicationName || 'General Intake'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          vendor.classificationTier === 1 
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                            : vendor.classificationTier === 2
                            ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}>
                          Tier {vendor.classificationTier}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {vendor.workingLanguages.slice(0, 2).map((l, i) => (
                            <span key={i} className="text-[10px] bg-primary/10 text-primary py-0.5 px-2 rounded-md font-semibold">
                              {l.language}
                            </span>
                          ))}
                          {vendor.workingLanguages.length > 2 && (
                            <span className="text-[10px] text-slate-400 font-bold">+{vendor.workingLanguages.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {vendor.services.slice(0, 2).map((s, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 py-0.5 px-2 rounded-md">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">${vendor.confirmedRate}/hr</td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => setSelectedVendor(vendor)}
                          className="py-1 px-3 border border-slate-200 dark:border-border-dark text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1.5 btn-animate cursor-pointer dark:text-white inline-flex"
                        >
                          View
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <Award className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                      <h4 className="font-semibold text-lg text-slate-700 dark:text-slate-300">No approved vendors match</h4>
                      <p className="text-xs mt-1">Try updating your language filters or search parameters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-out details modal */}
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
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedVendor.contactName}</h3>
                    {selectedVendor.companyName && (
                      <p className="text-xs text-slate-500 font-medium">Company: {selectedVendor.companyName}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedVendor(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer animate-fade-in"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-5 text-sm">
                  {/* Signed NDA verified status */}
                  <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-bg-dark border border-slate-200/20 dark:border-white/5 rounded-2xl">
                    {selectedVendor.hasSignedNda ? (
                      <FileCheck className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                    )}
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">NDA Status</span>
                      <span className="text-[10px] text-slate-500 block">{selectedVendor.hasSignedNda ? 'Signed NDA Verified' : 'NDA Missing / Pending'}</span>
                    </div>
                  </div>

                  {/* Rates Card */}
                  <div className="bg-slate-50 dark:bg-bg-dark border border-slate-100 dark:border-white/5 rounded-2xl p-4 space-y-3">
                    <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Financial Rates Mapping</h5>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 border border-slate-200/40 dark:border-white/5 bg-white dark:bg-card-dark rounded-xl">
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-medium">MLC Hourly</span>
                        <span className="font-bold text-slate-800 dark:text-white">${selectedVendor.mlcHourlyRate}</span>
                      </div>
                      <div className="p-2 border border-slate-200/40 dark:border-white/5 bg-white dark:bg-card-dark rounded-xl">
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-medium">Offer Rate</span>
                        <span className="font-bold text-slate-800 dark:text-white">${selectedVendor.adjustedRate}</span>
                      </div>
                      <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl">
                        <span className="text-[9px] text-primary block font-extrabold uppercase">Confirmed</span>
                        <span className="font-extrabold text-primary">${selectedVendor.confirmedRate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vetted Languages & Services */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Services and Languages</h5>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-slate-500 block mb-1">Working Languages:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedVendor.workingLanguages.map((l, i) => (
                            <span key={i} className="text-xs bg-primary/15 text-primary py-0.5 px-2.5 rounded-md font-semibold">
                              {l.language} ({formatProficiency(l.proficiency)})
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block mb-1">Services Offered:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedVendor.services.map((s, i) => (
                            <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-0.5 px-2.5 rounded-md font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
                    <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider font-semibold">Contact Details</h5>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <a href={`mailto:${selectedVendor.email}`} className="text-primary hover:underline">{selectedVendor.email}</a>
                      </div>
                      {selectedVendor.secondaryEmail && (
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                          <Mail className="w-4 h-4 text-primary" />
                          <span className="text-primary">Google Acc: {selectedVendor.secondaryEmail}</span>
                        </div>
                      )}
                      {selectedVendor.phone && (
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{selectedVendor.phone}</span>
                        </div>
                      )}
                      {selectedVendor.linkedInProfile && (
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                          <ExternalLink className="w-4 h-4 text-slate-400" />
                          <a href={selectedVendor.linkedInProfile} target="_blank" rel="noreferrer" className="text-primary hover:underline">LinkedIn Profile</a>
                        </div>
                      )}
                      {selectedVendor.ndaUrl && (
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                          <FileCheck className="w-4 h-4 text-emerald-500" />
                          <a href={selectedVendor.ndaUrl} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">View Signed NDA Contract</a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Integration Metadata */}
                  <div className="bg-slate-50 dark:bg-bg-dark rounded-2xl p-4 border border-slate-100 dark:border-white/5 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span>Source Platform:</span>
                      <span className="font-bold capitalize">{selectedVendor.source} import</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hours Available:</span>
                      <span>{selectedVendor.hoursAvailable ? `${selectedVendor.hoursAvailable} hrs/wk` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>MT PE Experience:</span>
                      <span>{selectedVendor.mtPeExperience ? `${selectedVendor.mtPeExperience} yrs` : 'N/A'}</span>
                    </div>
                    {selectedVendor.resumeName && (
                      <div className="flex justify-between">
                        <span>Resume Name:</span>
                        <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300">{selectedVendor.resumeName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Full Evaluation & Agility Assessment */}
                {(selectedVendor.country || selectedVendor.availableStartDate || selectedVendor.mtqaExperienceYears || selectedVendor.agilitySelfAssessment || selectedVendor.customAnswers) && (
                  <div className="space-y-3 p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20">
                    <h5 className="font-extrabold text-xs text-primary uppercase tracking-wider">
                      Full Evaluation & Agility Assessment
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

              <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex gap-3">
                {user && user.role === 'admin' && (
                  <button
                    onClick={() => startEditingVendor(selectedVendor)}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl btn-animate cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-primary/10"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
                <button
                  onClick={() => setSelectedVendor(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl btn-animate cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit modal popup */}
      <AnimatePresence>
        {isEditing && selectedVendor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 m-auto z-50 w-full max-w-lg h-[90vh] bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-border-dark p-6 shadow-2xl overflow-y-auto flex flex-col justify-between"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Edit Linguist Profile: {selectedVendor.contactName}
                </h3>
                <button onClick={() => setIsEditing(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-bold text-slate-650 dark:text-slate-350 mt-4 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block uppercase tracking-wider text-[10px]">Contact Full Name</label>
                    <input
                      type="text"
                      required
                      value={editContactName}
                      onChange={(e) => setEditContactName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block uppercase tracking-wider text-[10px]">Company Name</label>
                    <input
                      type="text"
                      value={editCompanyName}
                      onChange={(e) => setEditCompanyName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block uppercase tracking-wider text-[10px]">Primary Email Address</label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block uppercase tracking-wider text-[10px]">Phone Number</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block uppercase tracking-wider text-[10px]">Services (Comma-separated)</label>
                  <input
                    type="text"
                    required
                    value={editServices}
                    onChange={(e) => setEditServices(e.target.value)}
                    placeholder="e.g. Translation, PE, Subtitling"
                    className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block uppercase tracking-wider text-[10px]">MLC Hourly Rate ($)</label>
                    <input
                      type="number"
                      required
                      value={editMlcRate}
                      onChange={(e) => setEditMlcRate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block uppercase tracking-wider text-[10px]">Confirmed Rate ($)</label>
                    <input
                      type="number"
                      required
                      value={editConfirmedRate}
                      onChange={(e) => setEditConfirmedRate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block uppercase tracking-wider text-[10px]">Classification Tier</label>
                    <select
                      value={editTier}
                      onChange={(e) => setEditTier(parseInt(e.target.value) as 1 | 2 | 3)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white cursor-pointer"
                    >
                      <option value={1}>Tier 1 (High Vetted)</option>
                      <option value={2}>Tier 2 (Standard Vetted)</option>
                      <option value={3}>Tier 3 (Budget/Emerging)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block uppercase tracking-wider text-[10px]">NDA Signature URL</label>
                    <input
                      type="text"
                      value={editNdaUrl}
                      onChange={(e) => setEditNdaUrl(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block uppercase tracking-wider text-[10px]">Candidate Database Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white cursor-pointer capitalize font-bold text-primary"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="on_hold">On Hold</option>
                      <option value="blacklisted">Blacklisted</option>
                      <option value="active">Active</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-1 pt-2">
                  <input
                    type="checkbox"
                    id="edit-nda-signed"
                    checked={editHasSignedNda}
                    onChange={(e) => setEditHasSignedNda(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary bg-slate-50 border-slate-200 cursor-pointer"
                  />
                  <label htmlFor="edit-nda-signed" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                    Manual Verified Signed NDA Contract
                  </label>
                </div>

                {/* Languages Management inside Directory Edit drawer */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/5">
                  <label className="block uppercase tracking-wider text-[10px] font-bold text-slate-400">Working Language Pairs</label>
                  
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/20 max-h-24 overflow-y-auto">
                    {editLanguages.map((l) => (
                      <span key={l.language} className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary py-1 px-2.5 rounded-lg font-semibold">
                        {l.language} ({formatProficiency(l.proficiency)})
                        <button type="button" onClick={() => handleRemoveLanguageFromEdit(l.language)} className="hover:text-rose-600 font-bold ml-1 text-slate-400">×</button>
                      </span>
                    ))}
                    {editLanguages.length === 0 && <span className="text-xs text-slate-400 font-light italic">No languages added</span>}
                  </div>

                  <div className="flex gap-2 items-center">
                    <select
                      value={selectedLangToAdd}
                      onChange={(e) => setSelectedLangToAdd(e.target.value)}
                      className="flex-1 p-2 bg-white dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs dark:text-white cursor-pointer font-bold"
                    >
                      {systemLanguages.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                    <select
                      value={selectedProfToAdd}
                      onChange={(e) => setSelectedProfToAdd(e.target.value as LanguageProficiency)}
                      className="p-2 bg-white dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs dark:text-white cursor-pointer font-bold"
                    >
                      {PROFICIENCY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddLanguageToEdit}
                      className="py-2 px-3 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl btn-animate cursor-pointer shadow-md shadow-primary/20"
                    >
                      Add Pair
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex gap-3 border-t border-slate-100 dark:border-white/5">
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
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl btn-animate cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl btn-animate cursor-pointer shadow-md shadow-primary/20"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
