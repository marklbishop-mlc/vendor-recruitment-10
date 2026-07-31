import React, { useState, useEffect } from 'react';
import { 
  Globe, Shield, Plus, Trash2, Save, CheckCircle2, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StatusConfig } from '../types';

// Default configuration settings to fallback on
const DEFAULT_LANGUAGES = ['English', 'Spanish', 'German', 'Japanese', 'Mandarin', 'Swedish', 'Wolof', 'French', 'Portuguese'];
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
  const [languages, setLanguages] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<StatusConfig[]>([]);
  
  // New input states
  const [newLang, setNewLang] = useState('');
  const [newStatusKey, setNewStatusKey] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('blue');
  
  // Save notification toast state
  const [showToast, setShowToast] = useState(false);

  // Load configuration from local storage fallback or mock defaults
  useEffect(() => {
    const savedLangs = localStorage.getItem('mlc_settings_languages');
    const savedStatuses = localStorage.getItem('mlc_settings_statuses_v2');
    
    if (savedLangs) {
      setLanguages(JSON.parse(savedLangs));
    } else {
      setLanguages(DEFAULT_LANGUAGES);
    }
    
    if (savedStatuses) {
      setStatuses(JSON.parse(savedStatuses));
    } else {
      setStatuses(DEFAULT_STATUSES);
    }
  }, []);

  const handleSaveAll = () => {
    localStorage.setItem('mlc_settings_languages', JSON.stringify(languages));
    localStorage.setItem('mlc_settings_statuses_v2', JSON.stringify(statuses));
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleAddLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLang.trim()) return;
    if (languages.map(l => l.toLowerCase()).includes(newLang.trim().toLowerCase())) return;
    
    setLanguages((prev) => [...prev, newLang.trim()]);
    setNewLang('');
  };

  const handleRemoveLanguage = (lang: string) => {
    setLanguages((prev) => prev.filter((l) => l !== lang));
  };

  const handleAddStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const statusKey = newStatusKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (!statusKey) return;
    if (statuses.some((s) => s.key === statusKey)) return;

    setStatuses((prev) => [...prev, { key: statusKey, color: newStatusColor }]);
    setNewStatusKey('');
    setNewStatusColor('blue');
  };

  const handleRemoveStatus = (statusKey: string) => {
    if (['pending', 'approved', 'rejected'].includes(statusKey)) {
      alert("Core pipeline statuses ('pending', 'approved', 'rejected') are locked and cannot be deleted.");
      return;
    }
    setStatuses((prev) => prev.filter((s) => s.key !== statusKey));
  };

  const handleResetDefaults = () => {
    if (window.confirm("Are you sure you want to revert to original default languages and status states?")) {
      setLanguages(DEFAULT_LANGUAGES);
      setStatuses(DEFAULT_STATUSES);
      localStorage.setItem('mlc_settings_languages', JSON.stringify(DEFAULT_LANGUAGES));
      localStorage.setItem('mlc_settings_statuses_v2', JSON.stringify(DEFAULT_STATUSES));
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 right-8 z-50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 py-3 px-5 rounded-2xl border border-emerald-500/20 text-xs font-bold flex items-center gap-2 shadow-xl animate-fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Settings successfully committed to configuration!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">System Settings</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
            Configure normalized working languages and customize status label colors.
          </p>
        </div>

        <div className="flex items-center gap-3">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Normalized Languages Panel */}
        <section className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-6 space-y-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Normalized Languages
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Add or remove languages available in the recruitment intake forms. Modifying this list updates all filters globally.
            </p>

            {/* Add Language Form */}
            <form onSubmit={handleAddLanguage} className="flex gap-2">
              <input
                type="text"
                required
                value={newLang}
                onChange={(e) => setNewLang(e.target.value)}
                placeholder="e.g. Swahili, Arabic"
                className="flex-1 p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
              />
              <button
                type="submit"
                className="py-2.5 px-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 btn-animate"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </form>

            {/* Languages Table list */}
            <div className="border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden max-h-80 overflow-y-auto pr-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-bg-dark text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-white/5">
                    <th className="p-3 pl-4">Language Name</th>
                    <th className="p-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  <AnimatePresence>
                    {languages.map((lang) => (
                      <motion.tr 
                        key={lang}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="p-3 pl-4 font-bold text-slate-800 dark:text-slate-200">{lang}</td>
                        <td className="p-3 pr-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveLanguage(lang)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-500/5 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Customizable Statuses Panel */}
        <section className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-6 space-y-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-secondary" />
              Candidate Status Values
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Add custom statuses for vendor classification and select color tags associated with the status value.
            </p>

            {/* Add Status Form */}
            <form onSubmit={handleAddStatus} className="flex gap-2">
              <input
                type="text"
                required
                value={newStatusKey}
                onChange={(e) => setNewStatusKey(e.target.value)}
                placeholder="e.g. on_hold, blacklisted"
                className="flex-1 p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
              />
              
              {/* Color Selector Dropdown */}
              <select
                value={newStatusColor}
                onChange={(e) => setNewStatusColor(e.target.value)}
                className="p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-slate-900 dark:text-white cursor-pointer font-bold capitalize"
              >
                {Object.keys(STATUS_COLORS_MAP).map((color) => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>

              <button
                type="submit"
                className="py-2.5 px-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 btn-animate"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </form>

            {/* Statuses table */}
            <div className="border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden max-h-80 overflow-y-auto pr-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-bg-dark text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-white/5">
                    <th className="p-3 pl-4">Status Slug Key</th>
                    <th className="p-3">Color Badge Label</th>
                    <th className="p-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  <AnimatePresence>
                    {statuses.map((status) => {
                      const isLocked = ['pending', 'approved', 'rejected'].includes(status.key);
                      return (
                        <motion.tr 
                          key={status.key}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
                        >
                          <td className="p-3 pl-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {status.key}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-lg uppercase ${
                              STATUS_COLORS_MAP[status.color] || STATUS_COLORS_MAP.gray
                            }`}>
                              {status.color}
                            </span>
                          </td>
                          <td className="p-3 pr-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveStatus(status.key)}
                              disabled={isLocked}
                              className={`p-1 rounded transition-colors ${
                                isLocked 
                                  ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-red-500 hover:bg-red-500/5 cursor-pointer'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
