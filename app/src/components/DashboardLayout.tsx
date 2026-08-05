import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { 
  BarChart2, BookOpen, Users, Mail, Compass, 
  ShieldCheck, LogOut, Menu, X, Sparkles, Settings, Sliders, ChevronDown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const DashboardLayout: React.FC = () => {
  const { user, logout, isMockMode, syncError } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [emailTestingConfig, setEmailTestingConfig] = React.useState<{ enabled: boolean; mode?: 'intercept' | 'send_to_admin' }>({ enabled: false, mode: 'send_to_admin' });

  const adminPaths = ['/templates', '/users', '/settings', '/notifications'];
  const isAdminActive = adminPaths.includes(location.pathname);
  const [isAdminOpen, setIsAdminOpen] = React.useState(isAdminActive);

  React.useEffect(() => {
    if (isAdminActive) setIsAdminOpen(true);
  }, [location.pathname, isAdminActive]);

  React.useEffect(() => {
    const checkMode = () => {
      const saved = localStorage.getItem('mlc_settings_testing_mode');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setEmailTestingConfig({ enabled: !!parsed.enabled, mode: parsed.mode || 'send_to_admin' });
        } catch {}
      }
    };
    checkMode();

    const syncConfig = async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const snap = await getDoc(doc(db, 'settings', 'global_config'));
        if (snap.exists()) {
          const config = snap.data();
          if (config?.testingMode) {
            setEmailTestingConfig({ enabled: !!config.testingMode.enabled, mode: config.testingMode.mode || 'send_to_admin' });
            localStorage.setItem('mlc_settings_testing_mode', JSON.stringify(config.testingMode));
          } else {
            setEmailTestingConfig({ enabled: false, mode: 'send_to_admin' });
            localStorage.setItem('mlc_settings_testing_mode', JSON.stringify({ enabled: false, mode: 'send_to_admin', recipientEmails: [] }));
          }
        }
      } catch (err) {
        console.warn("Failed to check testing mode in layout", err);
      }
    };
    syncConfig();

    window.addEventListener('mlc-settings-saved', checkMode);
    return () => window.removeEventListener('mlc-settings-saved', checkMode);
  }, [location.pathname]);

  const primaryNavItems = [
    { name: 'Funnel Dashboard', path: '/', icon: BarChart2, roles: ['admin', 'manager', 'user'] },
    { name: 'Linguist Directory', path: '/directory', icon: Compass, roles: ['admin', 'manager', 'user'] },
    { name: 'Grading Portal', path: '/testing', icon: BookOpen, roles: ['admin', 'manager'] },
    { name: 'Reports', path: '/reports', icon: BarChart2, roles: ['admin', 'manager', 'user'] },
    { name: 'Portal Modules & Guides', path: '/modules', icon: Sparkles, roles: ['admin', 'manager', 'user'] },
  ];

  const adminNavItems = [
    { name: 'Template Manager', path: '/templates', icon: Mail, roles: ['admin'] },
    { name: 'User Management', path: '/users', icon: Users, roles: ['admin'] },
    { name: 'System Settings', path: '/settings', icon: Settings, roles: ['admin'] },
    { name: 'Notification Queue Log', path: '/notifications', icon: Mail, roles: ['admin'] },
  ];

  const visiblePrimaryItems = primaryNavItems.filter((item) => user && item.roles.includes(user.role));
  const visibleAdminItems = adminNavItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-bg-dark text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Sidebar - Desktop Layout */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/50 dark:border-border-dark bg-white dark:bg-card-dark transition-all duration-300">
        {/* Logo and Head */}
        <div className="px-6 py-4.5 border-b border-slate-200/50 dark:border-border-dark flex items-center gap-3">
          <img src="/logomark.png" alt="Multilingual Connections Logo" className="w-9 h-9 object-contain" />
          <div>
            <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-none block">MLC Onboarding</span>
            <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Linguist Onboarding</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {visiblePrimaryItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-150 group ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                }`} />
                {item.name}
              </Link>
            );
          })}

          {/* Administration Collapsible Dropdown */}
          {visibleAdminItems.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsAdminOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-150 cursor-pointer ${
                  isAdminActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sliders className={`w-4 h-4 ${isAdminActive ? 'text-primary' : 'text-slate-400'}`} />
                  <span>Administration</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isAdminOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isAdminOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pl-4 pt-1 space-y-1 overflow-hidden"
                  >
                    {visibleAdminItems.map((item) => {
                      const isActive = location.pathname === item.path;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150 group ${
                            isActive
                              ? 'bg-primary text-white shadow-sm shadow-primary/20 font-bold'
                              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          {item.name}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </nav>

        {/* Profile Card & Logout */}
        <div className="p-4 border-t border-slate-200/50 dark:border-border-dark space-y-4">
          <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-bg-dark rounded-xl border border-slate-200/20 dark:border-border-dark">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-sm uppercase">
              {user?.displayName.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                {user?.displayName}
              </span>
              <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/10">
                <ShieldCheck className="w-2.5 h-2.5" />
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-red-500/10 hover:text-red-500 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 btn-animate cursor-pointer border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden bg-white dark:bg-card-dark border-b border-slate-200/50 dark:border-border-dark px-6 py-4 flex items-center justify-between z-30">
          <div className="flex items-center gap-2">
            <img src="/logomark.png" alt="Logo" className="w-7 h-7 object-contain" />
            <span className="font-extrabold text-sm text-slate-900 dark:text-white">MLC Onboarding</span>
          </div>
          <button
            onClick={() => setIsMobileOpen((prev) => !prev)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile Navigation Dropdown Menu */}
        <AnimatePresence>
          {isMobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden bg-white dark:bg-card-dark border-b border-slate-200/50 dark:border-border-dark absolute top-[65px] left-0 right-0 z-20 overflow-hidden shadow-xl"
            >
              <div className="px-6 py-4 space-y-1.5">
                {[...visiblePrimaryItems, ...visibleAdminItems].map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}
                <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">{user?.displayName}</span>
                    <span className="text-[10px] text-primary uppercase font-bold px-1.5 bg-primary/10 rounded-full">{user?.role}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Outlet Main Content Container */}
        <div className="flex-1 overflow-y-auto relative">
          
          {/* Email Testing Mode warning banner */}
          {emailTestingConfig.enabled && (
            <div className={`border-b text-white text-xs px-6 py-2.5 font-bold flex items-center justify-center gap-2 select-none shadow-sm ${
              emailTestingConfig.mode === 'intercept' 
                ? 'bg-purple-600 border-purple-700' 
                : 'bg-rose-600 border-rose-700'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              {emailTestingConfig.mode === 'intercept' ? (
                <span>🛡️ SYSTEM EMAIL TESTING MODE ACTIVE (INTERCEPT): All trigger emails are logged only and NOT sent via SMTP.</span>
              ) : (
                <span>⚠️ SYSTEM EMAIL TESTING MODE ACTIVE (ADMIN DISPATCH): All trigger emails are redirected to administrators.</span>
              )}
            </div>
          )}

          {/* Mock Database warning banner */}
          {isMockMode && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs px-6 py-2.5 font-semibold flex items-center justify-between gap-4 select-none">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                <span>Running in local simulation mode. Firestore connection bypassed or failed; data writes save in-memory only.{syncError && ` (Reason: ${syncError})`}</span>
              </div>
            </div>
          )}

          <div className="p-6 md:p-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};
