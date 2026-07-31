import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import type { UserProfile, UserRole, AuditLog } from '../types';
import { Shield, Search, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock users list matching roles
const INITIAL_USERS: UserProfile[] = [
  {
    uid: 'mock-admin-mark',
    email: 'mark@mlconnections.com',
    displayName: 'Mark Bishop',
    role: 'admin',
    createdAt: '2026-07-01T08:00:00Z',
    updatedAt: '2026-07-01T08:00:00Z'
  },
  {
    uid: 'mock-manager-sarah',
    email: 'sarah.recruiter@mlconnections.com',
    displayName: 'Sarah Jenkins',
    role: 'manager',
    createdAt: '2026-07-10T14:30:00Z',
    updatedAt: '2026-07-28T10:00:00Z'
  },
  {
    uid: 'mock-user-basic',
    email: 'read.only@mlconnections.com',
    displayName: 'PM Reader (User)',
    role: 'user',
    createdAt: '2026-07-15T09:00:00Z',
    updatedAt: '2026-07-15T09:00:00Z'
  }
];

const INITIAL_AUDITS: AuditLog[] = [
  {
    id: 'a-1',
    actorId: 'mock-admin-mark',
    actorName: 'Mark Bishop',
    action: 'ROLE_UPDATE',
    targetId: 'mock-manager-sarah',
    timestamp: '2026-07-28T10:00:00Z',
    details: 'Changed role of Sarah Jenkins from user to manager'
  }
];

export const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState<UserProfile[]>(INITIAL_USERS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDITS);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Filter list
  const filteredUsers = usersList.filter((u) => 
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChange = (targetUid: string, newRole: UserRole) => {
    if (!user) return;

    setUsersList((prev) => 
      prev.map((u) => {
        if (u.uid !== targetUid) return u;
        
        // Log the change
        const log: AuditLog = {
          id: `log-${Date.now()}`,
          actorId: user.uid,
          actorName: user.displayName,
          action: 'ROLE_UPDATE',
          targetId: targetUid,
          timestamp: new Date().toISOString(),
          details: `Changed role of ${u.displayName} from ${u.role} to ${newRole}`
        };
        setAuditLogs((audits) => [log, ...audits]);

        return { ...u, role: newRole, updatedAt: new Date().toISOString() };
      })
    );

    // Update detailed view modal if open
    setSelectedUser((prev) => {
      if (!prev || prev.uid !== targetUid) return prev;
      return { ...prev, role: newRole, updatedAt: new Date().toISOString() };
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">User Role Management</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
          Change staff role permissions, search user registry, and review security audit logs.
        </p>
      </div>

      {/* Toolbar */}
      <section className="bg-white dark:bg-card-dark p-4 rounded-2xl border border-slate-200/50 dark:border-border-dark shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
          />
        </div>
      </section>

      {/* Users table */}
      <section className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-bg-dark text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/50 dark:border-border-dark">
                <th className="p-4 pl-6">Display Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Assigned Role</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
              {filteredUsers.map((u) => (
                <tr key={u.uid} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                  <td className="p-4 pl-6 font-bold text-slate-900 dark:text-white">{u.displayName}</td>
                  <td className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400">{u.email}</td>
                  <td className="p-4">
                    {/* Role dropdown */}
                    <div className="relative inline-block">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                        disabled={u.email === 'mark@mlconnections.com'} // Lock seeded admin
                        className="pl-2 pr-8 py-1 bg-slate-100 dark:bg-slate-800 text-xs font-semibold rounded-lg focus:outline-none focus:ring-1 focus:ring-primary border border-transparent dark:text-white disabled:opacity-50 appearance-none cursor-pointer capitalize"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="user">User (Basic)</option>
                      </select>
                      <Shield className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </td>
                  <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="py-1 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-lg btn-animate cursor-pointer dark:text-white"
                    >
                      Audit Trail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audit Log Trail */}
      <section className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm p-6 space-y-4">
        <h4 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
          <Clock className="w-5 h-5 text-primary" />
          Security Access Audit Logs
        </h4>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
          {auditLogs.length > 0 ? (
            auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-50 dark:bg-bg-dark rounded-xl border border-slate-200/20 dark:border-border-dark flex items-start justify-between gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{log.actorName}</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{log.details}</p>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()} - {new Date(log.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-slate-400 text-sm">
              No audit events recorded.
            </div>
          )}
        </div>
      </section>

      {/* Drawer: Detailed User Card */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
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
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedUser.displayName}</h3>
                    <p className="text-xs text-slate-500 mt-1">Staff Access Credentials Profile</p>
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 cursor-pointer">
                    <Clock className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="bg-slate-50 dark:bg-bg-dark rounded-xl p-4 border border-slate-200/20 dark:border-white/5 space-y-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Role Permissions</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/10 uppercase">
                      {selectedUser.role}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Google Email Account:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{selectedUser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Document Created:</span>
                      <span>{new Date(selectedUser.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Permissions Last Synced:</span>
                      <span>{new Date(selectedUser.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl btn-animate cursor-pointer"
                >
                  Close User Details
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
