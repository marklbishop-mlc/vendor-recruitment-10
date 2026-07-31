import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import type { UserRole } from '../types';
import { Mail, Lock, Shield, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(selectedRole);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-900">
      {/* Decorative premium gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md p-8 relative z-10 mx-4"
      >
        <div className="dark-glass p-8 rounded-2xl border border-white/10 backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">MLC Developments</h1>
            <p className="text-slate-400 mt-2 text-sm">Vendor Recruitment Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Simulation Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Select Simulation Role
              </label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-850/50 rounded-xl border border-white/5">
                {(['admin', 'recruiter', 'vendor'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`py-2 px-3 text-xs font-medium rounded-lg transition-all capitalize ${
                      selectedRole === role
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl flex items-center justify-center gap-2 btn-animate cursor-pointer shadow-lg shadow-primary/10"
            >
              Sign In to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-slate-500">
            Secure target database: <code className="text-primary/75 px-1 py-0.5 rounded bg-white/5">mlc-vendor-recruitment-db</code>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
