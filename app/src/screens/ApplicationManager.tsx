import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import type { ApplicationConfig, LanguageConfig, CustomApplicationQuestion } from '../types';
import { FULL_DEFAULT_LANGUAGES, getActiveSortedLanguages } from '../types';
import { 
  Plus, 
  Copy, 
  Check, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  Globe, 
  DollarSign, 
  Layers, 
  FileText, 
  X,
  Sparkles,
  Search,
  ChevronDown,
  HelpCircle,
  Zap,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { DEFAULT_SERVICES_LIST } from '../types';

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (newSelected: string[]) => void;
  placeholder?: string;
}

const MultiSelectPopover: React.FC<MultiSelectProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholder = "Search options..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isAllSelected = selected.includes('all') || (options.length > 0 && selected.length === options.length);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleOption = (opt: string) => {
    if (isAllSelected) {
      const next = options.filter(item => item !== opt);
      onChange(next.length === 0 ? ['all'] : next);
      return;
    }

    if (selected.includes(opt)) {
      const next = selected.filter(item => item !== opt);
      onChange(next.length === 0 ? ['all'] : next);
    } else {
      const next = [...selected, opt];
      if (next.length >= options.length) {
        onChange(['all']);
      } else {
        onChange(next);
      }
    }
  };

  const handleSelectAll = () => {
    onChange(['all']);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2 relative">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">{label}</label>
        <span className="text-[10px] text-slate-400 font-mono">
          {isAllSelected ? 'All Selected' : `${selected.length} Selected`}
        </span>
      </div>

      {/* Popover Toggle Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between cursor-pointer hover:border-primary transition-colors"
      >
        <span className="truncate">
          {isAllSelected 
            ? 'All Configured Items (No Restrictions)' 
            : selected.length === 0 
            ? 'None Selected' 
            : `${selected.length} Item(s) Selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`} />
      </div>

      {/* Selected Items Tags Preview */}
      {!isAllSelected && selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selected.map((item) => (
            <span
              key={item}
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1"
            >
              {item}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOption(item);
                }}
                className="hover:text-rose-500 font-bold ml-0.5 cursor-pointer"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-xl z-50 p-3 space-y-3 max-h-64 flex flex-col">
            {/* Search Input & Action Buttons */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={placeholder}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-lg text-xs font-medium focus:outline-none focus:border-primary text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold border-b border-slate-100 dark:border-white/5 pb-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={`hover:underline cursor-pointer ${isAllSelected ? 'text-primary' : 'text-slate-500'}`}
                >
                  ✓ Select All (No Restrictions)
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-rose-500 hover:underline cursor-pointer"
                >
                  ✕ Clear All
                </button>
              </div>
            </div>

            {/* Scrollable Checklist */}
            <div className="overflow-y-auto flex-1 space-y-1 pr-1">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-slate-400 text-xs italic">No matching results found</div>
              ) : (
                filteredOptions.map((opt) => {
                  const isChecked = isAllSelected || selected.includes(opt);
                  return (
                    <label
                      key={opt}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        isChecked 
                          ? 'bg-primary/10 text-primary' 
                          : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{opt}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOption(opt)}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const ApplicationManager: React.FC = () => {
  const [applications, setApplications] = useState<ApplicationConfig[]>([]);
  const [languages, setLanguages] = useState<LanguageConfig[]>(FULL_DEFAULT_LANGUAGES);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<ApplicationConfig | null>(null);

  // Core Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [collectRates, setCollectRates] = useState(true);
  const [serviceMode, setServiceMode] = useState<'single' | 'multiple'>('multiple');
  const [selectedServices, setSelectedServices] = useState<string[]>(['all']);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['all']);
  const [portalTitle, setPortalTitle] = useState('');
  const [portalSubtitle, setPortalSubtitle] = useState('');

  // Detailed Evaluation Field Toggles State
  const [enableCountryTimeZone, setEnableCountryTimeZone] = useState(false);
  const [enableAvailableStartDate, setEnableAvailableStartDate] = useState(false);
  const [enableWeeklyAvailability, setEnableWeeklyAvailability] = useState(false);
  const [enableOtherLanguages, setEnableOtherLanguages] = useState(false);
  const [enableMtqaExperience, setEnableMtqaExperience] = useState(false);
  const [enableHandsOnExperience, setEnableHandsOnExperience] = useState(false);
  const [enableAgilityAssessment, setEnableAgilityAssessment] = useState(false);
  const [enableErrorTaggingExp, setEnableErrorTaggingExp] = useState(false);

  // Custom Questions State (Up to 5)
  const [customQuestions, setCustomQuestions] = useState<CustomApplicationQuestion[]>([]);

  // Subscribe to applications collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'applications'), (snapshot) => {
      const docs: ApplicationConfig[] = [];
      snapshot.forEach((docSnap) => {
        docs.push({ id: docSnap.id, ...docSnap.data() } as ApplicationConfig);
      });

      docs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setApplications(docs);
      setLoading(false);
    }, (err) => {
      console.error("Failed to load applications", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const [servicesList, setServicesList] = useState<string[]>(DEFAULT_SERVICES_LIST);

  // Subscribe to languages and services config
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global_config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.languages) {
          setLanguages(data.languages);
        }
        if (data.services && Array.isArray(data.services) && data.services.length > 0) {
          setServicesList(data.services);
        }
      }
    });
    return () => unsub();
  }, []);

  const generateCleanSlug = () => {
    const randomHex = Math.random().toString(36).substring(2, 7);
    return `app-${randomHex}`;
  };

  // Preset Handlers
  const applyGeneralPreset = () => {
    setEnableCountryTimeZone(false);
    setEnableAvailableStartDate(false);
    setEnableWeeklyAvailability(false);
    setEnableOtherLanguages(false);
    setEnableMtqaExperience(false);
    setEnableHandsOnExperience(false);
    setEnableAgilityAssessment(false);
    setEnableErrorTaggingExp(false);
  };

  const applyDetailedEvaluationPreset = () => {
    setEnableCountryTimeZone(true);
    setEnableAvailableStartDate(true);
    setEnableWeeklyAvailability(true);
    setEnableOtherLanguages(true);
    setEnableMtqaExperience(true);
    setEnableHandsOnExperience(true);
    setEnableAgilityAssessment(true);
    setEnableErrorTaggingExp(true);
  };

  const handleOpenAddModal = () => {
    setEditingApp(null);
    setName('');
    setSlug(generateCleanSlug());
    setDescription('');
    setIsActive(true);
    setCollectRates(true);
    setServiceMode('multiple');
    setSelectedServices(['all']);
    setSelectedLanguages(['all']);
    setPortalTitle('');
    setPortalSubtitle('');
    
    // Default to general form toggles off
    applyGeneralPreset();
    setCustomQuestions([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (app: ApplicationConfig) => {
    setEditingApp(app);
    setName(app.name);
    setSlug(app.slug || app.id);
    setDescription(app.description || '');
    setIsActive(app.isActive);
    setCollectRates(app.collectRates ?? true);
    setServiceMode(app.serviceMode || 'multiple');
    setSelectedServices(app.allowedServices || ['all']);
    setSelectedLanguages(app.allowedLanguages || ['all']);
    setPortalTitle(app.portalTitle || '');
    setPortalSubtitle(app.portalSubtitle || '');
    
    setEnableCountryTimeZone(!!app.enableCountryTimeZone);
    setEnableAvailableStartDate(!!app.enableAvailableStartDate);
    setEnableWeeklyAvailability(!!app.enableWeeklyAvailability);
    setEnableOtherLanguages(!!app.enableOtherLanguages);
    setEnableMtqaExperience(!!app.enableMtqaExperience);
    setEnableHandsOnExperience(!!app.enableHandsOnExperience);
    setEnableAgilityAssessment(!!app.enableAgilityAssessment);
    setEnableErrorTaggingExp(!!app.enableErrorTaggingExp);

    setCustomQuestions(app.customQuestions || []);
    setIsModalOpen(true);
  };

  const handleAddCustomQuestion = () => {
    if (customQuestions.length >= 5) {
      alert("You can add up to 5 custom questions per application form.");
      return;
    }
    const newQ: CustomApplicationQuestion = {
      id: `cq-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      questionText: '',
      questionType: 'open_ended',
      required: false
    };
    setCustomQuestions([...customQuestions, newQ]);
  };

  const handleUpdateCustomQuestion = (id: string, updates: Partial<CustomApplicationQuestion>) => {
    setCustomQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleRemoveCustomQuestion = (id: string) => {
    setCustomQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleSaveApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please provide an internal application name.");
      return;
    }

    const cleanSlugValue = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') || generateCleanSlug();
    const appId = editingApp ? editingApp.id : cleanSlugValue;

    const newApp: ApplicationConfig = {
      id: appId,
      slug: cleanSlugValue,
      name: name.trim(),
      description: description.trim(),
      isActive,
      allowedServices: selectedServices.length === 0 ? ['all'] : selectedServices,
      serviceMode,
      allowedLanguages: selectedLanguages.length === 0 ? ['all'] : selectedLanguages,
      collectRates,
      portalTitle: portalTitle.trim() || undefined,
      portalSubtitle: portalSubtitle.trim() || undefined,
      
      // Detailed field toggles
      enableCountryTimeZone,
      enableAvailableStartDate,
      enableWeeklyAvailability,
      enableOtherLanguages,
      enableMtqaExperience,
      enableHandsOnExperience,
      enableAgilityAssessment,
      enableErrorTaggingExp,

      // Custom Questions
      customQuestions: customQuestions.filter(q => q.questionText.trim() !== ''),

      submissionsCount: editingApp ? editingApp.submissionsCount : 0,
      createdAt: editingApp ? editingApp.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'applications', appId), newApp);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save application config", err);
      alert("Error saving application: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteApplication = async (appId: string, appName: string) => {
    if (confirm(`Are you sure you want to delete application "${appName}"? Applicants using this link will revert to the default application.`)) {
      try {
        await deleteDoc(doc(db, 'applications', appId));
      } catch (err) {
        console.error("Failed to delete application", err);
        alert("Error deleting application.");
      }
    }
  };

  const handleCopyLink = (appSlug: string) => {
    const fullUrl = `${window.location.origin}/portal/apply/${appSlug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(appSlug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const activeLangsList = getActiveSortedLanguages(languages).map((l) => l.name);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-card-dark p-6 rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Application Manager & Dynamic Intake Links
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Create, manage, and share targeted recruitment intake forms with custom service mixes, language scopes, rate requirements, and privacy-safe URLs.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="py-2.5 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-xs flex items-center gap-2 btn-animate cursor-pointer shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Create New Application Link
        </button>
      </div>

      {/* Grid of Applications */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-semibold">
          Loading applications...
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-12 text-center space-y-3">
          <Sparkles className="w-10 h-10 text-primary mx-auto" />
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base">No Custom Applications Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "Create New Application Link" to build your first targeted intake form for specific languages, services, or rate-free applications.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="py-2 px-4 bg-primary text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer mt-2"
          >
            <Plus className="w-4 h-4" /> Create Application
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {applications.map((app) => {
            const publicUrl = `${window.location.origin}/portal/apply/${app.slug || app.id}`;
            const isCopied = copiedSlug === (app.slug || app.id);

            return (
              <div 
                key={app.id} 
                className={`bg-white dark:bg-card-dark rounded-3xl p-6 border shadow-sm transition-all flex flex-col justify-between space-y-4 ${
                  app.isActive 
                    ? 'border-slate-200/60 dark:border-border-dark' 
                    : 'border-slate-200/40 dark:border-white/5 opacity-70 bg-slate-50/50 dark:bg-bg-dark'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1 border ${
                      app.isActive 
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300'
                    }`}>
                      {app.isActive ? '🟢 Active' : '⚪ Disabled'}
                    </span>

                    <span className="text-[11px] font-mono text-slate-400 font-bold">
                      {app.submissionsCount || 0} Submission(s)
                    </span>
                  </div>

                  {/* App Title & Description */}
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug">
                      {app.name}
                    </h3>
                    {app.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {app.description}
                      </p>
                    )}
                  </div>

                  {/* Privacy-Safe Public URL Slug Display */}
                  <div className="p-3 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/40 dark:border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span>Privacy-Safe Public Link</span>
                      <span className="font-mono text-primary">/{app.slug || app.id}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
                        {publicUrl}
                      </span>
                      <button
                        onClick={() => handleCopyLink(app.slug || app.id)}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0 ${
                          isCopied 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-white dark:bg-card-dark text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-border-dark hover:bg-slate-100'
                        }`}
                        title="Copy Public Link URL"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Settings Highlights */}
                  <div className="space-y-1.5 pt-1 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 font-medium text-slate-400">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        Rates Collection:
                      </span>
                      <span className="font-bold">
                        {app.collectRates ? 'Requested' : 'Disabled (Hidden)'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 font-medium text-slate-400">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        Services Scope:
                      </span>
                      <span className="font-bold">
                        {app.allowedServices?.includes('all') || !app.allowedServices?.length 
                          ? 'All Services' 
                          : `${app.allowedServices.length} Selected`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 font-medium text-slate-400">
                        <Globe className="w-3.5 h-3.5 text-indigo-500" />
                        Language Scope:
                      </span>
                      <span className="font-bold">
                        {app.allowedLanguages?.includes('all') || !app.allowedLanguages?.length 
                          ? 'All Languages' 
                          : `${app.allowedLanguages.length} Restricted`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
                  >
                    Preview Form <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(app)}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      title="Edit Application Config"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {app.id !== 'default' && (
                      <button
                        onClick={() => handleDeleteApplication(app.id, app.name)}
                        className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                        title="Delete Application"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT APPLICATION MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white dark:bg-card-dark rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/50 dark:border-border-dark z-50 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  {editingApp ? 'Edit Application Config' : 'Create New Application Link'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveApplication} className="space-y-6">
                {/* 1. Internal Info vs Public Slug */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                      Internal Campaign Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. YouTube Localization Q3"
                      className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                    />
                    <span className="text-[10px] text-slate-400 block">Private internal name (hidden from public applicants).</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block flex items-center justify-between">
                      <span>Public Privacy-Safe URL Slug *</span>
                      <button
                        type="button"
                        onClick={() => setSlug(generateCleanSlug())}
                        className="text-[10px] text-primary font-bold hover:underline cursor-pointer"
                      >
                        Re-generate Key
                      </button>
                    </label>
                    <div className="flex items-center">
                      <span className="px-2.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-mono border border-r-0 border-slate-200 dark:border-border-dark rounded-l-xl">
                        /portal/apply/
                      </span>
                      <input
                        type="text"
                        required
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="app-8f2a9"
                        className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-r-xl text-xs font-mono font-bold text-primary focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">Internal Description / Purpose</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief internal note regarding who this form link is sent to or campaign goals..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>

                {/* 2. Form Behavior Toggles */}
                <div className="p-4 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/50 dark:border-border-dark space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Form Behavior & Field Rules</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Collect Rates Toggle */}
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-card-dark rounded-xl border border-slate-200/50 dark:border-border-dark">
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">Collect Rates & Pricing</span>
                        <span className="text-[10px] text-slate-400 block">Ask for hourly/per-word rates</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCollectRates(!collectRates)}
                        className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${collectRates ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${collectRates ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>

                    {/* Active Status Toggle */}
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-card-dark rounded-xl border border-slate-200/50 dark:border-border-dark">
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">Application Link Status</span>
                        <span className="text-[10px] text-slate-400 block">Enable or disable public access</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsActive(!isActive)}
                        className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${isActive ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Services Scope Multi-Select Popover */}
                <MultiSelectPopover
                  label="Allowed Services"
                  options={servicesList}
                  selected={selectedServices}
                  onChange={setSelectedServices}
                  placeholder="Search services..."
                />

                {/* 4. Language Scope Multi-Select Popover */}
                <MultiSelectPopover
                  label="Allowed Languages"
                  options={activeLangsList.length > 0 ? activeLangsList : FULL_DEFAULT_LANGUAGES.map((l) => l.name)}
                  selected={selectedLanguages}
                  onChange={setSelectedLanguages}
                  placeholder="Search working languages..."
                />

                {/* 5. Detailed Form Field Visibility Controls & Presets */}
                <div className="p-4 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/50 dark:border-border-dark space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-border-dark pb-3">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-primary" /> Evaluation Suite & Question Toggles
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Control which question modules are included on this specific application form.</p>
                    </div>

                    {/* 1-Click Quick Presets */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                      <button
                        type="button"
                        onClick={applyGeneralPreset}
                        className="px-2.5 py-1 text-[10px] font-bold bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark hover:border-primary rounded-lg text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        General Form (Basic)
                      </button>
                      <button
                        type="button"
                        onClick={applyDetailedEvaluationPreset}
                        className="px-2.5 py-1 text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" /> Enable All Evaluation Questions
                      </button>
                    </div>
                  </div>

                  {/* Toggle Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center justify-between p-2.5 bg-white dark:bg-card-dark rounded-xl border border-slate-200/50 dark:border-border-dark cursor-pointer">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Country of Residence & Time Zone</span>
                      <input
                        type="checkbox"
                        checked={enableCountryTimeZone}
                        onChange={(e) => setEnableCountryTimeZone(e.target.checked)}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-white dark:bg-card-dark rounded-xl border border-slate-200/50 dark:border-border-dark cursor-pointer">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Available Start Date</span>
                      <input
                        type="checkbox"
                        checked={enableAvailableStartDate}
                        onChange={(e) => setEnableAvailableStartDate(e.target.checked)}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-white dark:bg-card-dark rounded-xl border border-slate-200/50 dark:border-border-dark cursor-pointer">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Weekly Availability Options</span>
                      <input
                        type="checkbox"
                        checked={enableWeeklyAvailability}
                        onChange={(e) => setEnableWeeklyAvailability(e.target.checked)}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-white dark:bg-card-dark rounded-xl border border-slate-200/50 dark:border-border-dark cursor-pointer">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Other Working Languages Field</span>
                      <input
                        type="checkbox"
                        checked={enableOtherLanguages}
                        onChange={(e) => setEnableOtherLanguages(e.target.checked)}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-white dark:bg-card-dark rounded-xl border border-slate-200/50 dark:border-border-dark cursor-pointer">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">MTQA / MTPE Years of Exp</span>
                      <input
                        type="checkbox"
                        checked={enableMtqaExperience}
                        onChange={(e) => setEnableMtqaExperience(e.target.checked)}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-white dark:bg-card-dark rounded-xl border border-slate-200/50 dark:border-border-dark cursor-pointer">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Proven Hands-On Experience Areas</span>
                      <input
                        type="checkbox"
                        checked={enableHandsOnExperience}
                        onChange={(e) => setEnableHandsOnExperience(e.target.checked)}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-white dark:bg-card-dark rounded-xl border border-slate-200/50 dark:border-border-dark cursor-pointer">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Technical Agility Self-Assessment (1-3)</span>
                      <input
                        type="checkbox"
                        checked={enableAgilityAssessment}
                        onChange={(e) => setEnableAgilityAssessment(e.target.checked)}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-white dark:bg-card-dark rounded-xl border border-slate-200/50 dark:border-border-dark cursor-pointer">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Structured Error-Tagging Experience</span>
                      <input
                        type="checkbox"
                        checked={enableErrorTaggingExp}
                        onChange={(e) => setEnableErrorTaggingExp(e.target.checked)}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* 6. Custom Questions Builder (Up to 5) */}
                <div className="p-4 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/50 dark:border-border-dark space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-border-dark pb-2">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-primary" /> Custom Questions (Up to 5)
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Add campaign-specific open-ended questions or 1-3 ratings.</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddCustomQuestion}
                      disabled={customQuestions.length >= 5}
                      className="py-1 px-3 bg-primary text-white rounded-lg text-xs font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Question ({customQuestions.length}/5)
                    </button>
                  </div>

                  {customQuestions.length === 0 ? (
                    <div className="text-center py-3 text-xs text-slate-400 italic">No custom questions added yet. Click "Add Question" to create one.</div>
                  ) : (
                    <div className="space-y-3">
                      {customQuestions.map((q, idx) => (
                        <div key={q.id} className="p-3 bg-white dark:bg-card-dark rounded-xl border border-slate-200/60 dark:border-border-dark space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Question #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomQuestion(q.id)}
                              className="text-rose-500 hover:text-rose-600 p-1 text-xs font-bold cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>

                          <input
                            type="text"
                            value={q.questionText}
                            onChange={(e) => handleUpdateCustomQuestion(q.id, { questionText: e.target.value })}
                            placeholder="e.g. Please describe your experience with specialized MemoQ workflows..."
                            className="w-full p-2 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-lg text-xs font-medium text-slate-900 dark:text-white"
                          />

                          <div className="flex items-center justify-between gap-4 pt-1">
                            <div className="flex items-center gap-3">
                              <label className="text-[11px] text-slate-500 font-bold flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`qtype-${q.id}`}
                                  checked={q.questionType === 'open_ended'}
                                  onChange={() => handleUpdateCustomQuestion(q.id, { questionType: 'open_ended' })}
                                  className="text-primary focus:ring-primary"
                                />
                                Open-Ended Text
                              </label>

                              <label className="text-[11px] text-slate-500 font-bold flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`qtype-${q.id}`}
                                  checked={q.questionType === 'rating_1_to_3'}
                                  onChange={() => handleUpdateCustomQuestion(q.id, { questionType: 'rating_1_to_3' })}
                                  className="text-primary focus:ring-primary"
                                />
                                Rating (1 to 3 Scale)
                              </label>
                            </div>

                            <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={q.required}
                                onChange={(e) => handleUpdateCustomQuestion(q.id, { required: e.target.checked })}
                                className="rounded text-primary focus:ring-primary"
                              />
                              Required
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 7. Custom Portal Copy Header (Optional) */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Custom Header Welcome Text (Optional)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={portalTitle}
                      onChange={(e) => setPortalTitle(e.target.value)}
                      placeholder="Custom Title e.g. Linguist Application"
                      className="p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={portalSubtitle}
                      onChange={(e) => setPortalSubtitle(e.target.value)}
                      placeholder="Custom Subtitle text..."
                      className="p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl cursor-pointer shadow-md shadow-primary/20"
                  >
                    {editingApp ? 'Save Application Config' : 'Create Application Link'}
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
