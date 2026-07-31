import React, { useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import type { VendorProfile, VendorStatus } from '../types';
import { 
  Users, UserCheck, Inbox, Plus, Search, Filter, 
  LogOut, ShieldAlert, Sparkles, CheckCircle2, XCircle, Clock, X, Globe, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock initial data
const INITIAL_VENDORS: VendorProfile[] = [
  {
    id: 'vendor-1',
    companyName: 'Apex Translations LLC',
    contactName: 'Carlos Santillan',
    email: 'carlos@apextrans.com',
    phone: '+1 (555) 123-4567',
    status: 'approved',
    services: ['Translation', 'Localization'],
    languages: ['Spanish', 'English'],
    hourlyRate: 45,
    rating: 4.8,
    submittedAt: '2026-07-20T10:00:00Z',
    updatedAt: '2026-07-20T10:00:00Z'
  },
  {
    id: 'vendor-2',
    companyName: 'LingoGlobe',
    contactName: 'Hana Tanaka',
    email: 'hana@lingoglobe.jp',
    phone: '+81 3 1234 5678',
    status: 'pending',
    services: ['Interpretation', 'Subtitling'],
    languages: ['Japanese', 'English'],
    hourlyRate: 60,
    submittedAt: '2026-07-28T14:30:00Z',
    updatedAt: '2026-07-28T14:30:00Z'
  },
  {
    id: 'vendor-3',
    companyName: 'Nordic Words',
    contactName: 'Freja Lindstrom',
    email: 'freja@nordicwords.se',
    phone: '+46 8 123 45 67',
    status: 'pending',
    services: ['Translation', 'Proofreading'],
    languages: ['Swedish', 'Danish', 'English'],
    hourlyRate: 50,
    submittedAt: '2026-07-30T09:15:00Z',
    updatedAt: '2026-07-30T09:15:00Z'
  },
  {
    id: 'vendor-4',
    companyName: 'Global Voice Inc.',
    contactName: 'Amara Diop',
    email: 'amara@globalvoice.sn',
    phone: '+221 33 123 45 67',
    status: 'rejected',
    services: ['Transcription'],
    languages: ['Wolof', 'French'],
    hourlyRate: 35,
    submittedAt: '2026-07-15T08:00:00Z',
    updatedAt: '2026-07-18T16:00:00Z'
  }
];

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [vendors, setVendors] = useState<VendorProfile[]>(INITIAL_VENDORS);
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Drawer Panel State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Form State for Adding Vendor
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hourlyRate, setHourlyRate] = useState('40');
  const [services, setServices] = useState('');
  const [languages, setLanguages] = useState('');

  // Handle Approve/Reject
  const handleStatusChange = (vendorId: string, newStatus: VendorStatus) => {
    setVendors((prev) => 
      prev.map((v) => 
        v.id === vendorId 
          ? { ...v, status: newStatus, updatedAt: new Date().toISOString() } 
          : v
      )
    );
  };

  // Submit vendor form
  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    const newVendor: VendorProfile = {
      id: `vendor-${Date.now()}`,
      companyName,
      contactName,
      email,
      phone,
      status: 'pending',
      services: services.split(',').map((s) => s.trim()).filter(Boolean),
      languages: languages.split(',').map((l) => l.trim()).filter(Boolean),
      hourlyRate: parseFloat(hourlyRate) || 0,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setVendors((prev) => [newVendor, ...prev]);
    setIsDrawerOpen(false);

    // Reset Form
    setCompanyName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setHourlyRate('40');
    setServices('');
    setLanguages('');
  };

  // Memoized Filtered List
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchesSearch = 
        v.companyName.toLowerCase().includes(search.toLowerCase()) ||
        v.contactName.toLowerCase().includes(search.toLowerCase()) ||
        v.languages.some((l) => l.toLowerCase().includes(search.toLowerCase())) ||
        v.services.some((s) => s.toLowerCase().includes(search.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [vendors, search, statusFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    return {
      total: vendors.length,
      approved: vendors.filter((v) => v.status === 'approved').length,
      pending: vendors.filter((v) => v.status === 'pending').length,
    };
  }, [vendors]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-bg-dark text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-300">
      {/* Premium Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-bg-dark/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-border-dark px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20 text-white">
            <Globe className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-900 dark:text-white leading-none block">MLC Developments</span>
            <span className="text-xs text-primary font-medium tracking-widest uppercase">Recruitment Manager</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="font-semibold text-sm text-slate-900 dark:text-white block">{user?.displayName}</span>
            <span className="text-xs font-medium text-slate-500 capitalize dark:text-slate-400">{user?.role} Portal</span>
          </div>
          
          <button
            onClick={logout}
            className="flex items-center justify-center p-2.5 rounded-xl border border-slate-200 dark:border-border-dark text-slate-500 hover:text-red-500 hover:bg-red-500/5 transition-all cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Dashboard Panel */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
        
        {/* Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary to-indigo-600 text-white p-6 md:p-8 shadow-xl shadow-primary/10">
          <div className="absolute top-0 right-0 w-[30%] h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-white/5 to-transparent pointer-events-none"></div>
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur">
              <Sparkles className="w-3.5 h-3.5" />
              Connected Target: mlc-vendor-recruitment-db
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Welcome back, {user?.displayName?.split(' ')[0]}!
            </h1>
            <p className="text-white/80 max-w-xl text-sm md:text-base font-light">
              Manage your global localization partners, track application workflow, and configure isolated databases.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass dark:dark-glass p-6 rounded-2xl border border-slate-200/50 dark:border-white/10 flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Partners</p>
              <h3 className="text-3xl font-extrabold text-slate-950 dark:text-white">{stats.total}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
          
          <div className="glass dark:dark-glass p-6 rounded-2xl border border-slate-200/50 dark:border-white/10 flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Approved Partners</p>
              <h3 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.approved}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
          
          <div className="glass dark:dark-glass p-6 rounded-2xl border border-slate-200/50 dark:border-white/10 flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Reviews</p>
              <h3 className="text-3xl font-extrabold text-amber-500 dark:text-amber-400">{stats.pending}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Inbox className="w-6 h-6" />
            </div>
          </div>
        </section>

        {/* Toolbar (Search / Filters / CTA) */}
        <section className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white dark:bg-card-dark p-4 rounded-2xl border border-slate-200/50 dark:border-border-dark shadow-sm">
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by contact, company, language..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
              />
            </div>
            
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-3 pr-8 py-2 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white appearance-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
              <Filter className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* CTA Button to open panel */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="py-2.5 px-5 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl flex items-center justify-center gap-2 btn-animate shadow-md shadow-primary/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Register Partner
          </button>
        </section>

        {/* Vendors Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredVendors.length > 0 ? (
              filteredVendors.map((vendor) => (
                <motion.div
                  key={vendor.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass dark:dark-glass rounded-2xl border border-slate-200/50 dark:border-white/10 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden"
                >
                  {/* Decorative badge corner */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-lg text-slate-900 dark:text-white">{vendor.companyName}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <User className="w-3.5 h-3.5" />
                          {vendor.contactName}
                        </p>
                      </div>

                      {/* Status pill badge */}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                        vendor.status === 'approved' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                          : vendor.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                      }`}>
                        {vendor.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {vendor.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                        {vendor.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                        {vendor.status}
                      </span>
                    </div>

                    {/* Services and Languages tags */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {vendor.services.map((s, idx) => (
                          <span key={idx} className="text-xs bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-0.5 px-2.5 rounded-md">
                            {s}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {vendor.languages.map((l, idx) => (
                          <span key={idx} className="text-xs bg-primary/10 text-primary py-0.5 px-2.5 rounded-md font-medium">
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pricing, email details and approval CTA buttons */}
                  <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">Target Rate</span>
                      <span className="font-bold text-slate-900 dark:text-white">${vendor.hourlyRate}/hr</span>
                    </div>

                    {/* Conditional evaluation options (Recruiter/Admin only) */}
                    {(user?.role === 'admin' || user?.role === 'recruiter') && vendor.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStatusChange(vendor.id, 'rejected')}
                          className="py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold rounded-lg btn-animate cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleStatusChange(vendor.id, 'approved')}
                          className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg btn-animate cursor-pointer"
                        >
                          Approve Partner
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        Updated {new Date(vendor.updatedAt || vendor.submittedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center text-slate-400">
                <ShieldAlert className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h4 className="font-semibold text-lg text-slate-700 dark:text-slate-300">No results found</h4>
                <p className="text-sm mt-1">Try adjusting your filters or search terms.</p>
              </div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Slide-out Drawer Panel using Framer Motion */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Dark blur backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
            ></motion.div>

            {/* Sidebar drawer card */}
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
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Register localization partner</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Add partner profile to mlc-vendor-recruitment-db</p>
                  </div>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddVendor} id="add-vendor-form" className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Company Name</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Translation Pros LLC"
                      className="w-full p-2.5 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact Person</label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Carlos Santillan"
                      className="w-full p-2.5 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contact@email.com"
                        className="w-full p-2.5 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone</label>
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 555-1234"
                        className="w-full p-2.5 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hourly Rate ($)</label>
                      <input
                        type="number"
                        required
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        className="w-full p-2.5 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Services (comma separated)</label>
                    <input
                      type="text"
                      required
                      value={services}
                      onChange={(e) => setServices(e.target.value)}
                      placeholder="e.g. Translation, Subtitling, Interpretation"
                      className="w-full p-2.5 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Languages (comma separated)</label>
                    <input
                      type="text"
                      required
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value)}
                      placeholder="e.g. Spanish, German, Mandarin"
                      className="w-full p-2.5 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                    />
                  </div>
                </form>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-border-dark text-slate-500 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 btn-animate cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="add-vendor-form"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl btn-animate cursor-pointer"
                >
                  Submit Application
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
