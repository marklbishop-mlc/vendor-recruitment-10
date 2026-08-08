import React, { useState, useEffect, useMemo } from 'react';
import type { TestRecord, TestGrade, VendorProfile } from '../types';
import { 
  BookOpen, Star, CheckCircle2, AlertCircle, XCircle, Calendar, Search, RotateCcw, ChevronDown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';



export const TestingPortal: React.FC = () => {
  const { user, loading } = useAuth();
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [vendorsList, setVendorsList] = useState<VendorProfile[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestRecord | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>([]);
  const [selectedLanguageFilters, setSelectedLanguageFilters] = useState<string[]>([]);
  const [selectedCampaignFilters, setSelectedCampaignFilters] = useState<string[]>([]);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isCampaignDropdownOpen, setIsCampaignDropdownOpen] = useState(false);

  // Grading Modal Form State
  const [score, setScore] = useState<'1' | '2' | '3'>('2');
  const [grade, setGrade] = useState<TestGrade>('pass');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (loading) return;

    const loadTestingData = async () => {
      try {
        // 1. Load test records
        const testSnap = await getDocs(collection(db, 'tests'));
        const testList: TestRecord[] = [];
        testSnap.forEach((doc) => {
          testList.push(doc.data() as TestRecord);
        });
        
        setTests(testList);

        // 2. Load vendor list to map names and languages dynamically
        const vendorSnap = await getDocs(collection(db, 'vendors'));
        const vList: VendorProfile[] = [];
        vendorSnap.forEach((doc) => {
          vList.push(doc.data() as VendorProfile);
        });
        setVendorsList(vList);
      } catch (err) {
        console.error("Failed to load testing portal collections", err);
      }
    };
    loadTestingData();
  }, [loading, user]);

  const getVendorInfo = (vendorId: string, test?: TestRecord) => {
    const v = vendorsList.find((v) => v.id === vendorId || v.email === vendorId);
    if (!v) {
      return { 
        name: test?.vendorName || test?.vendorEmail || 'Candidate', 
        languages: test?.language || 'N/A', 
        campaign: 'General Intake' 
      };
    }
    const name = v.companyName ? `${v.contactName || 'Candidate'} (${v.companyName})` : (v.contactName || 'Unnamed Candidate');
    const campaign = v.applicationName || (v.applicationId ? v.applicationId : 'General Intake');
    
    let languages = 'N/A';
    if (Array.isArray(v.workingLanguages) && v.workingLanguages.length > 0) {
      languages = v.workingLanguages.map((l) => {
        if (!l) return '';
        if (typeof l === 'string') return l;
        return `${l.language || 'N/A'} (${l.proficiency || 'working'})`;
      }).filter(Boolean).join(', ');
    }

    return { name, languages: languages || 'N/A', campaign };
  };

  const handleOpenGrading = (test: TestRecord) => {
    setSelectedTest(test);
    setScore((test.score?.toString() as any) || '2');
    setGrade(test.grade || 'pass');
    setNotes(test.internalNotes || '');
  };

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;

    const updatedTest: TestRecord = { 
      ...selectedTest, 
      status: 'completed', 
      score: parseInt(score) as 1 | 2 | 3, 
      grade, 
      internalNotes: notes, 
      completedAt: new Date().toISOString() 
    };

    try {
      await setDoc(doc(db, 'tests', selectedTest.id), updatedTest);

      setTests((prev) => 
        prev.map((t) => t.id === selectedTest.id ? updatedTest : t)
      );

      // Auto-update vendor profile per-language test status and overall stageStatus based on pass/fail test grade
      const vDoc = vendorsList.find((v) => v.id === selectedTest.vendorId);
      if (vDoc) {
        const targetLang = selectedTest.language;
        const vLangs = Array.isArray(vDoc.workingLanguages) ? vDoc.workingLanguages : [];
        
        let targetIndex = vLangs.findIndex((l) => 
          (l && l.testId && l.testId === selectedTest.id) ||
          (targetLang && l && l.language && l.language.toLowerCase().includes(targetLang.toLowerCase()))
        );

        if (targetIndex === -1) {
          targetIndex = vLangs.findIndex((l) => l && l.testStatus === 'pending');
        }

        if (targetIndex === -1) {
          targetIndex = 0;
        }

        const isPass = grade === 'pass' || grade === 'pass_caution';

        const updatedLangs = vLangs.map((l, index) => {
          if (index === targetIndex) {
            return {
              ...l,
              testStatus: (isPass ? 'passed' : 'failed') as any,
              testGrade: grade,
              score: parseInt(score),
              evaluatedAt: new Date().toISOString(),
              evaluatorName: user?.displayName || 'Lead Evaluator'
            };
          }
          return l;
        });

        const remainingPending = updatedLangs.some((l) => l && l.testStatus === 'pending');
        const anyFailed = updatedLangs.some((l) => l && l.testStatus === 'failed');
        
        let newStageStatus: 'started' | 'completed' | 'failed' = 'completed';
        if (remainingPending) {
          newStageStatus = 'started';
        } else if (anyFailed) {
          newStageStatus = 'failed';
        }

        const updatedVendor: VendorProfile = {
          ...vDoc,
          workingLanguages: updatedLangs,
          stageStatus: newStageStatus,
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'vendors', vDoc.id), updatedVendor);
        setVendorsList((prev) => prev.map((v) => v.id === vDoc.id ? updatedVendor : v));
      }

      setSelectedTest(null);
      alert("Test record graded and saved successfully.");
    } catch (err) {
      console.error("Failed to submit test grade to Firestore", err);
      alert("Failed to submit grade: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Extract all unique languages from tests & candidate profiles
  const uniqueLanguages = useMemo(() => {
    const langSet = new Set<string>();
    (tests || []).forEach((t) => {
      if (t && t.language) langSet.add(t.language);
    });
    (vendorsList || []).forEach((v) => {
      if (v && Array.isArray(v.workingLanguages)) {
        v.workingLanguages.forEach((l) => {
          if (l && typeof l === 'object' && l.language) langSet.add(l.language);
          else if (typeof l === 'string') langSet.add(l);
        });
      }
    });
    return Array.from(langSet).sort();
  }, [tests, vendorsList]);

  // Extract all unique application campaign names
  const uniqueCampaigns = useMemo(() => {
    const set = new Set<string>();
    (vendorsList || []).forEach((v) => {
      const camp = v.applicationName || (v.applicationId ? v.applicationId : 'General Intake');
      if (camp) set.add(camp);
    });
    if (set.size === 0) set.add('General Intake');
    return Array.from(set).sort();
  }, [vendorsList]);

  // Filter active test candidates to include vendors in testing stages
  const inTestingVendors = useMemo(() => {
    return vendorsList.filter((v) => v.stage === 'in_testing' || v.stage === 'ready_for_testing');
  }, [vendorsList]);

  const activeInTestingTests = useMemo(() => {
    // 1. Existing saved tests matching active vendors
    const validTests = tests.filter((t) => vendorsList.some((v) => v.id === t.vendorId || v.email === t.vendorId));

    // 2. Dynamic test records for vendors in testing stage who don't have a test record in Firestore yet
    const dynamicVendorTests: TestRecord[] = inTestingVendors
      .filter((v) => !tests.some((t) => t.vendorId === v.id || t.vendorId === v.email))
      .map((v) => ({
        id: `test-${v.id}`,
        vendorId: v.id,
        vendorName: v.contactName,
        vendorEmail: v.email,
        assignmentLink: `https://mlconnections.com/portal/assess-${v.id}`,
        projectNumber: `PR-${(v.id || 'TEST').slice(-4).toUpperCase()}`,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: (v.stageStatus === 'completed' ? 'completed' : 'in_progress') as any,
        score: (v.workingLanguages?.[0] as any)?.score || undefined,
        grade: (v.workingLanguages?.[0] as any)?.testGrade || undefined,
      }));

    return [...validTests, ...dynamicVendorTests];
  }, [tests, vendorsList, inTestingVendors]);

  // Filtered test records based on Search Query, Status, Language, and Campaign
  const filteredTests = useMemo(() => {
    return activeInTestingTests.filter((t) => {
      const vendorInfo = getVendorInfo(t.vendorId, t);
      const query = searchQuery.trim().toLowerCase();

      // 1. Search filter (Candidate Name, Company Name, Project Number/ID, Language, Campaign)
      const matchesQuery = !query || 
        vendorInfo.name.toLowerCase().includes(query) ||
        (t.projectNumber && t.projectNumber.toLowerCase().includes(query)) ||
        (t.language && t.language.toLowerCase().includes(query)) ||
        vendorInfo.languages.toLowerCase().includes(query) ||
        vendorInfo.campaign.toLowerCase().includes(query);

      // 2. Status filter
      const matchesStatus = selectedStatusFilters.length === 0 || selectedStatusFilters.some((st) => {
        if (st === 'completed' || st === 'graded') return t.status === 'completed';
        return t.status === st;
      });

      // 3. Language filter
      const matchesLanguage = selectedLanguageFilters.length === 0 || selectedLanguageFilters.some((lang) => {
        return (t.language && t.language.toLowerCase().includes(lang.toLowerCase())) ||
          vendorInfo.languages.toLowerCase().includes(lang.toLowerCase());
      });

      // 4. Campaign filter
      const matchesCampaign = selectedCampaignFilters.length === 0 || selectedCampaignFilters.includes(vendorInfo.campaign);

      return matchesQuery && matchesStatus && matchesLanguage && matchesCampaign;
    });
  }, [activeInTestingTests, searchQuery, selectedStatusFilters, selectedLanguageFilters, selectedCampaignFilters, vendorsList]);

  const isFiltered = searchQuery !== '' || selectedStatusFilters.length > 0 || selectedLanguageFilters.length > 0 || selectedCampaignFilters.length > 0;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatusFilters([]);
    setSelectedLanguageFilters([]);
    setSelectedCampaignFilters([]);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Translation Testing & Evaluation</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
            Track linguistic test assignments, project numbers, and assign pass/fail grades for candidates currently in testing stage.
          </p>
        </div>

        <div className="px-3.5 py-1.5 bg-slate-100 dark:bg-card-dark border border-slate-200/50 dark:border-border-dark rounded-full text-xs font-bold text-slate-500 dark:text-slate-400 self-start md:self-auto">
          Showing <span className="text-primary font-extrabold">{filteredTests.length}</span> of {activeInTestingTests.length} Tests
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-card-dark p-4 rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate name, company, project ID, or language..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-2xl text-xs font-medium focus:outline-none focus:border-primary transition-all dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Multi-Select Status Filter */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsStatusDropdownOpen(!isStatusDropdownOpen);
              setIsLangDropdownOpen(false);
            }}
            className="pl-3 pr-8 py-2 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-2xl focus:outline-none focus:border-primary transition-all dark:text-white flex items-center gap-2 font-bold cursor-pointer shadow-sm relative"
          >
            <span>
              {selectedStatusFilters.length === 0
                ? 'All Statuses'
                : selectedStatusFilters.length === 1
                ? (selectedStatusFilters[0] === 'completed' ? 'Completed' : selectedStatusFilters[0].replace('_', ' '))
                : `Statuses (${selectedStatusFilters.length})`}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
          </button>

          {isStatusDropdownOpen && (
            <div className="absolute right-0 sm:left-0 top-full mt-2 w-56 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-xl z-50 p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2 text-xs font-bold text-slate-500">
                <span>Filter by Status</span>
                {selectedStatusFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedStatusFilters([])}
                    className="text-rose-500 hover:underline text-[10px]"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {[
                  { id: 'assigned', label: 'Assigned' },
                  { id: 'in_progress', label: 'In Progress' },
                  { id: 'completed', label: 'Completed / Graded' }
                ].map((st) => {
                  const isChecked = selectedStatusFilters.includes(st.id);
                  return (
                    <label
                      key={st.id}
                      className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedStatusFilters(selectedStatusFilters.filter(id => id !== st.id));
                          } else {
                            setSelectedStatusFilters([...selectedStatusFilters, st.id]);
                          }
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span>{st.label}</span>
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
              setIsStatusDropdownOpen(false);
              setIsCampaignDropdownOpen(false);
            }}
            className="pl-3 pr-8 py-2 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-2xl focus:outline-none focus:border-primary transition-all dark:text-white flex items-center gap-2 font-bold cursor-pointer shadow-sm relative"
          >
            <span>
              {selectedLanguageFilters.length === 0
                ? 'All Languages'
                : selectedLanguageFilters.length === 1
                ? selectedLanguageFilters[0]
                : `Languages (${selectedLanguageFilters.length})`}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
          </button>

          {isLangDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-xl z-50 p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2 text-xs font-bold text-slate-500">
                <span>Filter by Language</span>
                {selectedLanguageFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedLanguageFilters([])}
                    className="text-rose-500 hover:underline text-[10px]"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {uniqueLanguages.map((lang) => {
                  const isChecked = selectedLanguageFilters.includes(lang);
                  return (
                    <label
                      key={lang}
                      className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedLanguageFilters(selectedLanguageFilters.filter(l => l !== lang));
                          } else {
                            setSelectedLanguageFilters([...selectedLanguageFilters, lang]);
                          }
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span>{lang}</span>
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
              setIsCampaignDropdownOpen(!isCampaignDropdownOpen);
              setIsStatusDropdownOpen(false);
              setIsLangDropdownOpen(false);
            }}
            className="pl-3 pr-8 py-2 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-2xl focus:outline-none focus:border-primary transition-all dark:text-white flex items-center gap-2 font-bold cursor-pointer shadow-sm relative"
          >
            <span>
              {selectedCampaignFilters.length === 0
                ? 'All Campaigns'
                : selectedCampaignFilters.length === 1
                ? selectedCampaignFilters[0]
                : `Campaigns (${selectedCampaignFilters.length})`}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
          </button>

          {isCampaignDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-xl z-50 p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2 text-xs font-bold text-slate-500">
                <span>Filter by Campaign</span>
                {selectedCampaignFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCampaignFilters([])}
                    className="text-rose-500 hover:underline text-[10px]"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {uniqueCampaigns.map((camp) => {
                  const isChecked = selectedCampaignFilters.includes(camp);
                  return (
                    <label
                      key={camp}
                      className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedCampaignFilters(selectedCampaignFilters.filter(c => c !== camp));
                          } else {
                            setSelectedCampaignFilters([...selectedCampaignFilters, camp]);
                          }
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span className="truncate">{camp}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Clear Filters Button */}
        {isFiltered && (
          <button
            onClick={handleResetFilters}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-bold flex items-center gap-1 btn-animate cursor-pointer"
            title="Reset search & filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Grid List of Active Tests */}
      <section className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-bg-dark text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/50 dark:border-border-dark">
                <th className="p-4 pl-6">Candidate Company</th>
                <th className="p-4">Campaign</th>
                <th className="p-4">Language Pair</th>
                <th className="p-4">Project ID</th>
                <th className="p-4">Deadline Date</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4">Result Grade</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
              {filteredTests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 text-xs font-semibold">
                    No translation testing assignments found matching your active search query or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTests.map((t) => {
                  const info = getVendorInfo(t.vendorId);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-4 pl-6 font-bold text-slate-900 dark:text-white">{info.name}</td>
                      <td className="p-4 text-xs font-bold text-slate-700 dark:text-slate-300">{info.campaign}</td>
                      <td className="p-4 text-xs font-bold text-primary">
                        {t.language || info.languages}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400">{t.projectNumber}</td>
                      <td className="p-4 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-2.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(t.deadline).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          t.status === 'completed' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : t.status === 'in_progress'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        {t.grade ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-bold capitalize ${
                            t.grade === 'pass' 
                              ? 'text-emerald-500' 
                              : t.grade === 'pass_caution' 
                              ? 'text-amber-500' 
                              : 'text-red-500'
                          }`}>
                            {t.grade === 'pass' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {t.grade === 'pass_caution' && <AlertCircle className="w-3.5 h-3.5" />}
                            {t.grade === 'fail' && <XCircle className="w-3.5 h-3.5" />}
                            {t.grade.replace('_', ' ')} (Score: {t.score}/3)
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-light">Unevaluated</span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => handleOpenGrading(t)}
                          className="py-1 px-3 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-lg btn-animate cursor-pointer shadow-md shadow-primary/10"
                        >
                          {t.status === 'completed' ? 'Review Grade' : 'Enter Grades'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grading Evaluation Modal */}
      <AnimatePresence>
        {selectedTest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTest(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white dark:bg-card-dark rounded-3xl p-6 border border-slate-200 dark:border-border-dark shadow-2xl z-50 overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary animate-pulse" />
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Grade Evaluation Portal
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Candidate: <span className="font-bold text-slate-800 dark:text-slate-200">{getVendorInfo(selectedTest.vendorId).name}</span>
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedTest(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form id="grading-form" onSubmit={handleSubmitGrade} className="space-y-4 text-xs font-semibold">
                  {/* Target Language Pair & Test reference details */}
                  <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-bg-dark border border-slate-200/20 dark:border-white/5 rounded-2xl text-slate-500">
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Target Language</span>
                      <span className="font-bold text-primary text-xs">{selectedTest.language || 'Primary Language'}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Project ID</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-xs">{selectedTest.projectNumber}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Assignment</span>
                      <a href={selectedTest.assignmentLink} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-xs truncate block">
                        Open Test Link
                      </a>
                    </div>
                  </div>

                  {/* Pass/Fail Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Linguistic Result Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { val: 'pass', label: 'Pass', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 active:bg-emerald-500' },
                        { val: 'pass_caution', label: 'Pass w/ Caution', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20 active:bg-amber-500' },
                        { val: 'fail', label: 'Fail', color: 'bg-red-500/10 text-red-600 border-red-500/20 active:bg-red-500' }
                      ] as const).map((g) => (
                        <button
                          key={g.val}
                          type="button"
                          onClick={() => setGrade(g.val)}
                          className={`py-2 px-3 border text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                            grade === g.val 
                              ? 'bg-primary text-white border-primary shadow-sm shadow-primary/10'
                              : 'bg-slate-50 dark:bg-bg-dark text-slate-500 dark:text-slate-400 border-slate-200/30'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Numerical Score Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Numerical Rating Score</label>
                    <div className="flex items-center gap-3">
                      {(['1', '2', '3'] as const).map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setScore(val)}
                          className={`w-10 h-10 rounded-full border text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                            score === val 
                              ? 'bg-primary text-white border-primary shadow-md' 
                              : 'bg-slate-50 dark:bg-bg-dark text-slate-500 dark:text-slate-400 border-slate-200/30'
                          }`}
                        >
                          <Star className="w-3.5 h-3.5" fill={score === val ? "currentColor" : "none"} />
                          <span className="ml-0.5">{val}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Internal private notes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                      Internal Grading Evaluation Notes (Confidential)
                    </label>
                    <textarea
                      required
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter detailed translation assessment comments here... (These are kept private from the candidate profile)"
                      rows={4}
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                    />
                  </div>
                </form>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTest(null)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-border-dark text-slate-500 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 btn-animate cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="grading-form"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl btn-animate cursor-pointer"
                >
                  Submit Evaluations
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
