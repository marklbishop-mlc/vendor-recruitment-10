import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import type { UserRole } from '../types';
import { Sparkles, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

export const Login: React.FC = () => {
  const { loginWithGoogle, loginAsMock } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-900">
      {/* Premium backdrop gradients */}
      <div className="absolute top-[-25%] left-[-25%] w-[70%] h-[70%] rounded-full bg-primary/20 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-25%] right-[-25%] w-[70%] h-[70%] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md p-6 relative z-10 mx-4"
      >
        <div className="dark-glass p-8 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl space-y-8">
          <div className="text-center">
            <div className="mx-auto mb-5 max-w-[280px]">
              <img src="/logo_full.png" alt="Multilingual Connections" className="w-full object-contain filter brightness-0 invert" />
            </div>
            <p className="text-slate-400 mt-1 text-sm font-light">Vendor Onboarding & Pipeline Manager</p>
          </div>

          <div className="space-y-6">
            {/* Primary Google Login */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={loginWithGoogle}
                className="w-full py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer shadow-lg shadow-white/5 active:scale-[0.99]"
              >
                {/* Google Icon SVG */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.69c-.29 1.5-.1.14 1.14 2.1l3.9-3c2.3-2.1 3.6-5.2 3.6-8.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.9-3c-1.08.72-2.48 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96l-4.04 3.12C3.17 21.83 7.23 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.27 14.29A7.18 7.18 0 0 1 4.8 12c0-.8.16-1.57.47-2.29L1.23 6.59C.44 8.21 0 10.05 0 12c0 1.95.44 3.79 1.23 5.41l4.04-3.12z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 7.23 0 3.17 2.17 1.23 5.41l4.04 3.12c.95-2.85 3.6-4.96 6.73-4.96z"
                  />
                </svg>
                Sign In with Google
              </button>
              <p className="text-[10px] text-center text-slate-500 font-light">
                Secure internal access restricted to Google Workspace corporate credentials.
              </p>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-white/5 w-full"></div>
              <span className="absolute bg-[#121624] px-4 text-slate-500 text-xs tracking-wider uppercase font-semibold">
                OR
              </span>
            </div>

            {/* Developer Simulation Section */}
            <div className="space-y-4 bg-white/5 rounded-2xl p-5 border border-white/5">
              <div className="flex items-center gap-2 text-slate-300">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider">Evaluation Simulator</span>
              </div>
              
              <div className="space-y-2.5">
                <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-white/5">
                  {(['admin', 'manager', 'user'] as UserRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition-all capitalize ${
                        selectedRole === role
                          ? 'bg-primary text-white shadow-md shadow-primary/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {role === 'user' ? 'PM (User)' : role}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => loginAsMock(selectedRole)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer border border-white/5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Launch Simulator
                </button>
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-600 space-y-1">
            <div>Target DB: <code className="text-primary/75 font-mono">mlc-vendor-recruitment-db</code></div>
            <div>Mark's seeded admin account: <span className="text-slate-400 font-mono">mark@mlconnections.com</span></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
