import React, { useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import type { VendorProfile, WorkflowStage, VendorCategory, VendorStatus } from '../types';
import { 
  Plus, Search, Filter, ShieldAlert, CheckCircle2, Clock, X, User, 
  ArrowRight, FileText, Send, FileCheck, Check, UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Initial candidates dataset matching pipeline stages
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
    languages: ['Spanish -> English'],
    classificationTier: 1,
    source: 'external',
    mlcHourlyRate: 45,
    adjustedRate: 42,
    confirmedRate: 45,
    isGmail: false,
    submittedAt: '2026-07-20T10:00:00Z',
    updatedAt: '2026-07-20T10:00:00Z'
  },
  {
    id: 'v-2',
    companyName: 'LingoGlobe',
    contactName: 'Hana Tanaka',
    email: 'hana@lingoglobe.jp',
    phone: '+81 3 1234 5678',
    status: 'pending',
    category: 'unassigned',
    stage: 'testing_assigned',
    services: ['Interpretation', 'Subtitling'],
    languages: ['Japanese -> English'],
    classificationTier: 2,
    source: 'xtrf',
    mlcHourlyRate: 60,
    adjustedRate: 50,
    confirmedRate: 0,
    isGmail: false,
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
    languages: ['Swedish -> English'],
    classificationTier: 1,
    source: 'external',
    mlcHourlyRate: 50,
    adjustedRate: 45,
    confirmedRate: 0,
    isGmail: true,
    submittedAt: '2026-07-30T09:15:00Z',
    updatedAt: '2026-07-30T09:15:00Z'
  },
  {
    id: 'v-4',
    companyName: 'Global Voice Inc.',
    contactName: 'Amara Diop',
    email: 'amara@globalvoice.sn',
    phone: '+221 33 123 45 67',
    status: 'pending',
    category: 'network',
    stage: 'nda_verified',
    services: ['Transcription'],
    languages: ['Wolof -> French'],
    classificationTier: 3,
    source: 'xtrf',
    mlcHourlyRate: 35,
    adjustedRate: 30,
    confirmedRate: 32,
    isGmail: false,
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

const CATEGORY_LABELS: Record<VendorCategory, string> = {
  outreach: 'New Outreach',
  network: 'Existing Network',
  unassigned: 'Tested & Unassigned',
  active: 'Active Vendor'
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  // App state
  const [vendors, setVendors] = useState<VendorProfile[]>(INITIAL_VENDORS_MOCK);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  
  // Side Panels (Intake Simulators)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isXtrfOpen, setIsXtrfOpen] = useState(false);

  // Form State for Sourced intake lead
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [languages, setLanguages] = useState('');
  const [services, setServices] = useState('');
  const [mlcRate, setMlcRate] = useState('45');
  const [tier, setTier] = useState<'1' | '2' | '3'>('2');
  const [isGmail, setIsGmail] = useState(false);

  // Workflow triggers & overrides
  const handleStageAdvance = (vendorId: string, nextStage: WorkflowStage) => {
    setVendors((prev) => 
      prev.map((v) => {
        if (v.id !== vendorId) return v;
        
        let newStatus: VendorStatus = v.status;
        if (nextStage === 'approved') {
          newStatus = 'approved';
        } else if (nextStage === 'grading') {
          newStatus = 'pending';
        }
        
        return { 
          ...v, 
          stage: nextStage, 
          status: newStatus,
          updatedAt: new Date().toISOString() 
        };
      })
    );
    
    // Auto-update selected vendor modal to reflect state changes
    setSelectedVendor((prev) => {
      if (!prev || prev.id !== vendorId) return prev;
      let newStatus: VendorStatus = prev.status;
      if (nextStage === 'approved') newStatus = 'approved';
      return { ...prev, stage: nextStage, status: newStatus, updatedAt: new Date().toISOString() };
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

  // Add a sourced candidate (simulates Direct Link form submission)
  const handleDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLead: VendorProfile = {
      id: `sourced-${Date.now()}`,
      companyName,
      contactName,
      email,
      phone: '+1 (555) 999-9999',
      languages: languages.split(',').map((l) => l.trim()).filter(Boolean),
      services: services.split(',').map((s) => s.trim()).filter(Boolean),
      classificationTier: parseInt(tier) as 1 | 2 | 3,
      isGmail,
      source: 'external',
      category: 'outreach',
      stage: 'sourced',
      mlcHourlyRate: parseFloat(mlcRate) || 0,
      adjustedRate: Math.round((parseFloat(mlcRate) || 0) * 0.9), // Offer 10% less by default
      confirmedRate: 0,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setVendors((prev) => [newLead, ...prev]);
    setIsAddOpen(false);

    // Reset fields
    setCompanyName('');
    setContactName('');
    setEmail('');
    setLanguages('');
    setServices('');
    setMlcRate('45');
    setTier('2');
    setIsGmail(false);
  };

  // Simulate XTRF candidate profile import
  const triggerXtrfImport = () => {
    const xtrfLead: VendorProfile = {
      id: `xtrf-${Date.now()}`,
      companyName: 'LingoExpress Beijing',
      contactName: 'Zheng Wei',
      email: 'zheng.wei@lingoex.cn',
      phone: '+86 10 9999 8888',
      languages: ['Mandarin -> English', 'English -> Mandarin'],
      services: ['Translation', 'Interpretation'],
      classificationTier: 1,
      isGmail: false,
      source: 'xtrf',
      category: 'network',
      stage: 'intake_complete',
      mlcHourlyRate: 50,
      adjustedRate: 45,
      confirmedRate: 0,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setVendors((prev) => [xtrfLead, ...prev]);
    setIsXtrfOpen(true);
    setTimeout(() => setIsXtrfOpen(false), 2000);
  };

  // Pipeline Filtered lists
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchesSearch = 
        v.companyName.toLowerCase().includes(search.toLowerCase()) ||
        v.contactName.toLowerCase().includes(search.toLowerCase()) ||
        v.languages.some((l) => l.toLowerCase().includes(search.toLowerCase())) ||
        v.services.some((s) => s.toLowerCase().includes(search.toLowerCase()));
      
      const matchesStage = stageFilter === 'all' || v.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [vendors, search, stageFilter]);

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
      {/* Page Title & Quick Simulator Triggers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Pipeline Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
            Track candidates through recruitment funnel verification gates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mock intake form trigger */}
          <button
            onClick={() => setIsAddOpen(true)}
            className="py-2.5 px-4 bg-primary hover:bg-primary-dark text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 btn-animate shadow-md shadow-primary/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Direct Link Form
          </button>
          
          {/* Mock XTRF import trigger */}
          <button
            onClick={triggerXtrfImport}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 btn-animate border border-white/5 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-slate-400" />
            XTRF Import Link
          </button>
        </div>
      </div>

      {/* Funnel Pipeline Visual Progress Bar */}
      <section className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm">
        <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Workflow Stage Gate Funnel
        </h4>
        <div className="grid grid-cols-3 md:grid-cols-9 gap-4">
          {(Object.keys(STAGE_LABELS) as WorkflowStage[]).map((stage) => {
            const count = funnelStats[stage];
            return (
              <div 
                key={stage} 
                className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 dark:bg-bg-dark border border-slate-200/10 hover:border-primary/20 transition-all text-center relative group cursor-pointer"
                onClick={() => setStageFilter(stage)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-2 ${
                  count > 0 ? 'bg-primary text-white shadow-md shadow-primary/25' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 tracking-tight line-clamp-1">
                  {STAGE_LABELS[stage].split(' ')[0]}
                </span>
                {/* Tooltip */}
                <span className="absolute bottom-full mb-2 bg-slate-900 text-white text-[9px] font-semibold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                  {STAGE_LABELS[stage]}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Candidates List with Filters */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white dark:bg-card-dark p-4 rounded-2xl border border-slate-200/50 dark:border-border-dark shadow-sm">
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidates by company, contact, language pairs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
              />
            </div>
            
            <div className="relative">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white appearance-none cursor-pointer font-semibold"
              >
                <option value="all">All Stages</option>
                {Object.keys(STAGE_LABELS).map((key) => (
                  <option key={key} value={key}>{STAGE_LABELS[key as WorkflowStage]}</option>
                ))}
              </select>
              <Filter className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Candidate Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredVendors.length > 0 ? (
              filteredVendors.map((candidate) => (
                <motion.div
                  key={candidate.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setSelectedVendor(candidate)}
                  className="glass dark:dark-glass p-6 rounded-3xl border border-slate-200/50 dark:border-white/10 flex flex-col justify-between shadow-sm hover:shadow-md transition-all cursor-pointer relative"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">
                          {CATEGORY_LABELS[candidate.category]}
                        </span>
                        <h4 className="font-extrabold text-lg text-slate-900 dark:text-white mt-0.5">{candidate.companyName}</h4>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          {candidate.contactName}
                        </p>
                      </div>

                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/30">
                        {candidate.source.toUpperCase()}
                      </span>
                    </div>

                    {/* Vetted Languages & Services */}
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.languages.map((l, i) => (
                        <span key={i} className="text-[10px] bg-primary/10 text-primary py-0.5 px-2.5 rounded-md font-semibold">
                          {l}
                        </span>
                      ))}
                      {candidate.services.map((s, i) => (
                        <span key={i} className="text-[10px] bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-0.5 px-2.5 rounded-md">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stage badge and pricing status */}
                  <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-medium">Pipeline Stage</span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {STAGE_LABELS[candidate.stage]}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 block uppercase font-medium">Agreed Rate</span>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
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
      </section>

      {/* Drawer: Simulation Direct Form Link */}
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
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Simulate Direct Intake</h3>
                    <p className="text-xs text-slate-500 mt-1">This form replicates candidate details submitted via direct URL form.</p>
                  </div>
                  <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form id="direct-form" onSubmit={handleDirectSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Name</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Translation Pros Inc"
                      className="w-full p-2.5 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact Person</label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Sofia Vergara"
                      className="w-full p-2.5 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Primary Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="sofia@transpros.com"
                      className="w-full p-2.5 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      id="is-gmail"
                      checked={isGmail}
                      onChange={(e) => setIsGmail(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary bg-slate-50 dark:bg-bg-dark"
                    />
                    <label htmlFor="is-gmail" className="text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                      Google Workspace Account (Gmail validation flag)
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hourly Rate ($)</label>
                      <input
                        type="number"
                        required
                        value={mlcRate}
                        onChange={(e) => setMlcRate(e.target.value)}
                        className="w-full p-2.5 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Classification Tier</label>
                      <select
                        value={tier}
                        onChange={(e) => setTier(e.target.value as any)}
                        className="w-full p-2.5 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white appearance-none cursor-pointer"
                      >
                        <option value="1">Tier 1</option>
                        <option value="2">Tier 2</option>
                        <option value="3">Tier 3</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Languages (comma separated)</label>
                    <input
                      type="text"
                      required
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value)}
                      placeholder="e.g. Spanish -> English, Catalan -> Spanish"
                      className="w-full p-2.5 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Services (comma separated)</label>
                    <input
                      type="text"
                      required
                      value={services}
                      onChange={(e) => setServices(e.target.value)}
                      placeholder="e.g. Translation, Subtitling"
                      className="w-full p-2.5 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                    />
                  </div>
                </form>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-border-dark text-slate-500 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 btn-animate cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="direct-form"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl btn-animate cursor-pointer"
                >
                  Submit Sourced Lead
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{selectedVendor.companyName}</h3>
                  </div>
                  <button onClick={() => setSelectedVendor(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6 text-sm">
                  {/* Current stage indicator */}
                  <div className="p-4 bg-slate-50 dark:bg-bg-dark border border-slate-200/20 dark:border-white/5 rounded-2xl">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Status Stage-Gate</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-4 h-4 text-primary animate-spin" style={{ animationDuration: '8s' }} />
                      <span className="font-extrabold text-slate-900 dark:text-white">{STAGE_LABELS[selectedVendor.stage]}</span>
                    </div>
                  </div>

                  {/* Manual Stage overrides (Managers & Admin only) */}
                  {(user?.role === 'admin' || user?.role === 'manager') && (
                    <div className="space-y-3">
                      <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Workflow Transitions Gate</h5>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Direct Stage updates based on prerequisites */}
                        {selectedVendor.stage === 'sourced' && (
                          <button
                            onClick={() => handleStageAdvance(selectedVendor.id, 'nda_pending')}
                            className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-primary hover:text-white btn-animate cursor-pointer"
                          >
                            Send NDA Invite
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {selectedVendor.stage === 'nda_pending' && (
                          <button
                            onClick={() => handleStageAdvance(selectedVendor.id, 'nda_verified')}
                            className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-emerald-600 hover:text-white btn-animate cursor-pointer"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            Verify Signed NDA
                          </button>
                        )}
                        {selectedVendor.stage === 'nda_verified' && (
                          <button
                            onClick={() => handleStageAdvance(selectedVendor.id, 'outreach_sent')}
                            className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-primary hover:text-white btn-animate cursor-pointer"
                          >
                            Send Portal Login
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {selectedVendor.stage === 'outreach_sent' && (
                          <button
                            onClick={() => handleStageAdvance(selectedVendor.id, 'intake_complete')}
                            className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-primary hover:text-white btn-animate cursor-pointer"
                          >
                            Mock Form Submission
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {selectedVendor.stage === 'intake_complete' && (
                          <button
                            onClick={() => handleStageAdvance(selectedVendor.id, 'testing_assigned')}
                            className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-primary hover:text-white btn-animate cursor-pointer"
                          >
                            Assign Translation Test
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {selectedVendor.stage === 'testing_assigned' && (
                          <button
                            onClick={() => handleStageAdvance(selectedVendor.id, 'grading')}
                            className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-primary hover:text-white btn-animate cursor-pointer"
                          >
                            Submit to Grading Portal
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {selectedVendor.stage === 'grading' && (
                          <button
                            onClick={() => handleStageAdvance(selectedVendor.id, 'xtrf_sync')}
                            className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-primary hover:text-white btn-animate cursor-pointer"
                          >
                            Ready for XTRF Sync
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {selectedVendor.stage === 'xtrf_sync' && (
                          <button
                            onClick={() => handleStageAdvance(selectedVendor.id, 'approved')}
                            className="py-2.5 px-3 bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-emerald-600 btn-animate cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Finalize PM Approval
                          </button>
                        )}
                        {selectedVendor.stage === 'approved' && (
                          <div className="col-span-2 text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                            Partner fully active in PM Approved Directory.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Manual Rate Negotiator (Managers/Admin only) */}
                  {(user?.role === 'admin' || user?.role === 'manager') && (
                    <div className="space-y-3">
                      <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider font-semibold">Negotiate Contract Rates</h5>
                      <div className="bg-slate-50 dark:bg-bg-dark rounded-2xl p-4 border border-slate-100 dark:border-white/5 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] text-slate-500 block">MLC Charge Rate</span>
                            <span className="font-bold">${selectedVendor.mlcHourlyRate}/hr</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Offer Target Rate</span>
                            <span className="font-bold">${selectedVendor.adjustedRate}/hr</span>
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
                            className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg btn-animate cursor-pointer border border-white/5"
                          >
                            Confirm agreed rate
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Candidate Contact Metadata */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Candidate Profile</h5>
                    <div className="space-y-2 text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between">
                        <span>Contact Email:</span>
                        <span className="font-mono text-xs">{selectedVendor.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Classification Tier:</span>
                        <span className="font-bold">Tier {selectedVendor.classificationTier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Platform Import Source:</span>
                        <span className="capitalize">{selectedVendor.source}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                <button
                  onClick={() => setSelectedVendor(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl btn-animate cursor-pointer"
                >
                  Close Pipeline Details
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mini notification banner for XTRF mock sync */}
      <AnimatePresence>
        {isXtrfOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 dark:dark-glass bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-6 py-3 rounded-2xl border border-emerald-500/20 shadow-2xl font-bold flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>XTRF candidate successfully imported into Network Vendors stage!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
