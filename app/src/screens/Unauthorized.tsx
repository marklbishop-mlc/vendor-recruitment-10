import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export const Unauthorized: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-bg-dark p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass dark:dark-glass p-8 rounded-2xl border border-slate-200/50 dark:border-white/10 text-center shadow-xl"
      >
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 text-red-500">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Denied</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
          You do not have the required permissions to view this section. Please contact your administrator if you believe this is an error.
        </p>

        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl btn-animate shadow-md shadow-primary/10 w-full"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </motion.div>
    </div>
  );
};
