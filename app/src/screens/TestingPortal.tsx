import React, { useState } from 'react';
import type { TestRecord, TestGrade } from '../types';
import { 
  BookOpen, Star, CheckCircle2, AlertCircle, XCircle, Calendar, Link as LinkIcon 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock active testing records
const INITIAL_TESTS: TestRecord[] = [
  {
    id: 't-rec-1',
    vendorId: 'v-2',
    assignmentLink: 'https://mlconnections.com/portal/assess-ja-eng-098',
    projectNumber: 'PR-4690-JA',
    deadline: '2026-08-05T17:00:00Z',
    status: 'in_progress',
    graderId: 'mock-admin-mark',
  },
  {
    id: 't-rec-2',
    vendorId: 'v-3',
    assignmentLink: 'https://mlconnections.com/portal/assess-sv-eng-551',
    projectNumber: 'PR-8710-SV',
    deadline: '2026-08-01T12:00:00Z',
    status: 'assigned',
    graderId: 'mock-manager-sarah',
  }
];

// Mock mapping vendor ID to details for view
const VENDOR_NAMES: Record<string, { name: string; languages: string }> = {
  'v-2': { name: 'LingoGlobe', languages: 'Japanese -> English' },
  'v-3': { name: 'Nordic Words', languages: 'Swedish -> English' }
};

export const TestingPortal: React.FC = () => {
  const [tests, setTests] = useState<TestRecord[]>(INITIAL_TESTS);
  const [selectedTest, setSelectedTest] = useState<TestRecord | null>(null);
  
  // Grading Modal Form State
  const [score, setScore] = useState<'1' | '2' | '3'>('2');
  const [grade, setGrade] = useState<TestGrade>('pass');
  const [notes, setNotes] = useState('');

  const handleOpenGrading = (test: TestRecord) => {
    setSelectedTest(test);
    setScore((test.score?.toString() as any) || '2');
    setGrade(test.grade || 'pass');
    setNotes(test.internalNotes || '');
  };

  const handleSubmitGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;

    setTests((prev) => 
      prev.map((t) => 
        t.id === selectedTest.id 
          ? { 
              ...t, 
              status: 'completed', 
              score: parseInt(score) as 1 | 2 | 3, 
              grade, 
              internalNotes: notes, 
              completedAt: new Date().toISOString() 
            } 
          : t
      )
    );

    setSelectedTest(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Translation Testing & Evaluation</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
          Track linguistic test assignments, project numbers, and assign pass/fail grades.
        </p>
      </div>

      {/* Grid List of Active Tests */}
      <section className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-bg-dark text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/50 dark:border-border-dark">
                <th className="p-4 pl-6">Candidate Company</th>
                <th className="p-4">Language Pair</th>
                <th className="p-4">Project ID</th>
                <th className="p-4">Deadline Date</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4">Result Grade</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
              {tests.map((t) => {
                const info = VENDOR_NAMES[t.vendorId] || { name: 'Unknown Candidate', languages: 'N/A' };
                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 pl-6 font-bold text-slate-900 dark:text-white">{info.name}</td>
                    <td className="p-4 text-xs font-semibold text-primary">{info.languages}</td>
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
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grading evaluation dialog modal */}
      <AnimatePresence>
        {selectedTest && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTest(null)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-card-dark rounded-3xl p-6 border border-slate-200 dark:border-border-dark shadow-2xl z-50 overflow-hidden flex flex-col justify-between"
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
                        Test Candidate: {VENDOR_NAMES[selectedTest.vendorId]?.name}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedTest(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form id="grading-form" onSubmit={handleSubmitGrade} className="space-y-4 text-xs font-semibold">
                  {/* Test reference details */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-bg-dark border border-slate-200/20 dark:border-white/5 rounded-xl text-slate-500">
                    <div>
                      <span className="block text-[10px]">Project ID:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{selectedTest.projectNumber}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] flex items-center gap-0.5">
                        <LinkIcon className="w-3 h-3 text-slate-400" />
                        Assignment Link:
                      </span>
                      <a href={selectedTest.assignmentLink} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold truncate block">
                        Open Translation Test
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
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
