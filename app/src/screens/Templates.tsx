import React, { useState, useEffect } from 'react';
import type { EmailTemplate, NotificationLog, WorkflowStage, WorkflowAction } from '../types';
import { 
  Mail, Save, Sparkles, Eye, Play, CheckCircle, X, Plus, Trash2, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Mock templates mapping workflow stages
const INITIAL_TEMPLATES: EmailTemplate[] = [
  {
    id: 't-1',
    name: 'Outreach Welcome',
    subject: 'MLC Localization Partnership Opportunity',
    body: 'Hi {{Vendor_Name}},\n\nWe have reviewed your profile and are interested in exploring a localization partnership with you for {{Language}} projects.\n\nOur initial project hourly offer rate is {{Adjusted_Rate}}/hr.\n\nPlease confirm if you are interested!\n\nBest,\nMLC Recruiting Team',
    stage: 'outreach',
    lastUpdated: '2026-07-25T10:00:00Z'
  },
  {
    id: 't-2',
    name: 'NDA Signature Request',
    subject: 'Action Required: Sign NDA for MLC Projects',
    body: 'Hi {{Vendor_Name}},\n\nBefore we can assign translation testing or share project materials, we require a signed Non-Disclosure Agreement (NDA).\n\nPlease review and sign the agreement here: {{Project_Link}}\n\nYour NDA Status is currently: {{NDA_Status}}\n\nThank you,\nMLC Compliance Office',
    stage: 'nda',
    lastUpdated: '2026-07-28T14:30:00Z'
  },
  {
    id: 't-3',
    name: 'Testing Invitation',
    subject: 'MLC Language Testing Assignment - {{Language}}',
    body: 'Hi {{Vendor_Name}},\n\nThank you for signing the NDA. The next step is to complete our language assessment.\n\nYou have been assigned a test translation project. You can access it using the link below:\nLink: {{Project_Link}}\n\nPlease submit the translation before the scheduled deadline.\n\nRegards,\nMLC Quality Managers',
    stage: 'ready_for_testing',
    lastUpdated: '2026-07-30T09:15:00Z'
  }
];

// Initial set of conditional workflow actions
const INITIAL_ACTIONS: WorkflowAction[] = [
  {
    id: 'act-1',
    name: 'Send NDA on Outreach Stage',
    triggerStage: 'outreach',
    field: 'hasSignedNda',
    operator: '==',
    value: 'false',
    actionType: 'send_email',
    templateId: 't-2',
    recipientType: 'vendor',
    isActive: true
  },
  {
    id: 'act-2',
    name: 'Auto-Invite Gmail Users to Test',
    triggerStage: 'nda',
    field: 'isGmail',
    operator: '==',
    value: 'true',
    actionType: 'send_email',
    templateId: 't-3',
    recipientType: 'both',
    isActive: true
  }
];

const INITIAL_QUEUE: NotificationLog[] = [
  {
    id: 'n-1',
    vendorId: 'v-2',
    email: 'hana@lingoglobe.jp',
    subject: 'MLC Language Testing Assignment - Japanese (Native)',
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
  outreach: 'Outreach',
  nda: 'NDA',
  ready_for_testing: 'Ready for Testing',
  in_testing: 'In Testing',
  xtrf_onboarding: 'XTRF Onboarding',
  ready_for_pm: 'Ready for PM',
  dnu: 'DNU'
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
  const [editingAction, setEditingAction] = useState<WorkflowAction | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'triggers'>('templates');
  
  // Modals state
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [isAddActionOpen, setIsAddActionOpen] = useState(false);

  // Add Template fields
  const [newTmplName, setNewTmplName] = useState('');
  const [newTmplSubject, setNewTmplSubject] = useState('');
  const [newTmplStage, setNewTmplStage] = useState<WorkflowStage>('outreach');

  // Add Action fields
  const [newActName, setNewActName] = useState('');
  const [newActStage, setNewActStage] = useState<WorkflowStage>('outreach');
  const [newActField, setNewActField] = useState('isGmail');
  const [newActOperator, setNewActOperator] = useState<WorkflowAction['operator']>('==');
  const [newActVal, setNewActVal] = useState('true');
  const [newActType, setNewActType] = useState<WorkflowAction['actionType']>('send_email');
  const [newActTemplate, setNewActTemplate] = useState(INITIAL_TEMPLATES[0].id);
  const [newActRecipient, setNewActRecipient] = useState<WorkflowAction['recipientType']>('vendor');

  // Editor states
  const [subject, setSubject] = useState(selectedTemplate.subject);
  const [body, setBody] = useState(selectedTemplate.body);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewContent, setPreviewContent] = useState({ subject: '', body: '' });

  const mergeTags = ['Vendor_Name', 'Language', 'Adjusted_Rate', 'Project_Link', 'NDA_Status'];

  // Load from Firestore with local seed fallbacks
  useEffect(() => {
    const loadFirestoreData = async () => {
      try {
        // 1. Fetch Templates
        const tmplSnap = await getDocs(collection(db, 'templates'));
        const tmplList: EmailTemplate[] = [];
        tmplSnap.forEach((doc) => {
          tmplList.push(doc.data() as EmailTemplate);
        });
        
        if (tmplList.length > 0) {
          setTemplates(tmplList);
          setSelectedTemplate(tmplList[0]);
          setSubject(tmplList[0].subject);
          setBody(tmplList[0].body);
        } else {
          for (const tmpl of INITIAL_TEMPLATES) {
            await setDoc(doc(db, 'templates', tmpl.id), tmpl);
          }
          setTemplates(INITIAL_TEMPLATES);
          setSelectedTemplate(INITIAL_TEMPLATES[0]);
          setSubject(INITIAL_TEMPLATES[0].subject);
          setBody(INITIAL_TEMPLATES[0].body);
        }

        // 2. Fetch Actions
        const actSnap = await getDocs(collection(db, 'workflow_actions'));
        const actList: WorkflowAction[] = [];
        actSnap.forEach((doc) => {
          actList.push(doc.data() as WorkflowAction);
        });

        if (actList.length > 0) {
          setWorkflowActions(actList);
        } else {
          for (const act of INITIAL_ACTIONS) {
            await setDoc(doc(db, 'workflow_actions', act.id), act);
          }
          setWorkflowActions(INITIAL_ACTIONS);
        }

        // 3. Fetch Notification Logs
        const noteSnap = await getDocs(collection(db, 'notifications'));
        const noteList: NotificationLog[] = [];
        noteSnap.forEach((doc) => {
          noteList.push(doc.data() as NotificationLog);
        });

        if (noteList.length > 0) {
          noteList.sort((a, b) => new Date(b.sentAt || '').getTime() - new Date(a.sentAt || '').getTime());
          setQueue(noteList);
        } else {
          setQueue(INITIAL_QUEUE);
        }
      } catch (err) {
        console.error("Failed to load Templates database collections", err);
      }
    };
    loadFirestoreData();
  }, []);

  const handleTemplateSelect = (tmpl: EmailTemplate) => {
    setSelectedTemplate(tmpl);
    setSubject(tmpl.subject);
    setBody(tmpl.body);
  };

  const handleSaveTemplate = async () => {
    const updated = { 
      ...selectedTemplate, 
      subject, 
      body, 
      lastUpdated: new Date().toISOString() 
    };

    try {
      await setDoc(doc(db, 'templates', selectedTemplate.id), updated);
      setTemplates((prev) => 
        prev.map((t) => t.id === selectedTemplate.id ? updated : t)
      );
      setSelectedTemplate(updated);
      triggerAlertToast();
    } catch (err) {
      console.error("Failed to save template to Firestore", err);
      alert("Failed to save template: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const triggerAlertToast = () => {
    const saveBanner = document.getElementById('save-success-banner');
    if (saveBanner) {
      saveBanner.classList.remove('opacity-0');
      setTimeout(() => saveBanner.classList.add('opacity-0'), 2500);
    }
  };

  const handleAddTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTmplName.trim()) return;

    const tmpl: EmailTemplate = {
      id: `t-${Date.now()}`,
      name: newTmplName.trim(),
      subject: newTmplSubject.trim() || 'Localization Partnership Notice',
      body: 'Hi {{Vendor_Name}},\n\nEnter email copy here...',
      stage: newTmplStage,
      lastUpdated: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'templates', tmpl.id), tmpl);
      setTemplates((prev) => [...prev, tmpl]);
      setIsAddTemplateOpen(false);
      setNewTmplName('');
      setNewTmplSubject('');
      handleTemplateSelect(tmpl);
    } catch (err) {
      console.error("Failed to create template document", err);
      alert("Failed to create template: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleOpenAddAction = () => {
    setEditingAction(null);
    setNewActName('');
    setNewActStage('outreach');
    setNewActField('isGmail');
    setNewActOperator('==');
    setNewActVal('true');
    setNewActType('send_email');
    setNewActTemplate(templates[0]?.id || '');
    setNewActRecipient('vendor');
    setIsAddActionOpen(true);
  };

  const handleOpenEditAction = (act: WorkflowAction) => {
    setEditingAction(act);
    setNewActName(act.name);
    setNewActStage(act.triggerStage);
    setNewActField(act.field);
    setNewActOperator(act.operator);
    setNewActVal(act.value);
    setNewActType(act.actionType);
    setNewActTemplate(act.templateId || (templates[0]?.id || ''));
    setNewActRecipient(act.recipientType);
    setIsAddActionOpen(true);
  };

  const handleAddActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActName.trim()) return;

    const actionId = editingAction ? editingAction.id : `act-${Date.now()}`;
    const act: WorkflowAction = {
      id: actionId,
      name: newActName.trim(),
      triggerStage: newActStage,
      field: newActField,
      operator: newActOperator,
      value: newActVal.trim(),
      actionType: newActType,
      templateId: newActType === 'send_email' ? newActTemplate : undefined,
      recipientType: newActRecipient,
      isActive: editingAction ? editingAction.isActive : true
    };

    try {
      await setDoc(doc(db, 'workflow_actions', actionId), act);
      
      setWorkflowActions((prev) => {
        if (editingAction) {
          return prev.map((a) => a.id === actionId ? act : a);
        } else {
          return [...prev, act];
        }
      });
      setIsAddActionOpen(false);
      setEditingAction(null);
      setNewActName('');
    } catch (err) {
      console.error("Failed to save workflow action rule", err);
      alert("Failed to save action rule: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleToggleAction = async (id: string) => {
    const target = workflowActions.find((a) => a.id === id);
    if (!target) return;
    const updated = { ...target, isActive: !target.isActive };

    try {
      await setDoc(doc(db, 'workflow_actions', id), updated);
      setWorkflowActions((prev) => 
        prev.map((a) => a.id === id ? updated : a)
      );
    } catch (err) {
      console.error("Failed to toggle action status", err);
      alert("Failed to toggle action status: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRemoveAction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'workflow_actions', id));
      setWorkflowActions((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete action document", err);
      alert("Failed to delete action rule: " + (err instanceof Error ? err.message : String(err)));
    }
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

      {/* Tabs Selector Navigation */}
      <div className="flex border-b border-slate-200 dark:border-border-dark mb-6">
        <button
          onClick={() => setActiveTab('templates')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'templates'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          Email Templates
        </button>
        <button
          onClick={() => setActiveTab('triggers')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'triggers'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          Workflow Trigger Rules
        </button>
      </div>

      {activeTab === 'templates' ? (
        <>
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
                  Add New
                </button>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {templates.map((tmpl) => {
                  const isSelected = selectedTemplate.id === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => handleTemplateSelect(tmpl)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected 
                          ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-800 dark:border-slate-700 shadow-sm'
                          : 'bg-white dark:bg-card-dark border-slate-200/50 dark:border-border-dark text-slate-700 dark:text-slate-350 hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="block font-bold text-xs">{tmpl.name}</span>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {STAGE_LABELS[tmpl.stage]}
                        </span>
                      </div>
                      <Mail className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Email Templates Editor Workspace */}
            <main className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Email Editor</h3>
                    <p className="text-xs text-slate-500 mt-1">Configuring subject headers and template HTML contents.</p>
                  </div>
                  
                  <button
                    onClick={handleSaveTemplate}
                    className="py-2.5 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-xs flex items-center gap-1.5 btn-animate cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Save Template Copy
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Merge Tags */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Dynamic Merge Values</span>
                    <div className="flex flex-wrap gap-1.5">
                      {mergeTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => insertTag(tag)}
                          className="py-1.5 px-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-bg-dark border border-slate-200/50 dark:border-white/5 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-350 cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-3 font-bold text-xs text-slate-650 dark:text-slate-300">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Subject Header</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Email Body</label>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={6}
                        className="w-full p-3 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>

          {/* Outgoing Notification Logs Queue */}
          <section className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Notification Queue Logs
              </h4>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                outbox outbox logs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 pl-2">Recipient Address</th>
                    <th className="py-3">Email Subject Line</th>
                    <th className="py-3">Status Status</th>
                    <th className="py-3">Dispatch Timestamp</th>
                    <th className="py-3 pr-2 text-right">Actions Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-white/5 font-semibold text-slate-650 dark:text-slate-350">
                  {queue.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 pl-2 font-bold text-slate-900 dark:text-white">{log.email}</td>
                      <td className="py-3 text-slate-600 dark:text-slate-400">{log.subject}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          log.status === 'sent' 
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : log.status === 'queued'
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-600 border border-red-500/20'
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
        </>
      ) : (
        /* Conditional Workflow Actions Section triggers tab */
        <section className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
            <h4 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-coral" />
              Conditional Workflow Trigger Actions
            </h4>
            <button 
              onClick={handleOpenAddAction}
              className="py-2 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl font-bold text-[11px] flex items-center gap-1.5 btn-animate cursor-pointer"
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
                    {act.field === 'always' || act.operator === 'always' ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-1">Always Trigger (On Stage Change)</span>
                    ) : (
                      <span>
                        Evaluation: <span className="font-mono text-[10px] bg-slate-200/50 dark:bg-slate-800 px-1.5 py-0.5 rounded">{act.field} {act.operator} {act.value}</span>.
                      </span>
                    )}
                    Action: <span className="font-bold text-secondary capitalize">{act.actionType.replace('_', ' ')}</span> 
                    {act.templateId && ` (Template ID: ${act.templateId}, Recipient: ${act.recipientType})`}
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
                    onClick={() => handleOpenEditAction(act)}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-[10px] font-bold dark:text-white transition-colors cursor-pointer"
                  >
                    Edit
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
      )}

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
                    {editingAction ? 'Edit Workflow Action Rule' : 'Configure Action Rule'}
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
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Condition check settings</span>
                    <div className="space-y-2">
                      <select
                        value={newActField}
                        onChange={(e) => {
                          setNewActField(e.target.value);
                          if (e.target.value === 'always') {
                            setNewActOperator('always');
                            setNewActVal('always');
                          } else if (newActOperator === 'always') {
                            setNewActOperator('==');
                            setNewActVal('true');
                          }
                        }}
                        className="w-full p-2 text-[10px] bg-white dark:bg-card-dark border rounded text-slate-900 dark:text-white cursor-pointer"
                      >
                        <option value="always">Always Trigger (Stage Change Only)</option>
                        <option value="isGmail">isGmail</option>
                        <option value="hasSignedNda">hasSignedNda</option>
                        <option value="classificationTier">classificationTier</option>
                      </select>
                      
                      {newActField !== 'always' && (
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={newActOperator}
                            onChange={(e) => setNewActOperator(e.target.value as any)}
                            className="p-1.5 text-[10px] bg-white dark:bg-card-dark border rounded text-slate-900 dark:text-white cursor-pointer"
                          >
                            <option value="==">==</option>
                            <option value="!=">!=</option>
                            <option value="empty">is empty</option>
                            <option value="not_empty">is not empty</option>
                          </select>
                          {newActOperator !== 'empty' && newActOperator !== 'not_empty' && (
                            <input
                              type="text"
                              required
                              value={newActVal}
                              onChange={(e) => setNewActVal(e.target.value)}
                              placeholder="value (true/false)"
                              className="p-1.5 text-[10px] bg-white dark:bg-card-dark border rounded text-slate-900 dark:text-white"
                            />
                          )}
                        </div>
                      )}
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
                    <div className="space-y-3">
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

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Recipient Email Target</label>
                        <select
                          value={newActRecipient}
                          onChange={(e) => setNewActRecipient(e.target.value as any)}
                          className="w-full p-2.5 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none dark:text-white cursor-pointer"
                        >
                          <option value="vendor">Vendor (Primary / Secondary)</option>
                          <option value="mlc">MLC Office (vm@mlconnections.com)</option>
                          <option value="both">Both Recipients</option>
                        </select>
                      </div>
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
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl btn-animate cursor-pointer"
                >
                  {editingAction ? 'Save Changes' : 'Create Action'}
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
