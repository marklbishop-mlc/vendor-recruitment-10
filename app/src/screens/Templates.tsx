import React, { useState } from 'react';
import type { EmailTemplate, NotificationLog, WorkflowStage, WorkflowAction } from '../types';
import { 
  Mail, Save, Sparkles, Eye, Play, CheckCircle, X, Plus, Trash2, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock templates mapping workflow stages
const INITIAL_TEMPLATES: EmailTemplate[] = [
  {
    id: 't-1',
    name: 'Sourced Lead Welcome',
    subject: 'MLC Localization Partnership Opportunity',
    body: 'Hi {{Vendor_Name}},\n\nWe have reviewed your profile and are interested in exploring a localization partnership with you for {{Language}} projects.\n\nOur initial project hourly offer rate is {{Adjusted_Rate}}/hr.\n\nPlease confirm if you are interested!\n\nBest,\nMLC Recruiting Team',
    stage: 'sourced',
    lastUpdated: '2026-07-25T10:00:00Z'
  },
  {
    id: 't-2',
    name: 'NDA Signature Request',
    subject: 'Action Required: Sign NDA for MLC Projects',
    body: 'Hi {{Vendor_Name}},\n\nBefore we can assign translation testing or share project materials, we require a signed Non-Disclosure Agreement (NDA).\n\nPlease review and sign the agreement here: {{Project_Link}}\n\nYour NDA Status is currently: {{NDA_Status}}\n\nThank you,\nMLC Compliance Office',
    stage: 'nda_pending',
    lastUpdated: '2026-07-28T14:30:00Z'
  },
  {
    id: 't-3',
    name: 'Testing Invitation',
    subject: 'MLC Language Testing Assignment - {{Language}}',
    body: 'Hi {{Vendor_Name}},\n\nThank you for signing the NDA. The next step is to complete our language assessment.\n\nYou have been assigned a test translation project. You can access it using the link below:\nLink: {{Project_Link}}\n\nPlease submit the translation before the scheduled deadline.\n\nRegards,\nMLC Quality Managers',
    stage: 'testing_assigned',
    lastUpdated: '2026-07-30T09:15:00Z'
  }
];

// Initial set of conditional workflow actions
const INITIAL_ACTIONS: WorkflowAction[] = [
  {
    id: 'act-1',
    name: 'Send NDA on Sourced Stage',
    triggerStage: 'sourced',
    field: 'hasSignedNda',
    operator: '==',
    value: 'false',
    actionType: 'send_email',
    templateId: 't-2',
    isActive: true
  },
  {
    id: 'act-2',
    name: 'Auto-Invite Gmail Users to Test',
    triggerStage: 'nda_verified',
    field: 'isGmail',
    operator: '==',
    value: 'true',
    actionType: 'send_email',
    templateId: 't-3',
    isActive: true
  }
];

const INITIAL_QUEUE: NotificationLog[] = [
  {
    id: 'n-1',
    vendorId: 'v-2',
    email: 'hana@lingoglobe.jp',
    subject: 'MLC Language Testing Assignment - Japanese -> English',
    status: 'sent',
    sentAt: '2026-07-28T15:00:00Z'
  },
  {
    id: 'n-2',
    vendorId: 'v-3',
    email: 'freja@nordicwords.se',
    subject: 'MLC Localization Partnership Opportunity',
    status: 'queued'
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

const MOCK_MERGE_VALUES = {
  Vendor_Name: 'Hana Tanaka',
  Language: 'Japanese (Native), English (Professional)',
  Adjusted_Rate: '$50',
  Project_Link: 'https://mlconnections.com/portal/onboarding/v-2',
  NDA_Status: 'NDA Missing'
};

export const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>(INITIAL_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(INITIAL_TEMPLATES[0]);
  const [queue, setQueue] = useState<NotificationLog[]>(INITIAL_QUEUE);

  // Workflow Actions states
  const [workflowActions, setWorkflowActions] = useState<WorkflowAction[]>(INITIAL_ACTIONS);
  
  // Modals state
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [isAddActionOpen, setIsAddActionOpen] = useState(false);

  // Add Template fields
  const [newTmplName, setNewTmplName] = useState('');
  const [newTmplSubject, setNewTmplSubject] = useState('');
  const [newTmplStage, setNewTmplStage] = useState<WorkflowStage>('sourced');

  // Add Action fields
  const [newActName, setNewActName] = useState('');
  const [newActStage, setNewActStage] = useState<WorkflowStage>('sourced');
  const [newActField, setNewActField] = useState('isGmail');
  const [newActOperator, setNewActOperator] = useState<WorkflowAction['operator']>('==');
  const [newActVal, setNewActVal] = useState('true');
  const [newActType, setNewActType] = useState<WorkflowAction['actionType']>('send_email');
  const [newActTemplate, setNewActTemplate] = useState(INITIAL_TEMPLATES[0].id);

  // Editor states
  const [subject, setSubject] = useState(selectedTemplate.subject);
  const [body, setBody] = useState(selectedTemplate.body);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewContent, setPreviewContent] = useState({ subject: '', body: '' });

  const mergeTags = ['Vendor_Name', 'Language', 'Adjusted_Rate', 'Project_Link', 'NDA_Status'];

  const handleTemplateSelect = (tmpl: EmailTemplate) => {
    setSelectedTemplate(tmpl);
    setSubject(tmpl.subject);
    setBody(tmpl.body);
  };

  const handleSaveTemplate = () => {
    setTemplates((prev) => 
      prev.map((t) => 
        t.id === selectedTemplate.id 
          ? { ...t, subject, body, lastUpdated: new Date().toISOString() } 
          : t
      )
    );
    triggerAlertToast();
  };

  const triggerAlertToast = () => {
    const saveBanner = document.getElementById('save-success-banner');
    if (saveBanner) {
      saveBanner.classList.remove('opacity-0');
      setTimeout(() => saveBanner.classList.add('opacity-0'), 2500);
    }
  };

  const handleAddTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTmplName.trim()) return;

    const tmpl: EmailTemplate = {
      id: `t-${Date.now()}`,
      name: newTmplName.trim(),
      subject: newTmplSubject.trim() || 'Localization Notification',
      body: 'Hi {{Vendor_Name}},\n\nEnter email copy...',
      stage: newTmplStage,
      lastUpdated: new Date().toISOString()
    };

    setTemplates((prev) => [...prev, tmpl]);
    setIsAddTemplateOpen(false);
    setNewTmplName('');
    setNewTmplSubject('');
    handleTemplateSelect(tmpl);
  };

  const handleAddActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActName.trim()) return;

    const act: WorkflowAction = {
      id: `act-${Date.now()}`,
      name: newActName.trim(),
      triggerStage: newActStage,
      field: newActField,
      operator: newActOperator,
      value: newActVal.trim(),
      actionType: newActType,
      templateId: newActType === 'send_email' ? newActTemplate : undefined,
      isActive: true
    };

    setWorkflowActions((prev) => [...prev, act]);
    setIsAddActionOpen(false);
    setNewActName('');
  };

  const handleToggleAction = (id: string) => {
    setWorkflowActions((prev) => 
      prev.map((a) => a.id === id ? { ...a, isActive: !a.isActive } : a)
    );
  };

  const handleRemoveAction = (id: string) => {
    setWorkflowActions((prev) => prev.filter((a) => a.id !== id));
  };

  const insertTag = (tag: string) => {
    setBody((prev) => prev + ` {{${tag}}}`);
  };

  const compileTemplate = (rawSubject: string, rawBody: string) => {
    let finalSubject = rawSubject;
    let finalBody = rawBody;

    Object.entries(MOCK_MERGE_VALUES).forEach(([key, val]) => {
      finalSubject = finalSubject.replace(new RegExp(`{{${key}}}`, 'g'), val);
      finalBody = finalBody.replace(new RegExp(`{{${key}}}`, 'g'), val);
    });

    return { subject: finalSubject, body: finalBody };
  };

  const handleTriggerPreview = (log: NotificationLog) => {
    const compiled = compileTemplate(subject, body);
    setPreviewContent({
      subject: log.subject,
      body: compiled.body
    });
    setShowPreviewModal(true);
  };

  const handleResend = (logId: string) => {
    setQueue((prev) => 
      prev.map((n) => 
        n.id === logId 
          ? { ...n, status: 'sent', sentAt: new Date().toISOString() } 
          : n
      )
    );
  };

  return (
    <div className="space-y-8">
      {/* Toast Alert Success */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Communication & Workflows</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
            Manage stage email templates, set up conditional trigger actions, and view notification queues.
          </p>
        </div>
        
        <div 
          id="save-success-banner"
          className="opacity-0 transition-opacity duration-300 dark:dark-glass bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-2.5 px-4 rounded-xl border border-emerald-500/20 text-xs font-bold flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          Settings successfully saved!
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Email Templates Sidebar */}
        <aside className="space-y-4">
          <div className="flex items-center justify-between pl-2">
            <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Email Templates</h4>
            <button
              onClick={() => setIsAddTemplateOpen(true)}
              className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create
            </button>
          </div>

          <div className="space-y-2">
            {templates.map((tmpl) => {
              const isSelected = tmpl.id === selectedTemplate.id;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => handleTemplateSelect(tmpl)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-white border-primary/20 shadow-md shadow-primary/25'
                      : 'bg-white dark:bg-card-dark text-slate-700 dark:text-slate-300 border-slate-200/50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider block ${isSelected ? 'text-white/80' : 'text-primary'}`}>
                      {tmpl.stage.replace('_', ' ')}
                    </span>
                    <span className="font-bold text-sm leading-tight block mt-0.5">{tmpl.name}</span>
                  </div>
                  <Mail className={`w-4 h-4 opacity-50 group-hover:scale-110 transition-transform ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>
        </aside>

        {/* Editor panel */}
        <main className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
              <div>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Email Editor</h4>
                <p className="text-xs text-slate-400 mt-1">Configure email template markdown details</p>
              </div>
              <button
                onClick={handleSaveTemplate}
                className="py-2 px-4 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl flex items-center gap-1.5 btn-animate shadow-md shadow-primary/25 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </div>

            {/* Merge fields selector */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Merge tags copy helper</span>
              <div className="flex flex-wrap gap-1.5">
                {mergeTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => insertTag(tag)}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-primary hover:text-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 dark:hover:bg-primary font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {"{{" + tag + "}}"}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject / Copy body */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-3 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white font-semibold"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Message Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  className="w-full p-3 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white font-mono"
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Conditional Workflow Actions Section */}
      <section className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
          <h4 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-coral" />
            Conditional Workflow Trigger Actions
          </h4>
          <button
            onClick={() => setIsAddActionOpen(true)}
            className="py-1.5 px-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 btn-animate"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Action Rule
          </button>
        </div>

        <div className="space-y-3">
          {workflowActions.map((act) => (
            <div key={act.id} className="p-4 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/20 dark:border-border-dark flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">{act.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    act.isActive 
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {act.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>
                
                <div className="text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                  Trigger stage: <span className="font-bold text-primary">{STAGE_LABELS[act.triggerStage]}</span>.
                  Evaluation: <span className="font-mono text-[10px] bg-slate-200/50 dark:bg-slate-800 px-1.5 py-0.5 rounded">{act.field} {act.operator} {act.value}</span>.
                  Action: <span className="font-bold text-secondary capitalize">{act.actionType.replace('_', ' ')}</span> 
                  {act.templateId && ` (Template ID: ${act.templateId})`}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleAction(act.id)}
                  className={`py-1.5 px-3 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                    act.isActive 
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {act.isActive ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => handleRemoveAction(act.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-500/5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Outgoing Notification Logs Queue */}
      <section className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm p-6 space-y-4">
        <h4 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
          <Mail className="w-5 h-5 text-primary" />
          Notification Queue Logs
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-white/5 pb-2">
                <th className="py-2 pl-2">Recipient candidate</th>
                <th className="py-2">Subject Header</th>
                <th className="py-2 text-center">Status</th>
                <th className="py-2">Processed Date</th>
                <th className="py-2 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {queue.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 pl-2 font-bold text-slate-900 dark:text-white">{log.email}</td>
                  <td className="py-3 text-slate-500 dark:text-slate-400 font-medium">{log.subject}</td>
                  <td className="py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                      log.status === 'sent' 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 text-slate-400">
                    {log.sentAt ? new Date(log.sentAt).toLocaleString() : 'Pending Queue'}
                  </td>
                  <td className="py-3 pr-2 text-right space-x-2">
                    <button
                      onClick={() => handleTriggerPreview(log)}
                      className="py-1 px-2.5 border border-slate-200 dark:border-border-dark rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-[10px] btn-animate flex inline-flex items-center gap-1 cursor-pointer dark:text-white"
                    >
                      <Eye className="w-3 h-3 text-slate-400" />
                      Preview
                    </button>
                    {log.status === 'queued' && (
                      <button
                        onClick={() => handleResend(log.id)}
                        className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold text-[10px] btn-animate flex inline-flex items-center gap-1 cursor-pointer border border-white/5"
                      >
                        <Play className="w-3 h-3 text-primary animate-pulse" />
                        Trigger Mail
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: Add Email Template */}
      <AnimatePresence>
        {isAddTemplateOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddTemplateOpen(false)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-card-dark rounded-3xl p-6 border border-slate-200 dark:border-border-dark shadow-2xl z-50 overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Email Template</h3>
                  <button onClick={() => setIsAddTemplateOpen(false)} className="p-1 rounded-lg text-slate-500 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form id="add-template-form" onSubmit={handleAddTemplateSubmit} className="space-y-3 text-xs font-semibold">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Template Name</label>
                    <input
                      type="text"
                      required
                      value={newTmplName}
                      onChange={(e) => setNewTmplName(e.target.value)}
                      placeholder="e.g. Arabic Evaluation Welcome"
                      className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Subject Header</label>
                    <input
                      type="text"
                      required
                      value={newTmplSubject}
                      onChange={(e) => setNewTmplSubject(e.target.value)}
                      placeholder="e.g. Assessment details for project {{Language}}"
                      className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Trigger Stage Gate</label>
                    <select
                      value={newTmplStage}
                      onChange={(e) => setNewTmplStage(e.target.value as WorkflowStage)}
                      className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white cursor-pointer"
                    >
                      {Object.entries(STAGE_LABELS).map(([key, val]) => (
                        <option key={key} value={key}>{val}</option>
                      ))}
                    </select>
                  </div>
                </form>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddTemplateOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-border-dark text-slate-500 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 btn-animate"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="add-template-form"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl btn-animate"
                >
                  Create Template
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal: Add Trigger Action Rule */}
      <AnimatePresence>
        {isAddActionOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddActionOpen(false)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-card-dark rounded-3xl p-6 border border-slate-200 dark:border-border-dark shadow-2xl z-50 overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Zap className="w-5 h-5 text-coral" />
                    Configure Action Rule
                  </h3>
                  <button onClick={() => setIsAddActionOpen(false)} className="p-1 rounded-lg text-slate-500 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form id="add-action-form" onSubmit={handleAddActionSubmit} className="space-y-3 text-xs font-semibold">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Rule Name / Description</label>
                    <input
                      type="text"
                      required
                      value={newActName}
                      onChange={(e) => setNewActName(e.target.value)}
                      placeholder="e.g. Notify Grader of Test"
                      className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Trigger Stage Gate</label>
                    <select
                      value={newActStage}
                      onChange={(e) => setNewActStage(e.target.value as WorkflowStage)}
                      className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white cursor-pointer"
                    >
                      {Object.entries(STAGE_LABELS).map(([key, val]) => (
                        <option key={key} value={key}>{val}</option>
                      ))}
                    </select>
                  </div>

                  {/* Conditions check */}
                  <div className="p-3 bg-slate-50 dark:bg-bg-dark border border-slate-200/20 dark:border-white/5 rounded-2xl space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Condition check settings</span>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={newActField}
                        onChange={(e) => setNewActField(e.target.value)}
                        className="p-1.5 text-[10px] bg-white dark:bg-card-dark border rounded text-slate-900 dark:text-white"
                      >
                        <option value="isGmail">isGmail</option>
                        <option value="hasSignedNda">hasSignedNda</option>
                        <option value="classificationTier">classificationTier</option>
                      </select>
                      <select
                        value={newActOperator}
                        onChange={(e) => setNewActOperator(e.target.value as any)}
                        className="p-1.5 text-[10px] bg-white dark:bg-card-dark border rounded text-slate-900 dark:text-white"
                      >
                        <option value="==">==</option>
                        <option value="!=">!=</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={newActVal}
                        onChange={(e) => setNewActVal(e.target.value)}
                        placeholder="value (true/false)"
                        className="p-1.5 text-[10px] bg-white dark:bg-card-dark border rounded text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Action trigger type */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Action Trigger Type</label>
                    <select
                      value={newActType}
                      onChange={(e) => setNewActType(e.target.value as any)}
                      className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white cursor-pointer"
                    >
                      <option value="send_email">Send Email Template</option>
                      <option value="update_status">Auto-update Status</option>
                    </select>
                  </div>

                  {/* Action Target field (e.g. template list) */}
                  {newActType === 'send_email' ? (
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Target Template</label>
                      <select
                        value={newActTemplate}
                        onChange={(e) => setNewActTemplate(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white cursor-pointer"
                      >
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Auto-update Status To</label>
                      <input
                        type="text"
                        required
                        defaultValue="on_hold"
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white"
                      />
                    </div>
                  )}
                </form>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddActionOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-border-dark text-slate-500 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 btn-animate"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="add-action-form"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl btn-animate"
                >
                  Add Action Rule
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPreviewModal(false)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white dark:bg-card-dark rounded-3xl p-6 border border-slate-200 dark:border-border-dark shadow-2xl z-50 overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Email Notification Preview</h3>
                  </div>
                  <button onClick={() => setShowPreviewModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs font-medium">
                  <div className="p-3 bg-slate-50 dark:bg-bg-dark rounded-xl border border-slate-200/20 dark:border-white/5 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Subject:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{previewContent.subject}</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-50 dark:bg-bg-dark rounded-xl border border-slate-200/20 dark:border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Body Message</span>
                    <pre className="font-sans text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {previewContent.body}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/5 text-right">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="py-2 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl btn-animate cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
