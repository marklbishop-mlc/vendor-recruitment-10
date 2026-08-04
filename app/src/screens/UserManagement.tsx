import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import type { UserProfile, UserRole, AuditLog } from '../types';
import { Shield, Search, Clock, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Mock users list matching roles to seed if DB is empty
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
  const { user, loading } = useAuth();
  const [usersList, setUsersList] = useState<UserProfile[]>(INITIAL_USERS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDITS);
  const [search, setSearch] = useState('');
  
  // Drawer & Modal control states
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  
  // Add/Edit Form states
  const [targetUid, setTargetUid] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('user');

  // Load staff registries and security logs from Firestore
  useEffect(() => {
    if (loading) return;

    const loadData = async () => {
      try {
        // 1. Fetch Users
        const usersSnap = await getDocs(collection(db, 'users'));
        const uList: UserProfile[] = [];
        usersSnap.forEach((d) => {
          uList.push(d.data() as UserProfile);
        });

        if (uList.length > 0) {
          setUsersList(uList);
        } else {
          // Seed initial users if empty
          for (const u of INITIAL_USERS) {
            await setDoc(doc(db, 'users', u.uid), u);
          }
          setUsersList(INITIAL_USERS);
        }

        // 2. Fetch Audit Logs
        const auditsSnap = await getDocs(collection(db, 'audit_logs'));
        const aList: AuditLog[] = [];
        auditsSnap.forEach((d) => {
          aList.push(d.data() as AuditLog);
        });

        if (aList.length > 0) {
          // Sort audits newest first
          aList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setAuditLogs(aList);
        } else {
          // Seed default audit log
          for (const a of INITIAL_AUDITS) {
            await setDoc(doc(db, 'audit_logs', a.id), a);
          }
          setAuditLogs(INITIAL_AUDITS);
        }
      } catch (err) {
        console.error("Failed to fetch staff directories from Firestore", err);
      }
    };
    loadData();
  }, [loading, user]);

  // Filter list
  const filteredUsers = usersList.filter((u) => 
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAddModal = () => {
    setModalMode('add');
    setTargetUid(`user-${Date.now()}`);
    setDisplayName('');
    setEmail('');
    setRole('user');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: UserProfile) => {
    setModalMode('edit');
    setTargetUid(u.uid);
    setDisplayName(u.displayName);
    setEmail(u.email);
    setRole(u.role);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim()) return;

    const isEdit = modalMode === 'edit';
    const timestamp = new Date().toISOString();
    const currentActor = user || { uid: 'system', displayName: 'System Administrator' };

    const originalUser = usersList.find((u) => u.uid === targetUid);
    
    const userProfile: UserProfile = {
      uid: targetUid,
      displayName: displayName.trim(),
      email: email.trim().toLowerCase(),
      role,
      createdAt: originalUser ? originalUser.createdAt : timestamp,
      updatedAt: timestamp
    };

    // Prepare details for audit trail
    let details = `Created staff user account for ${displayName} with role ${role}`;
    if (isEdit && originalUser) {
      const changes: string[] = [];
      if (originalUser.displayName !== displayName) changes.push(`name to "${displayName}"`);
      if (originalUser.email !== email) changes.push(`email to "${email}"`);
      if (originalUser.role !== role) changes.push(`role to "${role}"`);
      details = `Updated staff user profile of ${originalUser.displayName}: ${changes.join(', ') || 'no changes'}`;
    }

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      actorId: currentActor.uid,
      actorName: currentActor.displayName,
      action: isEdit ? 'ROLE_UPDATE' : 'USER_CREATE',
      targetId: targetUid,
      timestamp,
      details
    };

    try {
      // Write user to cloud db
      await setDoc(doc(db, 'users', targetUid), userProfile);
      
      // Write audit log to cloud db
      await setDoc(doc(db, 'audit_logs', log.id), log);

      // Update state locally
      setUsersList((prev) => {
        if (isEdit) {
          return prev.map((u) => u.uid === targetUid ? userProfile : u);
        } else {
          return [...prev, userProfile];
        }
      });

      setAuditLogs((prev) => [log, ...prev]);
      setIsModalOpen(false);
      alert(isEdit ? `Changes saved successfully for user "${displayName}".` : `Staff user account "${displayName}" created successfully.`);
    } catch (err) {
      console.error("Failed to commit user profile write to Firestore", err);
      alert("Failed to save staff user: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRoleChangeDirect = async (targetUid: string, newRole: UserRole) => {
    const targetUser = usersList.find((u) => u.uid === targetUid);
    if (!targetUser) return;

    const timestamp = new Date().toISOString();
    const currentActor = user || { uid: 'system', displayName: 'System Administrator' };

    const updatedUser: UserProfile = {
      ...targetUser,
      role: newRole,
      updatedAt: timestamp
    };

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      actorId: currentActor.uid,
      actorName: currentActor.displayName,
      action: 'ROLE_UPDATE',
      targetId: targetUid,
      timestamp,
      details: `Changed role of ${targetUser.displayName} from ${targetUser.role} to ${newRole}`
    };

    try {
      await setDoc(doc(db, 'users', targetUid), updatedUser);
      await setDoc(doc(db, 'audit_logs', log.id), log);

      setUsersList((prev) => prev.map((u) => u.uid === targetUid ? updatedUser : u));
      setAuditLogs((prev) => [log, ...prev]);
      
      // Update selected drawer view if active
      setSelectedUser((prev) => {
        if (!prev || prev.uid !== targetUid) return prev;
        return updatedUser;
      });
      alert(`User role for "${targetUser.displayName}" changed to "${newRole}" successfully.`);
    } catch (err) {
      console.error("Failed to update user role", err);
      alert("Failed to update role: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteUser = async (targetUser: UserProfile) => {
    if (targetUser.email === 'mark@mlconnections.com') {
      alert("The main system admin account cannot be deleted.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the staff user account for "${targetUser.displayName}"? This action cannot be undone.`)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const currentActor = user || { uid: 'system', displayName: 'System Administrator' };

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      actorId: currentActor.uid,
      actorName: currentActor.displayName,
      action: 'ROLE_UPDATE',
      targetId: targetUser.uid,
      timestamp,
      details: `Deleted staff user account for ${targetUser.displayName} (${targetUser.email})`
    };

    try {
      await deleteDoc(doc(db, 'users', targetUser.uid));
      await setDoc(doc(db, 'audit_logs', log.id), log);

      setUsersList((prev) => prev.filter((u) => u.uid !== targetUser.uid));
      setAuditLogs((prev) => [log, ...prev]);

      if (selectedUser?.uid === targetUser.uid) {
        setSelectedUser(null);
      }

      alert(`Successfully deleted staff user account "${targetUser.displayName}".`);
    } catch (err) {
      console.error("Failed to delete user profile from Firestore", err);
      alert("Failed to delete user: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">User Registry & Permissions</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
          Add/edit staff details, change role permissions, and review security access audit logs.
        </p>
      </div>

      {/* Toolbar */}
      <section className="bg-white dark:bg-card-dark p-4 rounded-2xl border border-slate-200/50 dark:border-border-dark shadow-sm flex items-center justify-between gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
          />
        </div>
        <button
          onClick={handleOpenAddModal}
          className="py-2.5 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-xs flex items-center gap-1.5 btn-animate cursor-pointer shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
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
                        onChange={(e) => handleRoleChangeDirect(u.uid, e.target.value as UserRole)}
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
                  <td className="p-4 pr-6 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(u)}
                      className="py-1 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-lg btn-animate cursor-pointer dark:text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="py-1 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-lg btn-animate cursor-pointer dark:text-white"
                    >
                      Logs
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u)}
                      disabled={u.email === 'mark@mlconnections.com'} // Lock seeded admin
                      className="py-1 px-3 border border-rose-250 dark:border-rose-900/35 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-bold rounded-lg btn-animate cursor-pointer disabled:opacity-50"
                    >
                      Delete
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

      {/* Add / Edit User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 m-auto z-50 w-full max-w-md h-fit bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-border-dark p-6 shadow-2xl space-y-6 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {modalMode === 'edit' ? 'Edit Staff User Account' : 'Register New Staff User'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-bold text-slate-600 dark:text-slate-350">
                <div className="space-y-1">
                  <label className="block uppercase tracking-wider text-[10px]">Staff Full Name</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block uppercase tracking-wider text-[10px]">Staff Google Account Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. sarah@mlconnections.com"
                    className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white disabled:opacity-50"
                    disabled={modalMode === 'edit'} // Lock email on edit
                  />
                </div>

                <div className="space-y-1">
                  <label className="block uppercase tracking-wider text-[10px]">Security Permissions Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary transition-all dark:text-white cursor-pointer font-bold capitalize"
                  >
                    <option value="admin">Admin (Full System Controls)</option>
                    <option value="manager">Manager (Recruiter Workspace)</option>
                    <option value="user">User (Read-only Directory)</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl btn-animate cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl btn-animate cursor-pointer shadow-md shadow-primary/20"
                  >
                    {modalMode === 'edit' ? 'Save Changes' : 'Create Account'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                    <X className="w-5 h-5 text-slate-400" />
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
