import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { DashboardLayout } from './components/DashboardLayout';
import { Login } from './screens/Login';
import { Dashboard } from './screens/Dashboard';
import { VendorDirectory } from './screens/VendorDirectory';
import { TestingPortal } from './screens/TestingPortal';
import { Templates } from './screens/Templates';
import { UserManagement } from './screens/UserManagement';
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
        {(['admin', 'manager', 'user'] as const).map((role) => (
          <button
            key={role}
            onClick={() => switchRole(role)}
            className={`py-1 px-2.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
              user.role === role
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {role === 'user' ? 'PM (User)' : role}
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
        {/* Public Login Route - Redirects to dashboard if already logged in */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" replace /> : <Login />} 
        />

        {/* Access Denied Route */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected System Layout Wrapping all routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Index dashboard funnel view */}
          <Route index element={<Dashboard />} />
          
          {/* Approved PM Directory */}
          <Route path="directory" element={<VendorDirectory />} />
          
          {/* Testing/Grading Portal (Manager and Admin only) */}
          <Route 
            path="testing" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <TestingPortal />
              </ProtectedRoute>
            } 
          />
          
          {/* Template Manager (Admin only) */}
          <Route 
            path="templates" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Templates />
              </ProtectedRoute>
            } 
          />
          
          {/* User Role Management (Admin only) */}
          <Route 
            path="users" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            } 
          />
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Floating Developer Tools role switcher for mock testing */}
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
