import React, { useState } from 'react';
import { 
  FileText, ShieldCheck, BookOpen, ExternalLink, Copy, Check, 
  HelpCircle, ArrowRight, UserCheck, ChevronDown, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ApplicationManager } from './ApplicationManager';

export const PortalModulesScreen: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [isAppManagerCollapsed, setIsAppManagerCollapsed] = useState(true);

  const toggleExpand = (id: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCopyLink = (e: React.MouseEvent, url: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sampleVendorId = 'cand-1785542235';

  const modules = [
    {
      id: 'nda-portal',
      name: 'Non-Disclosure Agreement (NDA) Signing Portal',
      icon: ShieldCheck,
      badge: 'Candidate Portal',
      badgeColor: 'bg-primary/10 text-primary border-primary/20',
      url: `https://mlc-vendor-recruitment.web.app/portal/nda/${sampleVendorId}`,
      path: `/portal/nda/${sampleVendorId}`,
      targetAudience: 'Vetted Candidates in NDA Stage',
      summary: 'Public legal document viewer and typed digital signature portal with on-screen legal text and printable PDF executed agreement download.',
      howToUse: [
        'When moving a candidate to the NDA stage, the automated workflow dispatches an email with their custom link: /portal/nda/[vendorId].',
        'The candidate reviews the pre-filled legal text, types their legal name, agrees to terms, and submits.',
        'Upon submission, the system records an immutable timestamped audit log, updates stage progress to 🟢 Completed, and auto-advances the candidate to Ready for Testing.'
      ]
    },
    {
      id: 'grading-portal',
      name: 'Linguistic Test Grading Portal',
      icon: BookOpen,
      badge: 'Internal PM & Grader Tool',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      url: 'https://mlc-vendor-recruitment.web.app/testing',
      path: '/testing',
      targetAudience: 'PMs & Senior Evaluators',
      summary: 'Internal assessment management portal for evaluating candidate translation tests, grading quality, and reviewing linguistic scores.',
      howToUse: [
        'Navigate to the Grading Portal tab in the sidebar.',
        'Select a candidate in In Testing stage and assign or grade their translation test.',
        'Assigning a Passing grade automatically flips stage status to 🟢 Completed, while a Failing grade flips status to 🔴 Failed.'
      ]
    },
    {
      id: 'contract-portal',
      name: 'Independent Contractor Agreement (ICA) & Compliance Module',
      icon: FileText,
      badge: 'Coming Soon — Contract Compliance',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      url: 'https://mlc-vendor-recruitment.web.app/portal/nda/cand-1785542235',
      path: '/portal/nda/cand-1785542235',
      targetAudience: 'Approved Linguists before XTRF Onboarding',
      summary: 'Contract execution portal for executing standard rate schedules, tax compliance documentation, and master services agreements prior to XTRF portal registration (🚧 Coming Soon).',
      howToUse: [
        '🚧 Coming Soon: Independent Contractor Agreement (ICA) execution module is currently under active development.',
        'Used during final compliance onboarding before candidate is registered in XTRF.',
        'Verifies agreed rates, payment currency, and master service terms.'
      ]
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Portal Modules & Integration Guide
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
            Overview of candidate-facing public portals, automated stage triggers, and instructions on how PMs and candidates interact with each module.
          </p>
        </div>
      </div>

      {/* Live Application Manager & Intake Form Builder (Collapsible, Default Collapsed) */}
      <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm overflow-hidden">
        <div
          onClick={() => setIsAppManagerCollapsed(!isAppManagerCollapsed)}
          className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border inline-block mb-1 bg-primary/10 text-primary border-primary/20">
                Live Intake Form Manager
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                Application Forms & Intake Links
              </h3>
              <p className="text-xs text-slate-400 font-medium">Create and manage targeted intake forms with privacy-safe links, rates collection rules, and language scopes.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs font-bold text-slate-400">
              {isAppManagerCollapsed ? 'Click to Expand' : 'Click to Collapse'}
            </span>
            <div className="p-2 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/10 transition-transform">
              <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${!isAppManagerCollapsed ? 'rotate-180 text-primary' : ''}`} />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {!isAppManagerCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-bg-dark/50 p-6 sm:p-8"
            >
              <ApplicationManager />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Other Portal Modules Guide Cards */}
      <div className="grid grid-cols-1 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const isExpanded = !!expandedModules[mod.id];

          return (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm overflow-hidden transition-all duration-200"
            >
              {/* Module Header (Clickable Trigger) */}
              <div 
                onClick={() => toggleExpand(mod.id)}
                className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border inline-block mb-1 ${mod.badgeColor}`}>
                      {mod.badge}
                    </span>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      {mod.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">Target Audience: {mod.targetAudience}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={(e) => handleCopyLink(e, mod.url, mod.id)}
                    className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 btn-animate cursor-pointer border border-slate-200/40 dark:border-white/5"
                  >
                    {copiedId === mod.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-primary" />}
                    {copiedId === mod.id ? 'Copied!' : 'Copy URL'}
                  </button>

                  <a
                    href={mod.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="py-2 px-3.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 btn-animate shadow-md shadow-primary/20"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Portal
                  </a>

                  <div className="p-2 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/10 transition-transform">
                    <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : ''}`} />
                  </div>
                </div>
              </div>

              {/* Collapsible Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-bg-dark/50 p-6 sm:p-8"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                      {/* Summary */}
                      <div className="space-y-2 p-4 bg-white dark:bg-card-dark rounded-2xl border border-slate-200/40 dark:border-white/5">
                        <h4 className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-primary" />
                          Module Overview
                        </h4>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                          {mod.summary}
                        </p>
                        <div className="pt-2 text-[11px] font-mono text-slate-400 break-all">
                          URL: {mod.url}
                        </div>
                      </div>

                      {/* How To Use */}
                      <div className="md:col-span-2 space-y-2 p-4 bg-white dark:bg-card-dark rounded-2xl border border-slate-200/40 dark:border-white/5">
                        <h4 className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-primary" />
                          How to Use & Workflow Integration
                        </h4>
                        <ul className="space-y-2 text-slate-600 dark:text-slate-300 font-medium">
                          {mod.howToUse.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

