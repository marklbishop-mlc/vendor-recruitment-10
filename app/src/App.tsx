import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { Login } from './screens/Login';
import { Dashboard } from './screens/Dashboard';
import { Unauthorized } from './screens/Unauthorized';
import { RefreshCw } from 'lucide-react';

const DevRoleSwitcher: React.FC = () => {
  const { user, isMockMode, switchRole } = useAuth();

  if (!user || !isMockMode) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 shadow-2xl text-white">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold px-1">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
        <span>Dev Switch:</span>
      </div>
      <div className="flex gap-1.5">
        {(['admin', 'recruiter', 'vendor'] as const).map((role) => (
          <button
            key={role}
            onClick={() => switchRole(role)}
            className={`py-1 px-2.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
              user.role === role
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {role}
          </button>
        ))}
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route - Redirects to home if already logged in */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" replace /> : <Login />} 
        />

        {/* Access Denied Route */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Dashboard Route */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Floating Developer Tools role toggler */}
      <DevRoleSwitcher />
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
