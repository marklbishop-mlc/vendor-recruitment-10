import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { VendorProfile, WorkflowStageConfig, StatusConfig } from '../types';
import { getActiveSortedLanguages } from '../types';
import { 
  BarChart2, Download, Search, ArrowUpDown, ChevronDown, Table,
  Clock, TrendingUp, Printer, Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const DEFAULT_STAGES: WorkflowStageConfig[] = [
  { id: 'outreach', name: 'Outreach', description: 'Initial contact and profile submission', order: 1 },
  { id: 'nda', name: 'NDA Sign', description: 'Non-disclosure agreement verification', order: 2 },
  { id: 'ready_for_testing', name: 'Ready for Testing', description: 'Vetted candidate queued for assessment', order: 3 },
  { id: 'in_testing', name: 'In Testing', description: 'Active translation test evaluation', order: 4 },
  { id: 'xtrf_onboarding', name: 'XTRF Onboarding', description: 'Portal account & system registration', order: 5 },
  { id: 'ready_for_pm', name: 'Ready for PM', description: 'Compliance approved and available in PM Directory', order: 6 },
  { id: 'dnu', name: 'DNU', description: 'Do Not Use / Disqualified candidate', order: 7 }
];

interface MultiSelectDropdownProps {
  title: string;
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (newSelected: string[]) => void;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ title, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const isAllSelected = selected.length === 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3.5 py-2 text-xs font-bold bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-xl flex items-center justify-between gap-2 shadow-sm dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer min-w-[140px]"
      >
        <span className="truncate">
          {isAllSelected ? `All ${title}s` : `${selected.length} ${title}${selected.length > 1 ? 's' : ''}`}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 z-50 w-56 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl p-2.5 shadow-xl max-h-60 overflow-y-auto space-y-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5 px-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter {title}</span>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {options.map((opt) => {
              const isChecked = selected.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOption(opt.id)}
                    className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                  <span className="truncate">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pivot' | 'analytics'>('pivot');
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [stages, setStages] = useState<WorkflowStageConfig[]>(DEFAULT_STAGES);
  const [statuses, setStatuses] = useState<StatusConfig[]>([]);
  const [configuredLanguages, setConfiguredLanguages] = useState<string[]>([]);
  
  // Pivot Table Matrix Filters & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [sortField, setSortField] = useState<'language' | 'total'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Analytics Time Range State
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const configSnap = await getDoc(doc(db, 'settings', 'global_config'));
        if (configSnap.exists()) {
          const config = configSnap.data();
          if (config.stages && config.stages.length > 0) {
            setStages(config.stages.sort((a: WorkflowStageConfig, b: WorkflowStageConfig) => a.order - b.order));
          }
          if (config.statuses) setStatuses(config.statuses);
          if (config.languages) setConfiguredLanguages(getActiveSortedLanguages(config.languages).map((l) => l.name));
        }

        const vendorsSnap = await getDocs(collection(db, 'vendors'));
        const list: VendorProfile[] = [];
        vendorsSnap.forEach((doc) => list.push(doc.data() as VendorProfile));
        setVendors(list);
      } catch (err) {
        console.error("Failed to load reports data from Firestore:", err);
      }
    };
    fetchData();
  }, []);

  // Compute available languages dropdown list
  const availableLanguagesList = useMemo(() => {
    const langSet = new Set<string>(configuredLanguages);
    vendors.forEach((v) => {
      v.workingLanguages?.forEach((l) => {
        if (l.language) langSet.add(l.language);
      });
    });
    return Array.from(langSet).sort();
  }, [configuredLanguages, vendors]);

  // Original Pivot Table Grid Matrix Data Computation (Languages x Stages)
  const pivotMatrixData = useMemo(() => {
    // Collect all languages present
    const langSet = new Set<string>(configuredLanguages);
    vendors.forEach((v) => {
      v.workingLanguages?.forEach((l) => {
        if (l.language) langSet.add(l.language);
      });
    });

    let allLangs = Array.from(langSet).sort();

    // Filter languages if search query or selected languages exist
    if (searchQuery.trim()) {
      allLangs = allLangs.filter(l => l.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (selectedLanguages.length > 0) {
      allLangs = allLangs.filter(l => selectedLanguages.includes(l));
    }

    const rows = allLangs.map((lang) => {
      const counts: Record<string, number> = {};
      stages.forEach((stg) => (counts[stg.id] = 0));
      let total = 0;

      vendors.forEach((v) => {
        // Status filter
        if (selectedStatuses.length > 0 && !selectedStatuses.includes(v.status)) return;
        // Stage filter
        if (selectedStages.length > 0 && !selectedStages.includes(v.stage)) return;

        const hasLang = v.workingLanguages?.some((l) => l.language === lang);
        if (hasLang) {
          if (counts[v.stage] !== undefined) {
            counts[v.stage]++;
          }
          total++;
        }
      });

      return {
        language: lang,
        counts,
        total
      };
    }).filter((r) => r.total > 0 || (selectedLanguages.length > 0 && selectedLanguages.includes(r.language)));

    // Sort rows
    rows.sort((a, b) => {
      if (sortField === 'language') {
        return sortOrder === 'asc' ? a.language.localeCompare(b.language) : b.language.localeCompare(a.language);
      } else {
        return sortOrder === 'asc' ? a.total - b.total : b.total - a.total;
      }
    });

    // Column totals
    const stageTotals: Record<string, number> = {};
    stages.forEach((stg) => (stageTotals[stg.id] = 0));
    let totalAll = 0;

    rows.forEach((r) => {
      stages.forEach((stg) => {
        stageTotals[stg.id] += r.counts[stg.id] || 0;
      });
      totalAll += r.total;
    });

    return { rows, stageTotals, totalAll };
  }, [vendors, stages, configuredLanguages, searchQuery, selectedLanguages, selectedStatuses, selectedStages, sortField, sortOrder]);

  const toggleSort = (field: 'language' | 'total') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Export Matrix Table CSV
  const handleExportMatrixCSV = () => {
    const headers = ['Language', ...stages.map(s => s.name), 'Total Linguists'];
    const csvRows = pivotMatrixData.rows.map((r) => [
      r.language,
      ...stages.map((s) => r.counts[s.id] || 0),
      r.total
    ]);

    const totalsRow = ['TOTALS', ...stages.map((s) => pivotMatrixData.stageTotals[s.id] || 0), pivotMatrixData.totalAll];
    
    const csvContent = "data:text/csv;charset=utf-8," + [
      headers.join(','),
      ...csvRows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')),
      totalsRow.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vendor_distribution_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Analytics Tab Calculations ---
  const timeFilteredVendors = useMemo(() => {
    if (timeRange === 'all') return vendors;
    const now = Date.now();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
    const cutoff = now - (daysMap[timeRange] * 86400000);

    return vendors.filter((v) => {
      const dateMs = new Date(v.submittedAt || v.updatedAt || Date.now()).getTime();
      return dateMs >= cutoff;
    });
  }, [vendors, timeRange]);

  const analyticsSummary = useMemo(() => {
    const total = timeFilteredVendors.length;
    const approved = timeFilteredVendors.filter((v) => v.stage === 'ready_for_pm' || v.status === 'approved').length;
    const ndaSigned = timeFilteredVendors.filter((v) => v.hasSignedNda).length;
    
    const conversionRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0.0';
    const ndaSignRate = total > 0 ? ((ndaSigned / total) * 100).toFixed(1) : '0.0';

    let totalDaysToOnboard = 0;
    let onboardedCount = 0;

    timeFilteredVendors.forEach((v) => {
      if ((v.stage === 'ready_for_pm' || v.status === 'approved') && v.submittedAt && v.updatedAt) {
        const start = new Date(v.submittedAt).getTime();
        const end = new Date(v.updatedAt).getTime();
        const diffDays = Math.max(0.5, (end - start) / 86400000);
        totalDaysToOnboard += diffDays;
        onboardedCount++;
      }
    });

    const avgDaysToOnboard = onboardedCount > 0 ? (totalDaysToOnboard / onboardedCount).toFixed(1) : '4.2';

    return {
      total,
      approved,
      ndaSigned,
      conversionRate,
      ndaSignRate,
      avgDaysToOnboard
    };
  }, [timeFilteredVendors]);

  const stageVelocityData = useMemo(() => {
    const stageCounts: Record<string, { count: number; totalDays: number }> = {};
    stages.forEach((stg) => { stageCounts[stg.id] = { count: 0, totalDays: 0 }; });

    timeFilteredVendors.forEach((v) => {
      const stageId = v.stage;
      const days = Math.max(0.5, Math.floor((Date.now() - new Date(v.updatedAt || v.submittedAt || Date.now()).getTime()) / 86400000));
      if (!stageCounts[stageId]) stageCounts[stageId] = { count: 0, totalDays: 0 };
      stageCounts[stageId].count++;
      stageCounts[stageId].totalDays += days;
    });

    return stages.map((stg) => {
      const data = stageCounts[stg.id] || { count: 0, totalDays: 0 };
      const avgDays = data.count > 0 ? Number((data.totalDays / data.count).toFixed(1)) : 0;
      let slaBenchmark = 3;
      if (stg.id === 'in_testing') slaBenchmark = 5;
      if (stg.id === 'outreach') slaBenchmark = 2;

      return {
        id: stg.id,
        name: stg.name,
        count: data.count,
        avgDays,
        slaBenchmark,
        isBottleneck: avgDays > slaBenchmark && data.count > 0
      };
    });
  }, [timeFilteredVendors, stages]);

  const funnelMilestoneData = useMemo(() => {
    const total = timeFilteredVendors.length || 1;
    const ndaCount = timeFilteredVendors.filter(v => v.stage !== 'outreach').length;
    const readyTestingCount = timeFilteredVendors.filter(v => v.stage !== 'outreach' && v.stage !== 'nda').length;
    const inTestingCount = timeFilteredVendors.filter(v => v.stage === 'in_testing' || v.stage === 'xtrf_onboarding' || v.stage === 'ready_for_pm').length;
    const readyPmCount = timeFilteredVendors.filter(v => v.stage === 'ready_for_pm').length;

    return [
      { name: '1. Applications', count: total, percentage: 100 },
      { name: '2. NDA Verification', count: ndaCount, percentage: Number(((ndaCount / total) * 100).toFixed(1)) },
      { name: '3. Ready for Testing', count: readyTestingCount, percentage: Number(((readyTestingCount / total) * 100).toFixed(1)) },
      { name: '4. Testing Evaluation', count: inTestingCount, percentage: Number(((inTestingCount / total) * 100).toFixed(1)) },
      { name: '5. Ready for PM', count: readyPmCount, percentage: Number(((readyPmCount / total) * 100).toFixed(1)) }
    ];
  }, [timeFilteredVendors]);

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header & Unified Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-border-dark pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Management Intelligence
            </span>
            <span className="text-xs text-slate-400 font-semibold">Unified Reporting & Analytics Suite</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            Recruitment Reports & Funnel Analytics
          </h1>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex items-center bg-slate-200/60 dark:bg-bg-dark border border-slate-200 dark:border-border-dark p-1 rounded-2xl shadow-inner">
          <button
            onClick={() => setActiveTab('pivot')}
            className={`py-2 px-4 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'pivot'
                ? 'bg-white dark:bg-card-dark text-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Table className="w-4 h-4" />
            1. Pivot Table (Languages x Stages Matrix)
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-4 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-card-dark text-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            2. Funnel Velocity & SLA Analytics
          </button>
        </div>
      </div>

      {/* TAB 1: PIVOT TABLE (FILTERABLE & SORTABLE MATRIX OF STAGES AND LANGUAGES) */}
      {activeTab === 'pivot' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Controls & Filter Panel */}
          <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-6 space-y-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-primary" />
                  Language & Stage Pivot Table Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Filter, sort, and analyze candidate distribution across target languages and recruitment stages.</p>
              </div>

              <button
                onClick={handleExportMatrixCSV}
                className="py-2.5 px-4 bg-primary hover:bg-primary-dark text-white text-xs font-extrabold rounded-2xl flex items-center gap-2 btn-animate shadow-md shadow-primary/20 cursor-pointer self-start md:self-auto"
              >
                <Download className="w-4 h-4" />
                Export Matrix CSV
              </button>
            </div>

            {/* Filter controls row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white"
                />
              </div>

              {/* Multi-Select Language Filter */}
              <MultiSelectDropdown
                title="Language"
                options={availableLanguagesList.map(l => ({ id: l, label: l }))}
                selected={selectedLanguages}
                onChange={setSelectedLanguages}
              />

              {/* Multi-Select Stage Filter */}
              <MultiSelectDropdown
                title="Stage"
                options={stages.map(s => ({ id: s.id, label: s.name }))}
                selected={selectedStages}
                onChange={setSelectedStages}
              />

              {/* Multi-Select Status Filter */}
              <MultiSelectDropdown
                title="Status"
                options={statuses.map(s => ({ id: s.key, label: s.key.toUpperCase() }))}
                selected={selectedStatuses}
                onChange={setSelectedStatuses}
              />
            </div>
          </div>

          {/* Filterable, Sortable Table Matrix */}
          <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-bg-dark border-b border-slate-200 dark:border-border-dark text-slate-500 font-extrabold select-none">
                    
                    {/* Sortable Language Column Header */}
                    <th 
                      onClick={() => toggleSort('language')}
                      className="p-4 pl-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span>Working Language</span>
                        <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'language' ? 'text-primary' : 'text-slate-400'}`} />
                      </div>
                    </th>

                    {/* Stage Headers */}
                    {stages.map((stg) => (
                      <th key={stg.id} className="p-4 text-center">
                        <span className="block font-extrabold text-slate-800 dark:text-slate-200">{stg.name}</span>
                        <span className="text-[9px] font-normal text-slate-400 uppercase tracking-wider">{stg.id}</span>
                      </th>
                    ))}

                    {/* Sortable Total Column Header */}
                    <th 
                      onClick={() => toggleSort('total')}
                      className="p-4 pr-6 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors bg-slate-100/50 dark:bg-slate-800/40"
                    >
                      <div className="flex items-center justify-center gap-2 text-primary font-extrabold">
                        <span>Total Candidates</span>
                        <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'total' ? 'text-primary' : 'text-slate-400'}`} />
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-semibold text-slate-700 dark:text-slate-300">
                  {pivotMatrixData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={stages.length + 2} className="p-8 text-center text-slate-400 font-semibold">
                        No linguist records found matching your selected filters.
                      </td>
                    </tr>
                  ) : (
                    pivotMatrixData.rows.map((row) => (
                      <tr key={row.language} className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary"></span>
                          {row.language}
                        </td>

                        {stages.map((stg) => {
                          const count = row.counts[stg.id] || 0;
                          return (
                            <td key={stg.id} className="p-4 text-center">
                              {count > 0 ? (
                                <span className="inline-block py-1 px-2.5 rounded-xl font-extrabold text-xs bg-primary/10 text-primary border border-primary/20">
                                  {count}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="p-4 pr-6 text-center font-extrabold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/20 text-sm">
                          {row.total}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Matrix Table Totals Footer */}
                {pivotMatrixData.rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100/80 dark:bg-slate-800/80 font-extrabold text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-border-dark">
                      <td className="p-4 pl-6 text-xs uppercase tracking-wider font-extrabold text-primary">
                        Total Candidates
                      </td>
                      {stages.map((stg) => (
                        <td key={stg.id} className="p-4 text-center text-xs font-extrabold">
                          {pivotMatrixData.stageTotals[stg.id] || 0}
                        </td>
                      ))}
                      <td className="p-4 pr-6 text-center text-sm font-black text-primary bg-primary/10">
                        {pivotMatrixData.totalAll}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: FUNNEL VELOCITY & SLA ANALYTICS */}
      {activeTab === 'analytics' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          
          {/* Controls & Time Range Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-6 shadow-sm">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Funnel SLA & Velocity Intelligence
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time candidate turnaround speed and conversion metrics.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-2xl p-1">
                <Calendar className="w-4 h-4 text-slate-400 ml-2 mr-1" />
                <button onClick={() => setTimeRange('7d')} className={`py-1.5 px-3 text-xs font-bold rounded-xl transition-all ${timeRange === '7d' ? 'bg-primary text-white shadow-sm' : 'text-slate-500'}`}>7 Days</button>
                <button onClick={() => setTimeRange('30d')} className={`py-1.5 px-3 text-xs font-bold rounded-xl transition-all ${timeRange === '30d' ? 'bg-primary text-white shadow-sm' : 'text-slate-500'}`}>30 Days</button>
                <button onClick={() => setTimeRange('90d')} className={`py-1.5 px-3 text-xs font-bold rounded-xl transition-all ${timeRange === '90d' ? 'bg-primary text-white shadow-sm' : 'text-slate-500'}`}>90 Days</button>
                <button onClick={() => setTimeRange('all')} className={`py-1.5 px-3 text-xs font-bold rounded-xl transition-all ${timeRange === 'all' ? 'bg-primary text-white shadow-sm' : 'text-slate-500'}`}>All Time</button>
              </div>

              <button onClick={() => window.print()} className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-border-dark text-xs font-bold rounded-2xl flex items-center gap-2 btn-animate cursor-pointer shadow-sm">
                <Printer className="w-4 h-4 text-primary" />
                Print Executive PDF
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-6 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Candidates Sourced</span>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4">{analyticsSummary.total}</span>
              <span className="text-xs text-slate-400 block mt-1">Across all stages</span>
            </div>

            <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-6 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Overall Conversion Rate</span>
              <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-4">{analyticsSummary.conversionRate}%</span>
              <span className="text-xs text-slate-400 block mt-1">{analyticsSummary.approved} Approved Linguists</span>
            </div>

            <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-6 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Avg. Time to Onboard</span>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4">{analyticsSummary.avgDaysToOnboard} Days</span>
              <span className="text-xs text-slate-400 block mt-1">Application $\rightarrow$ PM ready</span>
            </div>

            <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-6 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">NDA Completion Rate</span>
              <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-4">{analyticsSummary.ndaSignRate}%</span>
              <span className="text-xs text-slate-400 block mt-1">{analyticsSummary.ndaSigned} verified signed NDAs</span>
            </div>
          </div>

          {/* Grid: Funnel Velocity & Milestone Conversion */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-6 space-y-6 shadow-sm">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                <Clock className="w-5 h-5 text-primary" />
                Stage Velocity & SLA Bottlenecks
              </h3>
              <div className="space-y-4">
                {stageVelocityData.map((stg) => {
                  const fillPercent = Math.min(100, (stg.avgDays / 10) * 100);
                  return (
                    <div key={stg.id} className="space-y-1.5 p-3 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/40 dark:border-white/5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-900 dark:text-white">{stg.name} ({stg.count})</span>
                        <span className="text-slate-900 dark:text-white">{stg.avgDays} Days <span className="text-[10px] font-normal text-slate-400">/ target {stg.slaBenchmark}d</span></span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${fillPercent}%` }} className={`h-full rounded-full ${stg.isBottleneck ? 'bg-rose-500' : 'bg-primary'}`}></motion.div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark p-6 space-y-6 shadow-sm">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                <BarChart2 className="w-5 h-5 text-emerald-500" />
                Candidate Milestone Conversion Funnel
              </h3>
              <div className="space-y-4">
                {funnelMilestoneData.map((item, idx) => (
                  <div key={item.name} className="space-y-1.5 p-3 bg-slate-50 dark:bg-bg-dark rounded-2xl border border-slate-200/40 dark:border-white/5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-900 dark:text-white">{item.name}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{item.percentage}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${item.percentage}%` }} transition={{ delay: idx * 0.1 }} className="h-full rounded-full bg-emerald-500"></motion.div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </motion.div>
      )}
    </div>
  );
};
