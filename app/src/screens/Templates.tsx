import React, { useState, useEffect } from 'react';
import type { EmailTemplate, WorkflowStage, WorkflowAction, WorkflowStageConfig, StatusConfig, StageProgressConfig } from '../types';
import { DEFAULT_STAGE_PROGRESS_OPTIONS, getStageProgressStyle } from '../types';
import { 
  Save, Eye, CheckCircle, X, Plus, Trash2,
  Layers, Tag, ArrowUp, ArrowDown, Edit2, ChevronDown, ChevronUp, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

// Default templates mapping workflow stages
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
    subject: 'Action Required: Sign NDA for Multilingual Connections',
    body: 'Hi {{Vendor_Name}},\n\nWelcome to Multilingual Connections! Before we can proceed with project assignments or translation testing, we require a signed Non-Disclosure Agreement (NDA).\n\nPlease click the link below to review and sign your NDA online:\n{{Project_Link}}\n\nYour NDA Status is currently: {{NDA_Status}}\n\nThank you,\nMLC Recruitment & Compliance Team',
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

const INITIAL_ACTIONS: WorkflowAction[] = [
  {
    id: 'act-nda-entry',
    name: 'Send NDA Portal Link on NDA Stage Entry',
    triggerStage: 'nda',
    triggerStatus: 'started',
    field: 'hasSignedNda',
    operator: '==',
    value: 'false',
    templateId: 't-2',
    updateStatus: 'none',
    recipientType: 'vendor',
    isActive: true
  },
  {
    id: 'act-nda-complete',
    name: 'Auto-Advance Candidate & Send Test Email on NDA Completion',
    triggerStage: 'nda',
    triggerStatus: 'completed',
    operator: 'always',
    autoAdvanceStage: 'ready_for_testing',
    templateId: 't-3',
    recipientType: 'vendor',
    isActive: true
  }
];

const DEFAULT_STAGES: WorkflowStageConfig[] = [
  { id: 'outreach', name: 'Outreach', description: 'Initial contact and profile submission', order: 1 },
  { id: 'nda', name: 'NDA Sign', description: 'Non-Disclosure Agreement collection', order: 2 },
  { id: 'ready_for_testing', name: 'Ready for Testing', description: 'Assessment assignment pending', order: 3 },
  { id: 'in_testing', name: 'In Testing', description: 'Language evaluation in progress', order: 4 },
  { id: 'xtrf_onboarding', name: 'XTRF Onboarding', description: 'System setup and database integration', order: 5 },
  { id: 'ready_for_pm', name: 'Ready for PM', description: 'Fully vetted and active linguist pool', order: 6 },
  { id: 'dnu', name: 'DNU', description: 'Do Not Use / Archived profile', order: 7 }
];

const DEFAULT_STATUSES: StatusConfig[] = [
  { key: 'pending', color: 'yellow' },
  { key: 'approved', color: 'green' },
  { key: 'rejected', color: 'red' },
  { key: 'on_hold', color: 'blue' },
  { key: 'blacklisted', color: 'purple' },
  { key: 'active', color: 'indigo' }
];

const COLOR_OPTIONS = ['yellow', 'green', 'red', 'blue', 'purple', 'indigo', 'pink', 'gray'];

const MOCK_MERGE_VALUES = {
  Vendor_Name: 'Hana Tanaka',
  Language: 'Japanese (Native), English (Professional)',
  Adjusted_Rate: '$50',
  Project_Link: 'https://mlconnections.com/portal/onboarding/v-2',
  NDA_Status: 'NDA Missing'
};

export const Templates: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'templates' | 'triggers' | 'stages' | 'statuses'>('templates');

  const [templates, setTemplates] = useState<EmailTemplate[]>(INITIAL_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(INITIAL_TEMPLATES[0]);

  // Workflow Actions states
  const [workflowActions, setWorkflowActions] = useState<WorkflowAction[]>(INITIAL_ACTIONS);
  const [editingAction, setEditingAction] = useState<WorkflowAction | null>(null);

  // Workflow Stages states
  const [stages, setStages] = useState<WorkflowStageConfig[]>(DEFAULT_STAGES);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<WorkflowStageConfig | null>(null);
  const [stageName, setStageName] = useState('');
  const [stageDesc, setStageDesc] = useState('');
  const [stageOrder, setStageOrder] = useState<number>(1);

  // Candidate Statuses states
  const [statuses, setStatuses] = useState<StatusConfig[]>(DEFAULT_STATUSES);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusConfig | null>(null);
  const [statusKey, setStatusKey] = useState('');
  const [statusColor, setStatusColor] = useState('blue');

  // Stage Progress Statuses states
  const [stageProgressOptions, setStageProgressOptions] = useState<StageProgressConfig[]>(DEFAULT_STAGE_PROGRESS_OPTIONS);
  const [isStageProgressModalOpen, setIsStageProgressModalOpen] = useState(false);
  const [editingStageProgress, setEditingStageProgress] = useState<StageProgressConfig | null>(null);
  const [stageProgressKey, setStageProgressKey] = useState('');
  const [stageProgressLabel, setStageProgressLabel] = useState('');
  const [stageProgressColor, setStageProgressColor] = useState('yellow');

  // Collapsible Card States
  const [collapsedCards, setCollapsedCards] = useState<{ stages: boolean; statuses: boolean; stageProgress: boolean }>({
    stages: false,
    statuses: false,
    stageProgress: false
  });

  const toggleCard = (key: 'stages' | 'statuses' | 'stageProgress') => {
    setCollapsedCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  
  // Modals state
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [isAddActionOpen, setIsAddActionOpen] = useState(false);

  // Add Template fields
  const [newTmplName, setNewTmplName] = useState('');
  const [newTmplSubject, setNewTmplSubject] = useState('');

  // Add Action fields (Redesigned for dual action fields: Email & Status & Stage & Stage Status)
  const [newActName, setNewActName] = useState('');
  const [newActStage, setNewActStage] = useState<string>('outreach');
  const [newActTriggerStatus, setNewActTriggerStatus] = useState<string>('started');
  const [newActUpdateStatus, setNewActUpdateStatus] = useState<string>('none');
  const [newActUpdateStage, setNewActUpdateStage] = useState<string>('none');
  const [newActUpdateStageStatus, setNewActUpdateStageStatus] = useState<string>('none');
  const [newActField, setNewActField] = useState('isGmail');
  const [newActOperator, setNewActOperator] = useState<WorkflowAction['operator']>('==');
  const [newActVal, setNewActVal] = useState('true');
  const [newActTemplate, setNewActTemplate] = useState<string>('none');
  const [newActRecipient, setNewActRecipient] = useState<WorkflowAction['recipientType']>('vendor');

  // Editor states
  const [name, setName] = useState(selectedTemplate.name);
  const [subject, setSubject] = useState(selectedTemplate.subject);
  const [body, setBody] = useState(selectedTemplate.body);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewContent, setPreviewContent] = useState({ subject: '', body: '' });

  const mergeTags = ['Vendor_Name', 'Language', 'Adjusted_Rate', 'Project_Link', 'NDA_Status'];

  // Load from Firestore with local seed fallbacks
  useEffect(() => {
    if (authLoading) return;

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
          setName(tmplList[0].name);
          setSubject(tmplList[0].subject);
          setBody(tmplList[0].body);
        } else {
          for (const tmpl of INITIAL_TEMPLATES) {
            await setDoc(doc(db, 'templates', tmpl.id), tmpl);
          }
          setTemplates(INITIAL_TEMPLATES);
          setSelectedTemplate(INITIAL_TEMPLATES[0]);
          setName(INITIAL_TEMPLATES[0].name);
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

        // 3. Fetch Global Config (Stages & Statuses)
        const configSnap = await getDoc(doc(db, 'settings', 'global_config'));
        if (configSnap.exists()) {
          const configData = configSnap.data();
          if (configData.stages && configData.stages.length > 0) {
            setStages(configData.stages.sort((a: WorkflowStageConfig, b: WorkflowStageConfig) => a.order - b.order));
          } else {
            setStages(DEFAULT_STAGES);
          }
          if (configData.statuses && configData.statuses.length > 0) {
            setStatuses(configData.statuses);
          } else {
            setStatuses(DEFAULT_STATUSES);
          }
          if (configData.stageProgressOptions && configData.stageProgressOptions.length > 0) {
            setStageProgressOptions(configData.stageProgressOptions);
          } else {
            setStageProgressOptions(DEFAULT_STAGE_PROGRESS_OPTIONS);
          }
        } else {
          setStages(DEFAULT_STAGES);
          setStatuses(DEFAULT_STATUSES);
          setStageProgressOptions(DEFAULT_STAGE_PROGRESS_OPTIONS);
        }
      } catch (err) {
        console.error("Failed to load Templates database collections", err);
      }
    };
    loadFirestoreData();
  }, [authLoading, user]);

  const saveConfigDirect = async (
    updatedStages: WorkflowStageConfig[], 
    updatedStatuses: StatusConfig[],
    updatedStageProgress: StageProgressConfig[] = stageProgressOptions
  ) => {
    try {
      const docRef = doc(db, 'settings', 'global_config');
      const snap = await getDoc(docRef);
      const existingData = snap.exists() ? snap.data() : {};

      const newConfig = {
        ...existingData,
        stages: updatedStages,
        statuses: updatedStatuses,
        stageProgressOptions: updatedStageProgress,
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, newConfig);
      
      const banner = document.getElementById('save-success-banner');
      if (banner) {
        banner.classList.remove('opacity-0');
        banner.classList.add('opacity-100');
        setTimeout(() => {
          banner.classList.remove('opacity-100');
          banner.classList.add('opacity-0');
        }, 2500);
      }
    } catch (err) {
      console.error("Failed to auto-save workflow stages or candidate statuses config to Firestore", err);
      alert("Failed to save configuration: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleOpenAddStageProgress = () => {
    setEditingStageProgress(null);
    setStageProgressKey('');
    setStageProgressLabel('');
    setStageProgressColor('yellow');
    setIsStageProgressModalOpen(true);
  };

  const handleOpenEditStageProgress = (item: StageProgressConfig) => {
    setEditingStageProgress(item);
    setStageProgressKey(item.key);
    setStageProgressLabel(item.label);
    setStageProgressColor(item.color || 'yellow');
    setIsStageProgressModalOpen(true);
  };

  const handleDeleteStageProgress = (keyToDelete: string) => {
    if (confirm(`Are you sure you want to delete Stage Progress option "${keyToDelete}"?`)) {
      const updated = stageProgressOptions.filter((s) => s.key !== keyToDelete);
      setStageProgressOptions(updated);
      saveConfigDirect(stages, statuses, updated);
    }
  };

  const handleSaveStageProgressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedKey = stageProgressKey.trim().toLowerCase().replace(/\s+/g, '_');
    const formattedLabel = stageProgressLabel.trim() || formattedKey;

    if (!formattedKey) return;

    let updated: StageProgressConfig[] = [];
    if (editingStageProgress) {
      updated = stageProgressOptions.map((s) => 
        s.key === editingStageProgress.key 
          ? { key: formattedKey, label: formattedLabel, color: stageProgressColor }
          : s
      );
    } else {
      if (stageProgressOptions.some((s) => s.key === formattedKey)) {
        alert("A stage progress option with this key already exists!");
        return;
      }
      updated = [...stageProgressOptions, { key: formattedKey, label: formattedLabel, color: stageProgressColor }];
    }

    setStageProgressOptions(updated);
    setIsStageProgressModalOpen(false);
    saveConfigDirect(stages, statuses, updated);
  };

  const handleTemplateSelect = (tmpl: EmailTemplate) => {
    setSelectedTemplate(tmpl);
    setName(tmpl.name);
    setSubject(tmpl.subject);
    setBody(tmpl.body);
  };

  const handleSaveTemplate = async () => {
    const updated = { 
      ...selectedTemplate, 
      name,
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

      const banner = document.getElementById('save-success-banner');
      if (banner) {
        banner.classList.remove('opacity-0');
        banner.classList.add('opacity-100');
        setTimeout(() => {
          banner.classList.remove('opacity-100');
          banner.classList.add('opacity-0');
        }, 2500);
      }
    } catch (err) {
      console.error("Failed to save template to Firestore", err);
      alert("Failed to save template: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (templates.length <= 1) {
      alert("You must keep at least one template in the system.");
      return;
    }

    if (!confirm(`Are you sure you want to delete template "${selectedTemplate.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'templates', templateId));

      const remaining = templates.filter((t) => t.id !== templateId);
      setTemplates(remaining);
      handleTemplateSelect(remaining[0]);

      alert("Template deleted successfully.");
    } catch (err) {
      console.error("Failed to delete template from Firestore", err);
      alert("Failed to delete template: " + (err instanceof Error ? err.message : String(err)));
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
      stage: (stages[0]?.id as WorkflowStage) || 'outreach',
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

  // Workflow Triggers Handlers
  const handleOpenAddAction = () => {
    setEditingAction(null);
    setNewActName('');
    setNewActStage(stages[0]?.id || 'outreach');
    setNewActTriggerStatus('started');
    setNewActUpdateStatus('none');
    setNewActUpdateStage('none');
    setNewActUpdateStageStatus('none');
    setNewActField('isGmail');
    setNewActOperator('==');
    setNewActVal('true');
    setNewActTemplate('none');
    setNewActRecipient('vendor');
    setIsAddActionOpen(true);
  };

  const handleOpenEditAction = (act: WorkflowAction) => {
    setEditingAction(act);
    setNewActName(act.name);
    setNewActStage(act.triggerStage);
    setNewActTriggerStatus(act.triggerStatus || 'started');
    setNewActUpdateStatus(act.updateStatus || act.updateValue || 'none');
    setNewActUpdateStage(act.updateStage || act.autoAdvanceStage || 'none');
    setNewActUpdateStageStatus(act.updateStageStatus || 'none');
    setNewActField(act.field || 'hasSignedNda');
    setNewActOperator(act.operator);
    setNewActVal(act.value || '');
    setNewActTemplate(act.templateId || 'none');
    setNewActRecipient(act.recipientType);
    setIsAddActionOpen(true);
  };

const sanitizePayload = <T extends Record<string, any>>(obj: T): Record<string, any> => {
  const clean: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      clean[key] = obj[key];
    }
  });
  return clean;
};

  const handleAddActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActName.trim()) return;

    const actionId = editingAction ? editingAction.id : `act-${Date.now()}`;
    const act: WorkflowAction = {
      id: actionId,
      name: newActName.trim(),
      triggerStage: newActStage as WorkflowStage,
      triggerStatus: newActTriggerStatus,
      field: newActField,
      operator: newActOperator,
      value: newActVal,
      templateId: newActTemplate !== 'none' ? newActTemplate : 'none',
      updateStatus: newActUpdateStatus !== 'none' ? newActUpdateStatus : 'none',
      updateValue: newActUpdateStatus !== 'none' ? newActUpdateStatus : 'none',
      updateStage: newActUpdateStage !== 'none' ? (newActUpdateStage as WorkflowStage) : 'none',
      updateStageStatus: newActUpdateStageStatus !== 'none' ? (newActUpdateStageStatus as any) : 'none',
      autoAdvanceStage: newActUpdateStage !== 'none' ? (newActUpdateStage as WorkflowStage) : 'none',
      recipientType: newActRecipient,
      isActive: editingAction ? editingAction.isActive : true
    };

    try {
      await setDoc(doc(db, 'workflow_actions', act.id), sanitizePayload(act));

      if (editingAction) {
        setWorkflowActions((prev) => prev.map((a) => a.id === act.id ? act : a));
      } else {
        setWorkflowActions((prev) => [...prev, act]);
      }

      setIsAddActionOpen(false);
    } catch (err) {
      console.error("Failed to save action document", err);
      alert("Failed to save action rule: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleToggleActionStatus = async (id: string) => {
    const target = workflowActions.find((a) => a.id === id);
    if (!target) return;

    const updated = { ...target, isActive: !target.isActive };

    try {
      await setDoc(doc(db, 'workflow_actions', id), sanitizePayload(updated));
      setWorkflowActions((prev) => prev.map((a) => a.id === id ? updated : a));
    } catch (err) {
      console.error("Failed to update action status", err);
    }
  };

  const handleDeleteAction = async (id: string) => {
    if (!confirm("Are you sure you want to delete this action rule?")) return;

    try {
      await deleteDoc(doc(db, 'workflow_actions', id));
      setWorkflowActions((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete action document", err);
      alert("Failed to delete action rule: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Workflow Stages Handlers
  const handleOpenAddStage = () => {
    setEditingStage(null);
    setStageName('');
    setStageDesc('');
    setStageOrder(stages.length + 1);
    setIsStageModalOpen(true);
  };

  const handleOpenEditStage = (stg: WorkflowStageConfig) => {
    setEditingStage(stg);
    setStageName(stg.name);
    setStageDesc(stg.description);
    setStageOrder(stg.order);
    setIsStageModalOpen(true);
  };

  const handleSaveStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim()) return;

    let updatedStages: WorkflowStageConfig[];
    if (editingStage) {
      updatedStages = stages.map((s) => 
        s.id === editingStage.id 
          ? { ...s, name: stageName.trim(), description: stageDesc.trim(), order: stageOrder } 
          : s
      );
    } else {
      const generatedId = stageName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const newStage: WorkflowStageConfig = {
        id: generatedId,
        name: stageName.trim(),
        description: stageDesc.trim(),
        order: stageOrder || stages.length + 1
      };
      updatedStages = [...stages, newStage];
    }

    updatedStages.sort((a, b) => a.order - b.order);
    setStages(updatedStages);
    setIsStageModalOpen(false);
    await saveConfigDirect(updatedStages, statuses);
  };

  const handleDeleteStage = async (stageId: string) => {
    if (stageId === 'in_testing') {
      alert("The 'In Testing' stage is a required system stage and cannot be deleted.");
      return;
    }
    if (!confirm("Are you sure you want to delete this Workflow Stage? Candidates in this stage will need to be re-assigned.")) return;
    const updated = stages.filter((s) => s.id !== stageId);
    setStages(updated);
    await saveConfigDirect(updated, statuses);
  };

  const handleMoveStageOrder = async (index: number, direction: 'up' | 'down') => {
    const newStages = [...stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newStages.length) return;

    // Swap order property
    const tempOrder = newStages[index].order;
    newStages[index].order = newStages[targetIndex].order;
    newStages[targetIndex].order = tempOrder;

    // Swap array positions
    const temp = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = temp;

    newStages.sort((a, b) => a.order - b.order);
    setStages(newStages);
    await saveConfigDirect(newStages, statuses);
  };

  // Candidate Statuses Handlers
  const handleOpenAddStatus = () => {
    setEditingStatus(null);
    setStatusKey('');
    setStatusColor('blue');
    setIsStatusModalOpen(true);
  };

  const handleOpenEditStatus = (st: StatusConfig) => {
    setEditingStatus(st);
    setStatusKey(st.key);
    setStatusColor(st.color);
    setIsStatusModalOpen(true);
  };

  const handleSaveStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = statusKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanKey) return;

    let updatedStatuses: StatusConfig[];
    if (editingStatus) {
      updatedStatuses = statuses.map((st) => st.key === editingStatus.key ? { key: cleanKey, color: statusColor } : st);
    } else {
      if (statuses.some((st) => st.key === cleanKey)) {
        alert("A Candidate Status with this key already exists!");
        return;
      }
      updatedStatuses = [...statuses, { key: cleanKey, color: statusColor }];
    }

    setStatuses(updatedStatuses);
    setIsStatusModalOpen(false);
    await saveConfigDirect(stages, updatedStatuses);
  };

  const handleDeleteStatus = async (keyToDelete: string) => {
    if (!confirm(`Are you sure you want to delete status "${keyToDelete}"?`)) return;
    const updated = statuses.filter((st) => st.key !== keyToDelete);
    setStatuses(updated);
    await saveConfigDirect(stages, updated);
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

  return (
    <div className="space-y-8">
      {/* Toast Alert Success */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Communication & Workflows</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
            Manage stage email templates, set up conditional trigger actions, workflow stages, and candidate statuses.
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
      <div className="flex border-b border-slate-200 dark:border-border-dark mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('templates')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'templates'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          Email Templates
        </button>
        <button
          onClick={() => setActiveTab('triggers')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'triggers'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          Workflow Trigger Rules
        </button>
        <button
          onClick={() => setActiveTab('stages')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'stages'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <Layers className="w-4 h-4" />
          Workflow Stages
        </button>
        <button
          onClick={() => setActiveTab('statuses')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'statuses'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <Tag className="w-4 h-4" />
          Candidate Statuses
        </button>
      </div>

      {activeTab === 'templates' && (
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
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border-primary/40 text-slate-900 dark:text-white shadow-sm'
                        : 'bg-white dark:bg-card-dark border-slate-200/50 dark:border-border-dark text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{tmpl.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{tmpl.subject}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Template Editor */}
          <main className="lg:col-span-2 space-y-6 bg-white dark:bg-card-dark p-6 rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Editing: {selectedTemplate.name}</h3>
                <p className="text-xs text-slate-500">Configure email subject line, body copy, and merge tags.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const compiled = compileTemplate(subject, body);
                    setPreviewContent(compiled);
                    setShowPreviewModal(true);
                  }}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-border-dark rounded-xl text-xs font-bold flex items-center gap-1.5 btn-animate cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-primary" />
                  Preview Copy
                </button>
                <button
                  onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                  className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 btn-animate cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 btn-animate cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Template Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs font-semibold focus:outline-none focus:border-primary dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Subject Line</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs font-semibold focus:outline-none focus:border-primary dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email Body Copy</label>
                  <span className="text-[10px] text-slate-400">Click merge tags below to insert dynamic fields</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {mergeTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => insertTag(tag)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                    >
                      + {"{{" + tag + "}}"}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={10}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-2xl text-xs font-mono leading-relaxed focus:outline-none focus:border-primary dark:text-white"
                ></textarea>
              </div>
            </div>
          </main>
        </div>
      )}

      {activeTab === 'triggers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white dark:bg-card-dark p-4 rounded-2xl border border-slate-200/50 dark:border-border-dark shadow-sm">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Workflow Trigger Rules</h3>
              <p className="text-xs text-slate-500">Automate email notifications and status updates based on stage entry and candidate field criteria.</p>
            </div>

            <button
              onClick={handleOpenAddAction}
              className="py-2.5 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 btn-animate cursor-pointer shadow-md shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              Create Action Rule
            </button>
          </div>

          <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-bg-dark text-slate-500 font-bold border-b border-slate-200/50 dark:border-border-dark">
                  <th className="p-4 pl-6">Rule Name</th>
                  <th className="p-4">Trigger Workflow Stage</th>
                  <th className="p-4">Condition</th>
                  <th className="p-4">Configured Actions</th>
                  <th className="p-4">Recipient</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-white/5 font-semibold">
                {workflowActions.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 pl-6 font-bold text-slate-900 dark:text-white">{act.name}</td>
                    <td className="p-4 text-primary">
                      {stages.find(s => s.id === act.triggerStage)?.name || act.triggerStage}
                    </td>
                    <td className="p-4 font-mono text-[11px] text-slate-500">
                      {act.operator === 'always' ? (
                        <span className="italic text-slate-500 font-sans font-semibold">On Stage Entry</span>
                      ) : act.operator === 'stage_exit' ? (
                        <span className="italic text-amber-600 dark:text-amber-400 font-sans font-semibold">On Stage Exit</span>
                      ) : !act.field ? (
                        <span className="italic text-slate-500 font-sans font-semibold">On Stage Entry</span>
                      ) : (
                        `${act.field} ${act.operator} "${act.value || ''}"`
                      )}
                    </td>
                    <td className="p-4 space-y-1">
                      {act.templateId && act.templateId !== 'none' ? (
                        <div className="text-slate-800 dark:text-slate-200">
                          <span className="font-semibold text-slate-400">Email:</span> {templates.find(t => t.id === act.templateId)?.name || act.templateId}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic">No Email Sent</div>
                      )}
                      
                      {(act.updateStatus && act.updateStatus !== 'none') || (act.updateValue && act.updateValue !== 'none') ? (
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                          <span className="font-semibold text-slate-400">Status:</span> Update to "{act.updateStatus || act.updateValue}"
                        </div>
                      ) : (
                        <div className="text-slate-400 italic">No Status Update</div>
                      )}
                    </td>
                    <td className="p-4 capitalize text-slate-500">{act.recipientType}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActionStatus(act.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                          act.isActive 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                        }`}
                      >
                        {act.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditAction(act)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAction(act.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'stages' && (
        <div className="space-y-6">
          <div 
            onClick={() => toggleCard('stages')}
            className="flex items-center justify-between bg-white dark:bg-card-dark p-5 rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm cursor-pointer select-none"
          >
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Workflow Stage Progress Options ({stages.length})
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure recruitment pipeline stages, descriptions, and display orders. Re-ordering updates the Funnel Dashboard automatically.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleOpenAddStage(); }}
                className="py-2 px-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 btn-animate cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Workflow Stage
              </button>
              <button type="button" className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                {collapsedCards.stages ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {!collapsedCards.stages && (
            <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-bg-dark text-slate-500 font-bold border-b border-slate-200/50 dark:border-border-dark">
                    <th className="p-4 pl-6 w-16 text-center">Order</th>
                    <th className="p-4">Stage Name</th>
                    <th className="p-4">Internal ID</th>
                    <th className="p-4">Short Description</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-white/5 font-semibold">
                  {stages.map((stg, idx) => (
                    <tr key={stg.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-4 pl-6 text-center font-mono">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-extrabold text-slate-900 dark:text-white w-4">{stg.order}</span>
                          <div className="flex flex-col">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMoveStageOrder(idx, 'up')}
                              className="p-0.5 text-slate-400 hover:text-primary disabled:opacity-20 cursor-pointer"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              disabled={idx === stages.length - 1}
                              onClick={() => handleMoveStageOrder(idx, 'down')}
                              className="p-0.5 text-slate-400 hover:text-primary disabled:opacity-20 cursor-pointer"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white text-sm">
                        <div className="flex items-center gap-2">
                          <span>{stg.name}</span>
                          {stg.id === 'in_testing' && (
                            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-full">
                              Required System Stage
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-primary">{stg.id}</td>
                      <td className="p-4 text-slate-500 max-w-xs">{stg.description}</td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditStage(stg)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            disabled={stg.id === 'in_testing'}
                            onClick={() => handleDeleteStage(stg.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              stg.id === 'in_testing'
                                ? 'opacity-25 cursor-not-allowed text-slate-400'
                                : 'hover:bg-rose-500/10 text-rose-500 cursor-pointer'
                            }`}
                            title={stg.id === 'in_testing' ? 'Required system stage cannot be deleted' : 'Delete stage'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'statuses' && (
        <div className="space-y-6">
          <div 
            onClick={() => toggleCard('statuses')}
            className="flex items-center justify-between bg-white dark:bg-card-dark p-5 rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm cursor-pointer select-none"
          >
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                Candidate Status Values ({statuses.length})
              </h3>
              <p className="text-xs text-slate-500 mt-1">Define custom candidate status values, badge colors, and system tags. Changes auto-save to Firestore.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleOpenAddStatus(); }}
                className="py-2 px-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 btn-animate cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Candidate Status
              </button>
              <button type="button" className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                {collapsedCards.statuses ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {!collapsedCards.statuses && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {statuses.map((st) => (
                <div
                  key={st.key}
                  className="bg-white dark:bg-card-dark p-5 rounded-2xl border border-slate-200/50 dark:border-border-dark shadow-sm flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Status Tag</span>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold capitalize border ${
                      st.color === 'yellow' ? 'bg-yellow-500/15 text-yellow-600 border-yellow-500/20' :
                      st.color === 'green' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' :
                      st.color === 'red' ? 'bg-rose-500/15 text-rose-600 border-rose-500/20' :
                      st.color === 'purple' ? 'bg-purple-500/15 text-purple-600 border-purple-500/20' :
                      st.color === 'indigo' ? 'bg-indigo-500/15 text-indigo-600 border-indigo-500/20' :
                      st.color === 'pink' ? 'bg-pink-500/15 text-pink-600 border-pink-500/20' :
                      'bg-blue-500/15 text-blue-600 border-blue-500/20'
                    }`}>
                      {st.key}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditStatus(st)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteStatus(st.key)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stage Progress Status Values Card (Positioned directly below Candidate Status Manager) */}
          <div 
            onClick={() => toggleCard('stageProgress')}
            className="flex items-center justify-between bg-white dark:bg-card-dark p-5 rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm cursor-pointer select-none mt-6"
          >
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Stage Progress Statuses ({stageProgressOptions.length})
              </h3>
              <p className="text-xs text-slate-500 mt-1">Configure candidate progress status options (e.g. Started, Completed, Failed, Non Responsive) within workflow stages.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleOpenAddStageProgress(); }}
                className="py-2 px-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 btn-animate cursor-pointer shadow-md shadow-primary/20"
              >
                <Plus className="w-4 h-4" />
                Add Progress Status
              </button>
              <button type="button" className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                {collapsedCards.stageProgress ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {!collapsedCards.stageProgress && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {stageProgressOptions.map((item) => (
                <div
                  key={item.key}
                  className="bg-white dark:bg-card-dark p-5 rounded-2xl border border-slate-200/50 dark:border-border-dark shadow-sm flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Progress Key</span>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getStageProgressStyle(item.color, item.key)}`}>
                      {item.label || item.key}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditStageProgress(item)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteStageProgress(item.key)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Stage Progress Modal */}
      <AnimatePresence>
        {isStageProgressModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStageProgressModalOpen(false)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-card-dark rounded-3xl p-6 border border-slate-200 dark:border-border-dark shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingStageProgress ? 'Edit Stage Progress Option' : 'Add Stage Progress Option'}
                </h3>
                <button onClick={() => setIsStageProgressModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStageProgressSubmit} className="space-y-4 text-xs font-semibold mt-4">
                <div>
                  <label className="block text-slate-500 uppercase tracking-wider mb-1 text-[10px]">Progress Key Identifier</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. in_review"
                    value={stageProgressKey}
                    onChange={(e) => setStageProgressKey(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs dark:text-white focus:outline-none focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 uppercase tracking-wider mb-1 text-[10px]">Display Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. In Review"
                    value={stageProgressLabel}
                    onChange={(e) => setStageProgressLabel(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs dark:text-white focus:outline-none focus:border-primary font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 uppercase tracking-wider mb-1 text-[10px]">Badge Highlight Color</label>
                  <select
                    value={stageProgressColor}
                    onChange={(e) => setStageProgressColor(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs dark:text-white focus:outline-none focus:border-primary capitalize font-bold cursor-pointer"
                  >
                    {COLOR_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsStageProgressModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl btn-animate cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl btn-animate cursor-pointer"
                  >
                    {editingStageProgress ? 'Save Changes' : 'Create Option'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add/Edit Template Modal */}
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
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-card-dark rounded-3xl p-6 border border-slate-200 dark:border-border-dark shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Email Template</h3>
                <button onClick={() => setIsAddTemplateOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddTemplateSubmit} className="space-y-4 text-xs font-semibold mt-4">
                <div>
                  <label className="block text-slate-500 uppercase tracking-wider mb-1 text-[10px]">Template Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rate Offer Notice"
                    value={newTmplName}
                    onChange={(e) => setNewTmplName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 uppercase tracking-wider mb-1 text-[10px]">Initial Subject Line</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Welcome to MLC Language Network"
                    value={newTmplSubject}
                    onChange={(e) => setNewTmplSubject(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddTemplateOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl btn-animate cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl btn-animate cursor-pointer"
                  >
                    Create Template
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add/Edit Action Modal */}
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
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-card-dark rounded-3xl p-6 border border-slate-200 dark:border-border-dark shadow-2xl z-50 overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingAction ? 'Edit Action Rule' : 'Create Workflow Action Rule'}
                  </h3>
                  <button onClick={() => setIsAddActionOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form id="action-form" onSubmit={handleAddActionSubmit} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-500 uppercase tracking-wider mb-1 text-[10px]">Rule Description Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Send NDA Email and Set Approved Status on Stage Entry"
                      value={newActName}
                      onChange={(e) => setNewActName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs dark:text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 uppercase tracking-wider mb-1 text-[10px]">Trigger Workflow Stage</label>
                      <select
                        value={newActStage}
                        onChange={(e) => setNewActStage(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs dark:text-white cursor-pointer font-bold"
                      >
                        {stages.map((stg) => (
                          <option key={stg.id} value={stg.id}>{stg.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 uppercase tracking-wider mb-1 text-[10px]">Trigger Progress Event</label>
                      <select
                        value={newActTriggerStatus}
                        onChange={(e) => setNewActTriggerStatus(e.target.value as any)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs dark:text-white cursor-pointer font-bold"
                      >
                        <option value="started">🟡 On Stage Entry (Started)</option>
                        <option value="exited">🚪 On Stage Exit (Exited)</option>
                        <option value="completed">🟢 On Stage Completion (Completed)</option>
                        <option value="failed">🔴 On Stage Failure (Failed)</option>
                        <option value="non_responsive">🟣 On Non Responsive</option>
                        <option value="any">⚡ On Any Event</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 p-3 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/20 dark:border-white/5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Rule Trigger Condition (Optional)</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 uppercase tracking-wider mb-1 text-[9px]">Operator / Rule Condition</label>
                        <select
                          value={newActOperator}
                          onChange={(e) => setNewActOperator(e.target.value as any)}
                          className="w-full p-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-lg text-xs dark:text-white cursor-pointer font-bold"
                        >
                          <option value="always">On Stage Entry (Unconditional)</option>
                          <option value="stage_exit">On Stage Exit (Unconditional)</option>
                          <option value="==">Equals (==)</option>
                          <option value="!=">Not Equals (!=)</option>
                          <option value="empty">Is Empty / Missing</option>
                          <option value="not_empty">Is Set / Present</option>
                        </select>
                      </div>

                      {newActOperator !== 'always' && newActOperator !== 'stage_exit' ? (
                        <>
                          <div>
                            <label className="block text-slate-400 uppercase tracking-wider mb-1 text-[9px]">Condition Field</label>
                            <select
                              value={newActField}
                              onChange={(e) => setNewActField(e.target.value)}
                              className="w-full p-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-lg text-xs dark:text-white cursor-pointer"
                            >
                              <option value="hasSignedNda">Signed NDA Status</option>
                              <option value="isGmail">Google Account Type</option>
                              <option value="classificationTier">Candidate Tier</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-400 uppercase tracking-wider mb-1 text-[9px]">Target Value</label>
                            <input
                              type="text"
                              value={newActVal}
                              onChange={(e) => setNewActVal(e.target.value)}
                              placeholder="e.g. true, false, 1"
                              className="w-full p-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-lg text-xs dark:text-white"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="col-span-2 text-[11px] text-slate-500 italic flex items-center">
                          {newActOperator === 'stage_exit'
                            ? 'This rule triggers automatically when a candidate exits this stage.'
                            : 'This rule triggers automatically on stage entry, unless a specific conditional rule matches first.'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/40 dark:border-white/5">
                    <h5 className="font-extrabold text-[11px] text-slate-400 uppercase tracking-wider">Automated Actions & Updates</h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-500 uppercase tracking-wider mb-1 text-[10px]">1. Email Template (Optional)</label>
                        <select
                          value={newActTemplate}
                          onChange={(e) => setNewActTemplate(e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs dark:text-white cursor-pointer font-bold"
                        >
                          <option value="none">-- None (No Email) --</option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 uppercase tracking-wider mb-1 text-[10px]">Recipient Group</label>
                        <select
                          value={newActRecipient}
                          onChange={(e) => setNewActRecipient(e.target.value as any)}
                          className="w-full p-2.5 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs dark:text-white cursor-pointer font-bold"
                        >
                          <option value="vendor">Candidate Vendor</option>
                          <option value="mlc">MLC Internal Team</option>
                          <option value="both">Both</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/30 dark:border-white/5 space-y-3">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Candidate Field Updates</span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                        <div>
                          <label className="block text-slate-500 uppercase tracking-wider mb-1 text-[9px]">Workflow Stage</label>
                          <select
                            value={newActUpdateStage}
                            onChange={(e) => setNewActUpdateStage(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-lg text-xs dark:text-white font-bold cursor-pointer"
                          >
                            <option value="none">-- Keep Current --</option>
                            {stages.map((stg) => (
                              <option key={stg.id} value={stg.id}>{stg.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-500 uppercase tracking-wider mb-1 text-[9px]">Stage Status (Progress)</label>
                          <select
                            value={newActUpdateStageStatus}
                            onChange={(e) => setNewActUpdateStageStatus(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-lg text-xs dark:text-white font-bold cursor-pointer"
                          >
                            <option value="none">-- Keep Current --</option>
                            <option value="started">🟡 Started</option>
                            <option value="completed">🟢 Completed</option>
                            <option value="failed">🔴 Failed</option>
                            <option value="non_responsive">🟣 Non Responsive</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddActionOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl btn-animate cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="action-form"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl btn-animate cursor-pointer"
                >
                  {editingAction ? 'Save Changes' : 'Create Action'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add/Edit Stage Modal */}
      <AnimatePresence>
        {isStageModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStageModalOpen(false)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-card-dark rounded-3xl p-6 border border-slate-200 dark:border-border-dark shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingStage ? 'Edit Workflow Stage' : 'Add New Workflow Stage'}
                </h3>
                <button onClick={() => setIsStageModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStageSubmit} className="space-y-4 text-xs font-semibold mt-4">
                <div>
                  <label className="block text-slate-500 uppercase tracking-wider mb-1 text-[10px]">Stage Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Technical Evaluation"
                    value={stageName}
                    onChange={(e) => setStageName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 uppercase tracking-wider mb-1 text-[10px]">Short Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Assessment of translation quality and terminology"
                    value={stageDesc}
                    onChange={(e) => setStageDesc(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 uppercase tracking-wider mb-1 text-[10px]">Sort Order Position</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={stageOrder}
                    onChange={(e) => setStageOrder(parseInt(e.target.value) || 1)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsStageModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl btn-animate cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl btn-animate cursor-pointer"
                  >
                    {editingStage ? 'Save Stage' : 'Create Stage'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add/Edit Candidate Status Modal */}
      <AnimatePresence>
        {isStatusModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStatusModalOpen(false)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-card-dark rounded-3xl p-6 border border-slate-200 dark:border-border-dark shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingStatus ? 'Edit Candidate Status' : 'Add Candidate Status'}
                </h3>
                <button onClick={() => setIsStatusModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStatusSubmit} className="space-y-4 text-xs font-semibold mt-4">
                <div>
                  <label className="block text-slate-500 uppercase tracking-wider mb-1 text-[10px]">Status Key Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. archived"
                    value={statusKey}
                    onChange={(e) => setStatusKey(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs dark:text-white focus:outline-none focus:border-primary capitalize font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 uppercase tracking-wider mb-1 text-[10px]">Badge Highlight Color</label>
                  <select
                    value={statusColor}
                    onChange={(e) => setStatusColor(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs dark:text-white focus:outline-none focus:border-primary capitalize font-bold cursor-pointer"
                  >
                    {COLOR_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsStatusModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl btn-animate cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl btn-animate cursor-pointer"
                  >
                    {editingStatus ? 'Save Status' : 'Create Status'}
                  </button>
                </div>
              </form>
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
