import React, { useState, useEffect } from 'react';
import { 
  Globe, Shield, Plus, Trash2, Save, RotateCcw, Edit2, Download, UploadCloud, CheckCircle2, FileText, Info, Mail, ChevronDown, ChevronUp, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StatusConfig, VendorProfile, LanguageConfig } from '../types';
import { normalizeLanguageList, FULL_DEFAULT_LANGUAGES } from '../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Default configuration settings to fallback on
const DEFAULT_LANGUAGES: LanguageConfig[] = FULL_DEFAULT_LANGUAGES;
const DEFAULT_STATUSES: StatusConfig[] = [
  { key: 'pending', color: 'yellow' },
  { key: 'approved', color: 'green' },
  { key: 'rejected', color: 'red' },
  { key: 'on_hold', color: 'blue' },
  { key: 'blacklisted', color: 'purple' },
  { key: 'active', color: 'indigo' }
];

export const STATUS_COLORS_MAP: Record<string, string> = {
  blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20',
  red: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20',
  yellow: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
  green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  purple: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20',
  indigo: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  pink: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/20',
  gray: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20'
};



export const Settings: React.FC = () => {
  const [languages, setLanguages] = useState<LanguageConfig[]>([]);
  const [statuses, setStatuses] = useState<StatusConfig[]>([]);
  
  // Testing Mode states
  const [testingEnabled, setTestingEnabled] = useState(false);
  const [testingRecipients, setTestingRecipients] = useState<string[]>(['mark@mlconnections.com']);
  const [adminsList, setAdminsList] = useState<{name: string, email: string}[]>([]);

  // SMTP Settings States
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');

  // New Language Form Input states
  const [newLangName, setNewLangName] = useState('');
  const [newLangCode, setNewLangCode] = useState('');
  const [newLangShortName, setNewLangShortName] = useState('');
  const [newLangPriority, setNewLangPriority] = useState(false);

  // Edit Language Input states
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingLangName, setEditingLangName] = useState('');
  const [editingLangCode, setEditingLangCode] = useState('');
  const [editingLangShortName, setEditingLangShortName] = useState('');

  // CSV Import States
  const [importedRows, setImportedRows] = useState<VendorProfile[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  // Collapsible section cards state (defaulted to collapsed)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    applications: false,
    languages: true,
    statuses: true,
    import: true,
    testing_mode: true,
    sla_nudges: true,
    smtp: true
  });

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  useEffect(() => {
    const loadAdminsFromUsersCollection = async () => {
      try {
        const { collection, getDocs } = await import('firebase/firestore');
        const usersSnap = await getDocs(collection(db, 'users'));
        const liveAdmins: { name: string; email: string }[] = [];

        usersSnap.forEach((doc) => {
          const u = doc.data();
          if (u.role === 'admin' && u.email) {
            liveAdmins.push({
              name: u.displayName || u.email,
              email: u.email
            });
          }
        });

        if (liveAdmins.length > 0) {
          setAdminsList(liveAdmins);
        } else {
          setAdminsList([{ name: 'Mark Bishop (Admin)', email: 'mark@mlconnections.com' }]);
        }
      } catch (err) {
        console.error("Failed to load admin list from users collection", err);
      }
    };
    loadAdminsFromUsersCollection();
  }, []);

  // SLA Nudge States
  const [slaNudgesEnabled, setSlaNudgesEnabled] = useState(true);
  const [slaNudgeMode, setSlaNudgeMode] = useState<'automated' | 'one_click'>('one_click');
  const [slaNdaWaitDays, setSlaNdaWaitDays] = useState(3);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global_config');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const config = docSnap.data();
          if (config.languages && Array.isArray(config.languages)) {
            setLanguages(normalizeLanguageList(config.languages));
          } else {
            setLanguages(DEFAULT_LANGUAGES);
          }
          if (config.statuses && Array.isArray(config.statuses)) {
            setStatuses(config.statuses);
          } else {
            setStatuses(DEFAULT_STATUSES);
          }
          if (config.testingMode) {
            setTestingEnabled(config.testingMode.enabled || false);
            setTestingRecipients(config.testingMode.recipientEmails || ['mark@mlconnections.com']);
          }
          if (config.slaNudges) {
            setSlaNudgesEnabled(config.slaNudges.enabled ?? true);
            setSlaNudgeMode(config.slaNudges.mode || 'one_click');
            setSlaNdaWaitDays(config.slaNudges.ndaWaitDays || 3);
          }
          if (config.smtp) {
            setSmtpHost(config.smtp.host || '');
            setSmtpPort(config.smtp.port?.toString() || '465');
            setSmtpUser(config.smtp.user || '');
            setSmtpPass(config.smtp.pass || '');
            setSmtpFrom(config.smtp.from || '');
          }
        } else {
          setLanguages(DEFAULT_LANGUAGES);
          setStatuses(DEFAULT_STATUSES);
        }
      } catch (err) {
        console.error("Failed to load settings from Firestore", err);
        setLanguages(DEFAULT_LANGUAGES);
        setStatuses(DEFAULT_STATUSES);
      }
    };
    loadSettings();
  }, []);

  const saveConfigDirect = async (
    updatedLangs: LanguageConfig[], 
    updatedStatuses: StatusConfig[],
    testEnabled: boolean = testingEnabled,
    testRecipients: string[] = testingRecipients,
    smtpConfigOverride?: { host: string; port: number; user: string; pass: string; from: string }
  ) => {
    try {
      const docRef = doc(db, 'settings', 'global_config');
      const snap = await getDoc(docRef);
      const existingData = snap.exists() ? snap.data() : {};

      const newConfig = {
        ...existingData,
        languages: updatedLangs,
        statuses: updatedStatuses,
        testingMode: {
          enabled: testEnabled,
          recipientEmails: testRecipients
        },
        slaNudges: {
          enabled: slaNudgesEnabled,
          mode: slaNudgeMode,
          ndaWaitDays: slaNdaWaitDays,
          maxNudges: 2
        },
        smtp: smtpConfigOverride || {
          host: smtpHost.trim(),
          port: parseInt(smtpPort) || 465,
          user: smtpUser.trim(),
          pass: smtpPass.trim(),
          from: smtpFrom.trim() || '"MLC Recruiting Team" <vm@mlconnections.com>'
        },
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, newConfig);

      localStorage.setItem('mlc_settings_languages', JSON.stringify(updatedLangs));
      localStorage.setItem('mlc_settings_statuses_v2', JSON.stringify(updatedStatuses));
      localStorage.setItem('mlc_settings_testing_mode', JSON.stringify({
        enabled: testEnabled,
        recipientEmails: testRecipients
      }));

      window.dispatchEvent(new Event('mlc-settings-saved'));

      const banner = document.getElementById('settings-save-success');
      if (banner) {
        banner.classList.remove('opacity-0');
        banner.classList.add('opacity-100');
        setTimeout(() => {
          banner.classList.remove('opacity-100');
          banner.classList.add('opacity-0');
        }, 2500);
      }
    } catch (err) {
      console.error("Failed to save settings directly to Firestore", err);
      alert("Failed to save configuration: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleAddLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newLangName.trim();
    if (!name) return;

    if (languages.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
      alert("A language with this name already exists in the system.");
      return;
    }

    const code = newLangCode.trim() || name.substring(0, 2).toLowerCase();
    const shortName = newLangShortName.trim().toUpperCase() || name.substring(0, 3).toUpperCase();

    const newLangItem: LanguageConfig = {
      name,
      code,
      shortName,
      isActive: true,
      isPriority: newLangPriority,
    };

    const updated = [...languages, newLangItem];
    setLanguages(updated);
    setNewLangName('');
    setNewLangCode('');
    setNewLangShortName('');
    setNewLangPriority(false);
    saveConfigDirect(updated, statuses);
  };

  const handleToggleLanguageActive = (langName: string) => {
    const updated = languages.map((l) => 
      l.name === langName ? { ...l, isActive: !l.isActive } : l
    );
    setLanguages(updated);
    saveConfigDirect(updated, statuses);
  };

  const handleToggleLanguagePriority = (langName: string) => {
    const updated = languages.map((l) => 
      l.name === langName ? { ...l, isPriority: !l.isPriority } : l
    );
    setLanguages(updated);
    saveConfigDirect(updated, statuses);
  };

  const handleDeleteLanguage = (langToDelete: string) => {
    if (confirm(`Are you sure you want to delete language "${langToDelete}"?`)) {
      const updated = languages.filter((l) => l.name !== langToDelete);
      setLanguages(updated);
      saveConfigDirect(updated, statuses);
    }
  };

  const handleStartEditLang = (index: number, currentItem: LanguageConfig) => {
    setEditingIndex(index);
    setEditingLangName(currentItem.name);
    setEditingLangCode(currentItem.code);
    setEditingLangShortName(currentItem.shortName || '');
  };

  const handleSaveEditLang = (index: number) => {
    if (!editingLangName.trim()) return;
    const updated = [...languages];
    updated[index] = {
      ...updated[index],
      name: editingLangName.trim(),
      code: editingLangCode.trim() || editingLangName.trim().substring(0, 2).toLowerCase(),
      shortName: editingLangShortName.trim().toUpperCase() || editingLangName.trim().substring(0, 3).toUpperCase(),
    };
    setLanguages(updated);
    setEditingIndex(null);
    saveConfigDirect(updated, statuses);
  };

  // CSV Language Upload Handler
  const handleUploadLanguageCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          alert("CSV file appears to be empty or missing data rows.");
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
        
        const langColIdx = headers.findIndex((h) => h.includes('language') || h.includes('name'));
        const codeColIdx = headers.findIndex((h) => h.includes('code'));
        const shortColIdx = headers.findIndex((h) => h.includes('short'));
        const activeColIdx = headers.findIndex((h) => h.includes('active') || h.includes('status'));
        const priorityColIdx = headers.findIndex((h) => h.includes('priority'));

        if (langColIdx === -1) {
          alert("Could not find a 'Language' or 'Name' column header in the CSV file.");
          return;
        }

        const parsedLangs: LanguageConfig[] = [];

        for (let i = 1; i < lines.length; i++) {
          const rowVals = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
          const name = rowVals[langColIdx];
          if (!name) continue;

          const code = codeColIdx !== -1 && rowVals[codeColIdx] ? rowVals[codeColIdx] : name.substring(0, 2).toLowerCase();
          const shortName = shortColIdx !== -1 && rowVals[shortColIdx] ? rowVals[shortColIdx].toUpperCase() : name.substring(0, 3).toUpperCase();
          
          let isActive = true;
          if (activeColIdx !== -1 && rowVals[activeColIdx]) {
            const activeVal = rowVals[activeColIdx].toLowerCase();
            if (activeVal === 'false' || activeVal === 'inactive' || activeVal === '0' || activeVal === 'no') {
              isActive = false;
            }
          }

          let isPriority = false;
          if (priorityColIdx !== -1 && rowVals[priorityColIdx]) {
            const prioVal = rowVals[priorityColIdx].toLowerCase();
            if (prioVal === 'true' || prioVal === 'yes' || prioVal === '1' || prioVal === 'priority') {
              isPriority = true;
            }
          }

          parsedLangs.push({
            name,
            code,
            shortName,
            isActive,
            isPriority
          });
        }

        if (parsedLangs.length === 0) {
          alert("No valid language rows were found in the uploaded file.");
          return;
        }

        const shouldMerge = confirm(
          `Parsed ${parsedLangs.length} languages from CSV.\n\nClick OK to MERGE with existing languages, or CANCEL to REPLACE the entire list.`
        );

        let finalLangs: LanguageConfig[] = [];
        if (shouldMerge) {
          const existingMap = new Map<string, LanguageConfig>();
          languages.forEach((l) => existingMap.set(l.name.toLowerCase(), l));
          parsedLangs.forEach((l) => existingMap.set(l.name.toLowerCase(), l));
          finalLangs = Array.from(existingMap.values());
        } else {
          finalLangs = parsedLangs;
        }

        setLanguages(finalLangs);
        saveConfigDirect(finalLangs, statuses);
        alert(`Successfully imported ${parsedLangs.length} languages from CSV!`);
      } catch (err) {
        console.error("Failed to parse language CSV", err);
        alert("Error parsing CSV file: " + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadLanguageCSVTemplate = () => {
    const headers = ['Language', 'Language Code', 'Short Name', 'Active', 'Priority'];
    const rows = [
      ['Spanish', 'es', 'SPA', 'true', 'true'],
      ['Japanese', 'ja', 'JPN', 'true', 'true'],
      ['German', 'de', 'DEU', 'true', 'false'],
      ['Mandarin', 'zh', 'ZHO', 'true', 'false'],
      ['Latin', 'la', 'LAT', 'false', 'false']
    ];

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'mlc_languages_normalization_template.csv');
    link.click();
  };



  const handleResetDefaults = () => {
    if (confirm("Reset languages and status tags to default system configuration?")) {
      setLanguages(DEFAULT_LANGUAGES);
      setStatuses(DEFAULT_STATUSES);
      saveConfigDirect(DEFAULT_LANGUAGES, DEFAULT_STATUSES);
    }
  };

  const handleSaveAll = () => {
    saveConfigDirect(languages, statuses);
  };

  // CSV Import Helpers
  const handleDownloadSampleCSV = () => {
    const headers = [
      'Company Name', 'Contact Name', 'Email', 'Secondary Email', 'Phone',
      'Services', 'Languages', 'Tier', 'Hourly Rate (Client)', 'Adjusted Rate (Offer)',
      'Confirmed Rate (Negotiated)', 'Stage', 'Status', 'Signed NDA', 'ProZ Link', 'LinkedIn Link'
    ];

    const sampleRow1 = [
      'Tokyo Language Partners', 'Hiroshi Tanaka', 'hiroshi@tokyolang.jp', 'hiroshi.tanaka.mlc@gmail.com', '+81 3 1234 5678',
      'Translation; Editing; MTPE', 'Japanese:native; English:professional', '1', '55', '50', '52',
      'outreach', 'pending', 'false', 'https://proz.com/profile/hiroshi', 'https://linkedin.com/in/hiroshi'
    ];

    const sampleRow2 = [
      'Iberian Words S.L.', 'Elena Fernandez', 'elena@iberianwords.es', '', '+34 91 555 6789',
      'Translation; Proofreading', 'Spanish:native; French:working', '2', '45', '40', '45',
      'nda', 'approved', 'true', 'https://proz.com/profile/elena', ''
    ];

    const csvContent = [
      headers.join(','),
      sampleRow1.map(v => `"${v}"`).join(','),
      sampleRow2.map(v => `"${v}"`).join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'mlc_linguist_import_template.csv');
    link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        alert("CSV file is empty or only contains header!");
        return;
      }

      const parsedVendors: VendorProfile[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.replace(/^"(.*)"$/, '$1').trim());

        if (row.length >= 3 && row[1] && row[2]) {
          const companyName = row[0] || '';
          const contactName = row[1];
          const email = row[2];
          const secondaryEmail = row[3] || '';
          const phone = row[4] || '';
          const servicesRaw = row[5] || 'Translation';
          const langsRaw = row[6] || 'English:native';
          const tierRaw = parseInt(row[7]) || 2;
          const rateClient = parseFloat(row[8]) || 45;
          const rateOffer = parseFloat(row[9]) || 40;
          const rateAgreed = parseFloat(row[10]) || 45;
          const stageRaw = (row[11] || 'outreach').toLowerCase();
          const statusRaw = (row[12] || 'pending').toLowerCase();
          const ndaRaw = (row[13] || 'false').toLowerCase() === 'true';

          const services = servicesRaw.split(';').map(s => s.trim()).filter(Boolean);
          const workingLanguages = langsRaw.split(';').map(lStr => {
            const parts = lStr.split(':').map(s => s.trim());
            return {
              language: parts[0] || 'English',
              proficiency: (parts[1] || 'working') as any
            };
          });

          const v: VendorProfile = {
            id: `import-${Date.now()}-${i}`,
            companyName,
            contactName,
            email,
            secondaryEmail,
            isGmail: email.includes('@gmail.com') || secondaryEmail.includes('@gmail.com'),
            phone,
            services: services.length > 0 ? services : ['Translation'],
            workingLanguages: workingLanguages.length > 0 ? workingLanguages : [{ language: 'English', proficiency: 'working' }],
            classificationTier: (tierRaw === 1 || tierRaw === 2 || tierRaw === 3) ? tierRaw : 2,
            mlcHourlyRate: rateClient,
            adjustedRate: rateOffer,
            confirmedRate: rateAgreed,
            stage: stageRaw as any,
            status: statusRaw as any,
            hasSignedNda: ndaRaw,
            source: 'external',
            category: 'outreach',
            submittedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          parsedVendors.push(v);
        }
      }

      setImportedRows(parsedVendors);
    };

    reader.readAsText(file);
  };

  const handleCommitImport = async () => {
    if (importedRows.length === 0) return;
    setIsImporting(true);

    try {
      for (const vendor of importedRows) {
        await setDoc(doc(db, 'vendors', vendor.id), vendor, { merge: true });
      }

      setImportSuccessMsg(`Successfully imported ${importedRows.length} linguist records into Cloud Firestore!`);
      setImportedRows([]);
      setImportFileName('');
      setTimeout(() => setImportSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Failed to commit CSV import to Firestore", err);
      alert("Failed to commit CSV import: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast Alert Success */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">System Settings</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
            Configure normalized working languages, status labels, email testing interceptors, and import linguist CSV data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div 
            id="settings-save-success"
            className="opacity-0 transition-opacity duration-300 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-2 px-3 rounded-xl border border-emerald-500/20 text-xs font-bold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Settings saved!
          </div>

          <button
            onClick={handleResetDefaults}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-2 btn-animate border border-slate-200/50 dark:border-white/5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          
          <button
            onClick={handleSaveAll}
            className="py-2.5 px-4 bg-primary hover:bg-primary-dark text-white font-extrabold text-xs rounded-xl flex items-center gap-2 btn-animate shadow-md shadow-primary/25 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>

      {/* Languages Panel (Full Width) */}
      <section className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-6 space-y-4 shadow-sm">
        <div 
          onClick={() => toggleSection('languages')}
          className="flex items-center justify-between cursor-pointer select-none pb-1"
        >
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Languages ({languages.length})
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure language codes, short names, priority sorting, and active status. Upload language CSV or manage entries below.
            </p>
          </div>
          <button type="button" className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
            {collapsedSections.languages ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>

          {!collapsedSections.languages && (
            <div className="space-y-4 border-t border-slate-100 dark:border-white/5 pt-4">
              {/* CSV Upload & Download Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/30 dark:border-white/5">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Language Batch CSV Upload:</span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="py-1.5 px-3 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl flex items-center gap-1.5 btn-animate cursor-pointer shadow-md shadow-primary/20">
                    <UploadCloud className="w-3.5 h-3.5" />
                    Upload CSV
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleUploadLanguageCSV}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleDownloadLanguageCSVTemplate}
                    className="py-1.5 px-3 bg-white dark:bg-card-dark text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-border-dark text-xs font-bold rounded-xl flex items-center gap-1.5 btn-animate cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                    CSV Template
                  </button>
                </div>
              </div>

              {/* Add Language Form */}
              <form onSubmit={handleAddLanguage} className="space-y-2 p-3 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/30 dark:border-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Add Single Language</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={newLangName}
                    onChange={(e) => setNewLangName(e.target.value)}
                    placeholder="Language Name (e.g. Swahili)"
                    className="flex-1 p-2 text-xs bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white"
                  />
                  <input
                    type="text"
                    value={newLangCode}
                    onChange={(e) => setNewLangCode(e.target.value)}
                    placeholder="Code (e.g. sw)"
                    className="w-24 p-2 text-xs bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white font-mono"
                  />
                  <input
                    type="text"
                    value={newLangShortName}
                    onChange={(e) => setNewLangShortName(e.target.value)}
                    placeholder="Short (SWA)"
                    className="w-24 p-2 text-xs bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white font-mono"
                  />

                  <label className="flex items-center gap-1.5 px-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newLangPriority}
                      onChange={(e) => setNewLangPriority(e.target.checked)}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                    Priority ⭐
                  </label>

                  <button
                    type="submit"
                    className="py-2 px-3.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 btn-animate cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </form>

              {/* Languages Table list */}
              <div className="border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden max-h-80 overflow-y-auto pr-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-bg-dark text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-white/5">
                      <th className="p-3 pl-4 w-10 text-center">Prio</th>
                      <th className="p-3">Language Name</th>
                      <th className="p-3">Code</th>
                      <th className="p-3">Short Name</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    <AnimatePresence>
                      {languages
                        .slice()
                        .sort((a, b) => {
                          if (a.isPriority && !b.isPriority) return -1;
                          if (!a.isPriority && b.isPriority) return 1;
                          return a.name.localeCompare(b.name);
                        })
                        .map((langItem) => {
                          const originalIdx = languages.findIndex((l) => l.name === langItem.name);
                          const isEditing = editingIndex === originalIdx;

                          return (
                            <motion.tr 
                              key={langItem.name}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className={`transition-colors ${
                                !langItem.isActive 
                                  ? 'opacity-40 bg-slate-50/30 dark:bg-white/[0.02]' 
                                  : langItem.isPriority 
                                  ? 'bg-amber-500/[0.03] hover:bg-amber-500/[0.07]' 
                                  : 'hover:bg-slate-50/50 dark:hover:bg-white/5'
                              }`}
                            >
                              <td className="p-3 pl-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleLanguagePriority(langItem.name)}
                                  className="p-1 hover:scale-110 transition-transform cursor-pointer"
                                  title={langItem.isPriority ? "Priority Language (Pinned to Top)" : "Set as Priority Language"}
                                >
                                  <Star 
                                    className={`w-4 h-4 ${langItem.isPriority ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'}`} 
                                  />
                                </button>
                              </td>

                              <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingLangName}
                                    onChange={(e) => setEditingLangName(e.target.value)}
                                    className="p-1.5 bg-white dark:bg-card-dark border rounded-lg text-xs font-bold"
                                  />
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span>{langItem.name}</span>
                                    {langItem.isPriority && (
                                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded">
                                        Top Prio
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td className="p-3 font-mono text-[11px] text-slate-500">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingLangCode}
                                    onChange={(e) => setEditingLangCode(e.target.value)}
                                    className="p-1.5 bg-white dark:bg-card-dark border rounded-lg text-xs font-bold w-16"
                                  />
                                ) : (
                                  <code className="bg-slate-100 dark:bg-bg-dark px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                                    {langItem.code || 'n/a'}
                                  </code>
                                )}
                              </td>

                              <td className="p-3 font-mono text-[11px] text-slate-500">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingLangShortName}
                                    onChange={(e) => setEditingLangShortName(e.target.value)}
                                    className="p-1.5 bg-white dark:bg-card-dark border rounded-lg text-xs font-bold w-16"
                                  />
                                ) : (
                                  <code className="bg-slate-100 dark:bg-bg-dark px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 uppercase">
                                    {langItem.shortName || 'n/a'}
                                  </code>
                                )}
                              </td>

                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleLanguageActive(langItem.name)}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                                    langItem.isActive 
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                      : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                  }`}
                                >
                                  {langItem.isActive ? 'Active' : 'Inactive'}
                                </button>
                              </td>

                              <td className="p-3 pr-4 text-right">
                                {isEditing ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditLang(originalIdx)}
                                    className="p-1 text-emerald-500 hover:text-emerald-600 font-bold"
                                  >
                                    Save
                                  </button>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditLang(originalIdx, langItem)}
                                      className="p-1 text-slate-400 hover:text-primary rounded"
                                      title="Edit language details"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLanguage(langItem.name)}
                                      className="p-1 text-slate-400 hover:text-rose-500 rounded"
                                      title="Delete language"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </motion.tr>
                          );
                        })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

      {/* CSV Import Panel */}
      <section className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-6 space-y-4 shadow-sm">
        <div 
          onClick={() => toggleSection('import')}
          className="flex items-center justify-between cursor-pointer select-none pb-1"
        >
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Import Linguist Data (CSV Batch Upload)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Bulk import vendor records into Cloud Firestore using a structured CSV file.
            </p>
          </div>
          <button type="button" className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
            {collapsedSections.import ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>

        {!collapsedSections.import && (
          <div className="space-y-6 border-t border-slate-100 dark:border-white/5 pt-4">
            <div className="flex justify-end">
              <button
                onClick={handleDownloadSampleCSV}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-border-dark text-xs font-bold rounded-xl flex items-center gap-2 btn-animate cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4 text-primary" />
                Download Sample CSV Template
              </button>
            </div>

            {/* Data Schema Guide Box */}
            <div className="p-4 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/40 dark:border-white/5 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Info className="w-4 h-4 text-primary" />
                CSV Data Structure & Field Requirements Guide:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                <ul className="space-y-1 list-disc pl-4 text-slate-500">
                  <li><strong className="text-slate-700 dark:text-slate-200">Company Name:</strong> Vendor company name (optional)</li>
                  <li><strong className="text-slate-700 dark:text-slate-200">Contact Name:</strong> Primary contact person full name (required)</li>
                  <li><strong className="text-slate-700 dark:text-slate-200">Email:</strong> Primary email address (required)</li>
                  <li><strong className="text-slate-700 dark:text-slate-200">Services:</strong> Semicolon-separated list (e.g. <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">Translation; MTPE; Editing</code>)</li>
                </ul>

                <ul className="space-y-1 list-disc pl-4 text-slate-500">
                  <li><strong className="text-slate-700 dark:text-slate-200">Languages:</strong> Semicolon-separated pairs with proficiency (e.g. <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">Japanese:native; English:professional</code>)</li>
                  <li><strong className="text-slate-700 dark:text-slate-200">Tier:</strong> Candidate tier rating (<code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">1</code>, <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">2</code>, or <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">3</code>)</li>
                  <li><strong className="text-slate-700 dark:text-slate-200">Stage:</strong> Stage ID (<code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">outreach, nda, ready_for_testing, in_testing, ready_for_pm</code>)</li>
                  <li><strong className="text-slate-700 dark:text-slate-200">Signed NDA:</strong> NDA status (<code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">true</code> or <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">false</code>)</li>
                </ul>
              </div>
            </div>

            {/* Upload Form Input */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl hover:bg-slate-50/50">
              <div className="flex-1 flex items-center gap-3">
                <UploadCloud className="w-8 h-8 text-primary" />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Select Linguist CSV File to Import</span>
                  <span className="text-[10px] text-slate-400">{importFileName || 'No file selected yet'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="py-2 px-4 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl cursor-pointer btn-animate shadow-md shadow-primary/20">
                  Browse CSV File
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {importedRows.length > 0 && (
                  <button
                    onClick={handleCommitImport}
                    disabled={isImporting}
                    className="py-2.5 px-5 bg-primary hover:bg-primary-dark text-white font-extrabold text-xs rounded-xl flex items-center gap-2 btn-animate shadow-md shadow-primary/20 cursor-pointer disabled:opacity-50"
                  >
                    {isImporting ? 'Importing...' : `Commit ${importedRows.length} Records to Database`}
                  </button>
                )}
              </div>
            </div>

            {/* Success Alert Banner */}
            {importSuccessMsg && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {importSuccessMsg}
              </div>
            )}

            {/* Imported Rows Preview */}
            {importedRows.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">CSV Preview ({importedRows.length} parsed records)</h4>
                <div className="border border-slate-200 dark:border-border-dark rounded-2xl overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-bg-dark text-slate-500 font-bold border-b border-slate-200 dark:border-border-dark">
                        <th className="p-3 pl-4">Contact Name</th>
                        <th className="p-3">Company</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Languages</th>
                        <th className="p-3">Stage</th>
                        <th className="p-3">Agreed Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-semibold">
                      {importedRows.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                          <td className="p-3 pl-4 font-bold text-slate-900 dark:text-white">{v.contactName}</td>
                          <td className="p-3 text-slate-500">{v.companyName || 'N/A'}</td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">{v.email}</td>
                          <td className="p-3 text-primary">{v.workingLanguages.map(l => `${l.language} (${l.proficiency})`).join(', ')}</td>
                          <td className="p-3 uppercase text-[10px] font-extrabold">{v.stage}</td>
                          <td className="p-3 font-mono">${v.confirmedRate}/hr</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Email Testing Mode Card */}
      <section className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-6 space-y-4 shadow-sm">
        <div 
          onClick={() => toggleSection('testing_mode')}
          className="flex items-center justify-between cursor-pointer select-none pb-1"
        >
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-rose-500" />
              Email Testing Mode Configuration ({testingEnabled ? '🟢 Active' : '⚪ Disabled'})
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Simulate and validate workflow emails safely. If active, all outbound emails are intercepted and routed to your chosen admin instead of the vendor.
            </p>
          </div>
          <button type="button" className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
            {collapsedSections.testing_mode ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>

        {!collapsedSections.testing_mode && (
          <div className="flex flex-col md:flex-row gap-6 items-stretch md:items-center justify-between border-t border-slate-100 dark:border-white/5 pt-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="testing-mode-active"
                checked={testingEnabled}
                onChange={(e) => {
                  const val = e.target.checked;
                  setTestingEnabled(val);
                  saveConfigDirect(languages, statuses, val, testingRecipients);
                }}
                className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500 bg-slate-50 border-slate-200 cursor-pointer"
              />
              <label htmlFor="testing-mode-active" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                Enable System Email Testing Mode (Redirect all outbound mails)
              </label>
            </div>

            <div className="flex-1 flex flex-col sm:flex-row gap-3 justify-end items-stretch sm:items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admins Intercept:</span>
              <div className="flex flex-wrap gap-2">
                {adminsList.map((admin) => {
                  const isSelected = testingRecipients.includes(admin.email);
                  return (
                    <button
                      key={admin.email}
                      type="button"
                      onClick={() => {
                        const updated = testingRecipients.includes(admin.email)
                          ? testingRecipients.filter((e) => e !== admin.email)
                          : [...testingRecipients, admin.email];
                        setTestingRecipients(updated);
                        saveConfigDirect(languages, statuses, testingEnabled, updated);
                      }}
                      disabled={!testingEnabled}
                      className={`py-2 px-3 rounded-xl border text-[11px] font-bold transition-all text-left flex items-center justify-between gap-3 cursor-pointer ${
                        !testingEnabled 
                          ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-bg-dark border-slate-200/40 text-slate-400'
                          : isSelected
                          ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                          : 'bg-white dark:bg-card-dark text-slate-700 dark:text-slate-300 border-slate-200/50 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="block font-bold">{admin.name}</span>
                        <span className="text-[9px] font-normal text-slate-400 block">{admin.email}</span>
                      </div>
                      {testingEnabled && isSelected && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* SLA Nudges & Follow-Up Reminders Card */}
      <section className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-6 space-y-4 shadow-sm">
        <div 
          onClick={() => toggleSection('sla_nudges')}
          className="flex items-center justify-between cursor-pointer select-none pb-1"
        >
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              SLA Nudges & Automated Follow-Up Reminders ({slaNudgesEnabled ? '🟢 Enabled' : '⚪ Disabled'})
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure automated follow-up reminders for stagnant candidates who have not signed their NDA or completed required steps.
            </p>
          </div>
          <button type="button" className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
            {collapsedSections.sla_nudges ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>

        {!collapsedSections.sla_nudges && (
          <div className="space-y-4 border-t border-slate-100 dark:border-white/5 pt-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="sla-nudges-enabled"
                checked={slaNudgesEnabled}
                onChange={(e) => {
                  const val = e.target.checked;
                  setSlaNudgesEnabled(val);
                }}
                className="w-5 h-5 rounded text-primary focus:ring-primary bg-slate-50 border-slate-200 cursor-pointer"
              />
              <label htmlFor="sla-nudges-enabled" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                Enable SLA Follow-Up Nudges & Reminders
              </label>
            </div>

            {slaNudgesEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/40">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nudge Execution Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSlaNudgeMode('one_click')}
                      className={`py-2 px-3 border text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                        slaNudgeMode === 'one_click'
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white dark:bg-card-dark text-slate-600 dark:text-slate-300 border-slate-200/40'
                      }`}
                    >
                      1-Click PM Approval
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlaNudgeMode('automated')}
                      className={`py-2 px-3 border text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                        slaNudgeMode === 'automated'
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white dark:bg-card-dark text-slate-600 dark:text-slate-300 border-slate-200/40'
                      }`}
                    >
                      Fully Automated (Background)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    NDA Wait Days (Threshold)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={slaNdaWaitDays}
                      onChange={(e) => setSlaNdaWaitDays(parseInt(e.target.value) || 3)}
                      className="w-24 p-2 text-xs bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none"
                    />
                    <span className="text-xs text-slate-500 font-semibold">Days in NDA stage before reminder</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* SMTP Mail Server Configuration Panel */}
      <section className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-6 space-y-4 shadow-sm">
        <div 
          onClick={() => toggleSection('smtp')}
          className="flex items-center justify-between cursor-pointer select-none pb-1"
        >
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              SMTP Mail Server Configuration (Outgoing Mail Settings)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure standard SMTP host and credentials for recruiting notification emails.
            </p>
          </div>
          <button type="button" className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
            {collapsedSections.smtp ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>

        {!collapsedSections.smtp && (
          <div className="space-y-4 border-t border-slate-100 dark:border-white/5 pt-4">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  const configObj = {
                    host: smtpHost.trim(),
                    port: parseInt(smtpPort) || 465,
                    user: smtpUser.trim(),
                    pass: smtpPass.trim(),
                    from: smtpFrom.trim() || '"MLC Recruiting Team" <vm@mlconnections.com>'
                  };
                  saveConfigDirect(languages, statuses, testingEnabled, testingRecipients, configObj);
                }}
                className="py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold btn-animate shadow-sm cursor-pointer"
              >
                Save SMTP Settings
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block">SMTP Outbound Host</label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="e.g. smtp.sendgrid.net or smtp.gmail.com"
                  className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block">SMTP Server Port</label>
                <input
                  type="text"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="e.g. 465 or 587"
                  className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Sender Friendly From Address</label>
                <input
                  type="text"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  placeholder='"MLC Recruiting Team" <vm@mlconnections.com>'
                  className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block">SMTP Username</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="e.g. apikey or user@domain.com"
                  className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block">SMTP Password / API Key</label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white"
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
