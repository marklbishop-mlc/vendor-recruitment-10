import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Globe, Phone, Mail, Award, ChevronRight, MessageSquare, X, User
} from 'lucide-react';
import type { VendorProfile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

// Mock list of approved vendors specifically filtered for PM Directory
const APPROVED_VENDORS_MOCK: VendorProfile[] = [
  {
    id: 'approved-1',
    companyName: 'Apex Translations LLC',
    contactName: 'Carlos Santillan',
    email: 'carlos@apextrans.com',
    phone: '+1 (555) 123-4567',
    status: 'approved',
    category: 'active',
    stage: 'approved',
    services: ['Translation', 'Localization'],
    languages: ['Spanish -> English', 'English -> Spanish'],
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
    id: 'approved-2',
    companyName: 'EuroLoc Group',
    contactName: 'Elena Rostova',
    email: 'elena@euroloc.de',
    phone: '+49 30 9876543',
    status: 'approved',
    category: 'active',
    stage: 'approved',
    services: ['Translation', 'Subtitling', 'Interpretation'],
    languages: ['German -> English', 'English -> German', 'Russian -> German'],
    classificationTier: 2,
    source: 'xtrf',
    mlcHourlyRate: 55,
    adjustedRate: 50,
    confirmedRate: 52,
    isGmail: false,
    submittedAt: '2026-06-12T08:30:00Z',
    updatedAt: '2026-07-15T11:00:00Z'
  },
  {
    id: 'approved-3',
    companyName: 'East-West Lingua',
    contactName: 'Li Wei',
    email: 'li.wei@ewlingua.cn',
    phone: '+86 10 5551234',
    status: 'approved',
    category: 'active',
    stage: 'approved',
    services: ['Translation', 'Proofreading'],
    languages: ['Mandarin -> English', 'English -> Mandarin'],
    classificationTier: 1,
    source: 'external',
    mlcHourlyRate: 50,
    adjustedRate: 45,
    confirmedRate: 48,
    isGmail: true,
    submittedAt: '2026-07-02T09:15:00Z',
    updatedAt: '2026-07-12T14:30:00Z'
  },
  {
    id: 'approved-4',
    companyName: 'Global Voices Ltd',
    contactName: 'Amara Diop',
    email: 'amara.diop@globalvoice.sn',
    phone: '+221 33 987 65 43',
    status: 'approved',
    category: 'active',
    stage: 'approved',
    services: ['Transcription', 'Proofreading'],
    languages: ['French -> English', 'Wolof -> French'],
    classificationTier: 3,
    source: 'xtrf',
    mlcHourlyRate: 35,
    adjustedRate: 30,
    confirmedRate: 32,
    isGmail: false,
    submittedAt: '2026-05-18T10:00:00Z',
    updatedAt: '2026-07-28T16:00:00Z'
  }
];

export const VendorDirectory: React.FC = () => {
  const [vendors] = useState<VendorProfile[]>(APPROVED_VENDORS_MOCK);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);

  // Filter approved directory
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchesSearch = 
        v.companyName.toLowerCase().includes(search.toLowerCase()) ||
        v.contactName.toLowerCase().includes(search.toLowerCase()) ||
        v.languages.some((l) => l.toLowerCase().includes(search.toLowerCase())) ||
        v.services.some((s) => s.toLowerCase().includes(search.toLowerCase()));

      const matchesTier = tierFilter === 'all' || v.classificationTier.toString() === tierFilter;

      return matchesSearch && matchesTier;
    });
  }, [vendors, search, tierFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">PM Approved Directory</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
          Browse vetted, compliance-ready localization partners and negotiated transaction rates.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <section className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white dark:bg-card-dark p-4 rounded-2xl border border-slate-200/50 dark:border-border-dark shadow-sm">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, service, language pair..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
            />
          </div>
          
          <div className="relative">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white appearance-none cursor-pointer"
            >
              <option value="all">All Tiers</option>
              <option value="1">Tier 1 (Highest Quality)</option>
              <option value="2">Tier 2 (Standard)</option>
              <option value="3">Tier 3 (Budget/Emerging)</option>
            </select>
            <Filter className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Directory Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredVendors.length > 0 ? (
            filteredVendors.map((vendor) => (
              <motion.div
                key={vendor.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass dark:dark-glass rounded-2xl border border-slate-200/50 dark:border-white/10 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1">{vendor.companyName}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{vendor.contactName}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      vendor.classificationTier === 1 
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                        : vendor.classificationTier === 2
                        ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}>
                      Tier {vendor.classificationTier}
                    </span>
                  </div>

                  {/* Languages and services tags */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {vendor.languages.slice(0, 3).map((l, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary py-0.5 px-2 rounded-md font-semibold">
                          <Globe className="w-2.5 h-2.5" />
                          {l}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {vendor.services.map((s, i) => (
                        <span key={i} className="text-[10px] bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-0.5 px-2 rounded-md">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Confirmed PM Rate</span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">${vendor.confirmedRate}/hr</span>
                  </div>

                  <button
                    onClick={() => setSelectedVendor(vendor)}
                    className="py-1.5 px-3 border border-slate-200 dark:border-border-dark text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1.5 btn-animate cursor-pointer"
                  >
                    View Details
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center text-slate-400">
              <Award className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h4 className="font-semibold text-lg text-slate-700 dark:text-slate-300">No approved vendors match</h4>
              <p className="text-xs mt-1">Try updating your language filters or search parameters.</p>
            </div>
          )}
        </AnimatePresence>
      </section>

      {/* Slide-out details modal */}
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
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedVendor.companyName}</h3>
                    <p className="text-xs text-primary font-semibold uppercase tracking-wider mt-0.5">Tier {selectedVendor.classificationTier} approved partner</p>
                  </div>
                  <button
                    onClick={() => setSelectedVendor(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-5 text-sm">
                  {/* Rates Card */}
                  <div className="bg-slate-50 dark:bg-bg-dark border border-slate-100 dark:border-white/5 rounded-2xl p-4 space-y-3">
                    <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Financial Rates Mapping</h5>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 border border-slate-200/40 dark:border-white/5 bg-white dark:bg-card-dark rounded-xl">
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-medium">MLC Hourly</span>
                        <span className="font-bold text-slate-800 dark:text-white">${selectedVendor.mlcHourlyRate}</span>
                      </div>
                      <div className="p-2 border border-slate-200/40 dark:border-white/5 bg-white dark:bg-card-dark rounded-xl">
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-medium">Offer Rate</span>
                        <span className="font-bold text-slate-800 dark:text-white">${selectedVendor.adjustedRate}</span>
                      </div>
                      <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl">
                        <span className="text-[9px] text-primary block font-extrabold uppercase">Confirmed</span>
                        <span className="font-extrabold text-primary">${selectedVendor.confirmedRate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vetted Languages & Services */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Services and Languages</h5>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-slate-500 block mb-1">Approved Languages:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedVendor.languages.map((l, i) => (
                            <span key={i} className="text-xs bg-primary/15 text-primary py-0.5 px-2.5 rounded-md font-semibold">
                              {l}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block mb-1">Services Offered:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedVendor.services.map((s, i) => (
                            <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-0.5 px-2.5 rounded-md font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
                    <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider font-semibold">Contact Cards</h5>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>Carlos Santillan (Primary Contact)</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <a href={`mailto:${selectedVendor.email}`} className="text-primary hover:underline">{selectedVendor.email}</a>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{selectedVendor.phone}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          Account type: {selectedVendor.isGmail ? 'Direct Google User (Gmail)' : 'External Domain Link'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Integration Metadata */}
                  <div className="bg-slate-50 dark:bg-bg-dark rounded-2xl p-4 border border-slate-100 dark:border-white/5 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span>Source Platform:</span>
                      <span className="font-bold capitalize">{selectedVendor.source} import</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status Database Date:</span>
                      <span>{new Date(selectedVendor.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                <button
                  onClick={() => setSelectedVendor(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl btn-animate cursor-pointer"
                >
                  Close Directory Details
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
