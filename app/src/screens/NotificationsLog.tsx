import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mail, Shield, RefreshCw, Trash2, Eye, CheckCircle2, X
} from 'lucide-react';
import { collection, getDocs, doc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

export interface SystemNotificationRecord {
  id: string;
  vendorId: string;
  vendorName?: string;
  vendorEmail?: string;
  email?: string;
  actionName?: string;
  templateId?: string;
  templateName?: string;
  recipientType?: string;
  actualRecipients?: string[];
  isIntercepted?: boolean;
  status: 'sent' | 'intercepted' | 'pending' | 'failed' | 'queued';
  subject: string;
  body: string;
  error?: string;
  createdAt: string;
}

// Initial mock notifications if collection is empty
const INITIAL_MOCK_NOTIFICATIONS: SystemNotificationRecord[] = [
  {
    id: 'notif-demo-1',
    vendorId: 'v-2',
    vendorName: 'Hana Tanaka',
    vendorEmail: 'hana@lingoglobe.jp',
    actionName: 'Send NDA Link Request',
    templateId: 't-1',
    templateName: 'NDA Sign Link Request',
    recipientType: 'vendor',
    actualRecipients: ['mark@mlconnections.com'],
    isIntercepted: true,
    status: 'intercepted',
    subject: 'Action Required: Sign Non-Disclosure Agreement (NDA)',
    body: 'Dear Hana Tanaka,\n\nPlease review and execute our standard Non-Disclosure Agreement before proceeding to linguistic testing.\n\nLink: https://mlconnections.com/nda/sign-ht-554\n\nBest regards,\nMLC Vendor Management',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'notif-demo-2',
    vendorId: 'v-4',
    vendorName: 'Amara Diop',
    vendorEmail: 'amara@globalvoice.sn',
    actionName: 'Send Testing Portal Assignment',
    templateId: 't-2',
    templateName: 'Linguistic Testing Portal Invite',
    recipientType: 'both',
    actualRecipients: ['mark@mlconnections.com'],
    isIntercepted: true,
    status: 'intercepted',
    subject: 'MLC Translation Test Assignment - Project PR-4690-SN',
    body: 'Hello Amara Diop,\n\nYour test evaluation portal link is active. Please log in and submit your completed translation test within 5 business days.\n\nPortal: https://mlconnections.com/portal/assess-ad-122\n\nThank you,\nMLC Recruitment Team',
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
];

export const NotificationsLog: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotificationRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedNotif, setSelectedNotif] = useState<SystemNotificationRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [isTestingModeActive, setIsTestingModeActive] = useState(false);

  const loadNotifications = async () => {
    setLoadingData(true);
    try {
      const snap = await getDocs(collection(db, 'notifications'));
      const list: SystemNotificationRecord[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as SystemNotificationRecord);
      });

      if (list.length > 0) {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(list);
      } else {
        // Seed initial demo notifications
        for (const n of INITIAL_MOCK_NOTIFICATIONS) {
          await setDoc(doc(db, 'notifications', n.id), n);
        }
        setNotifications(INITIAL_MOCK_NOTIFICATIONS);
      }
    } catch (err) {
      console.error("Failed to load notifications from Firestore", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadNotifications();

      const fetchTestingMode = async () => {
        try {
          const configSnap = await getDoc(doc(db, 'settings', 'global_config'));
          if (configSnap.exists()) {
            const data = configSnap.data();
            setIsTestingModeActive(!!data?.testingMode?.enabled);
          } else {
            const savedMode = localStorage.getItem('mlc_settings_testing_mode');
            if (savedMode) {
              try {
                const parsed = JSON.parse(savedMode);
                setIsTestingModeActive(!!parsed.enabled);
              } catch {}
            }
          }
        } catch (err) {
          console.error("Failed to check testing mode in NotificationsLog", err);
        }
      };

      fetchTestingMode();
    }
  }, [authLoading, user]);

  const handleDeleteNotif = async (id: string) => {
    if (!confirm("Remove this notification log entry?")) return;
    try {
      await deleteDoc(doc(db, 'notifications', id));
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (selectedNotif?.id === id) setSelectedNotif(null);
    } catch (err) {
      console.error("Failed to delete notification record", err);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const vName = (n.vendorName || n.vendorEmail || n.email || 'Candidate').toLowerCase();
      const vEmail = (n.vendorEmail || n.email || '').toLowerCase();
      const subj = (n.subject || '').toLowerCase();
      const actName = (n.actionName || 'Workflow Action').toLowerCase();
      const q = search.toLowerCase();

      const matchesSearch = 
        vName.includes(q) ||
        vEmail.includes(q) ||
        subj.includes(q) ||
        actName.includes(q);

      const matchesStatus = filterStatus === 'all' || n.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [notifications, search, filterStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-7 h-7 text-primary" />
            Outbound Mail & Notification Queue Log
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
            Inspect all triggered workflow emails, actual recipient routing, and intercepted testing mode messages.
          </p>
        </div>

        <button
          onClick={loadNotifications}
          className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 btn-animate cursor-pointer self-start sm:self-auto border border-slate-200 dark:border-border-dark"
        >
          <RefreshCw className={`w-4 h-4 text-primary ${loadingData ? 'animate-spin' : ''}`} />
          Refresh Queue Log
        </button>
      </div>

      {/* Dynamic Interception Status Info Banner */}
      {isTestingModeActive ? (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-amber-700 dark:text-amber-400 text-xs">
          <Shield className="w-5 h-5 shrink-0 text-amber-500" />
          <div>
            <strong className="block font-bold">Email Interceptor Active in System Email Testing Mode:</strong>
            All workflow emails triggered during stage changes are logged here and routed to your configured administrator emails instead of external candidates.
          </div>
        </div>
      ) : (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400 text-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          <div>
            <strong className="block font-bold">Live Mail Delivery System Active:</strong>
            System Email Testing Mode is currently <strong>DISABLED</strong>. Automated workflow emails will be dispatched directly to candidate recipient email addresses.
          </div>
        </div>
      )}

      {/* Toolbar Filters */}
      <div className="bg-white dark:bg-card-dark p-4 rounded-2xl border border-slate-200/50 dark:border-border-dark shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search candidate name, email, rule, or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl focus:outline-none focus:border-primary dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-slate-400">Filter Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2 text-xs bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border-dark rounded-xl dark:text-white font-bold cursor-pointer capitalize"
          >
            <option value="all">All Notifications</option>
            <option value="intercepted">Intercepted (Testing Mode)</option>
            <option value="sent">Sent (Live)</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/50 dark:border-border-dark shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-bg-dark text-slate-500 font-bold border-b border-slate-200/50 dark:border-border-dark">
                <th className="p-4 pl-6">Candidate / Target</th>
                <th className="p-4">Trigger Rule & Template</th>
                <th className="p-4">Actual Outbound Recipient(s)</th>
                <th className="p-4 text-center">Delivery Status</th>
                <th className="p-4">Log Timestamp</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-white/5 font-semibold">
              {filteredNotifications.map((n) => (
                <tr key={n.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                  <td className="p-4 pl-6">
                    <span className="font-bold text-slate-900 dark:text-white block">{n.vendorName || n.vendorEmail || n.email || 'Candidate'}</span>
                    <span className="text-[10px] text-slate-400">{n.vendorEmail || n.email || ''}</span>
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-primary block">{n.actionName || 'Automated Stage Action'}</span>
                    <span className="text-[10px] text-slate-500">{n.templateName || 'System Email Template'}</span>
                  </td>
                  <td className="p-4">
                    <div className="space-y-0.5">
                      {(Array.isArray(n.actualRecipients) && n.actualRecipients.length > 0 ? n.actualRecipients : [n.vendorEmail || n.email || 'N/A']).map((rec, idx) => (
                        <span key={idx} className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-mono mr-1">
                          {rec}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                      n.status === 'intercepted' || n.isIntercepted
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : n.status === 'sent'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : n.status === 'queued'
                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        : 'bg-rose-500/15 text-rose-600 border border-rose-500/20'
                    }`}>
                      {(n.status === 'intercepted' || n.isIntercepted) && <Shield className="w-3 h-3 text-amber-500" />}
                      {n.status === 'sent' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      {n.isIntercepted ? 'Intercepted (Testing Mode)' : n.status}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-[11px] text-slate-500">
                    {new Date(n.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedNotif(n)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 hover:text-primary cursor-pointer"
                        title="View Email Message Body"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNotif(n.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                        title="Delete Log"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredNotifications.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No notification log records match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Message Preview Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-border-dark p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  {selectedNotif.subject}
                </h3>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Rule Trigger: {selectedNotif.actionName} | {new Date(selectedNotif.createdAt).toLocaleString()}
                </span>
              </div>

              <button
                onClick={() => setSelectedNotif(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-bg-dark rounded-xl space-y-1">
                <div><span className="font-bold text-slate-500">Target Candidate:</span> {selectedNotif.vendorName || selectedNotif.vendorEmail || selectedNotif.email || 'Candidate'} ({selectedNotif.vendorEmail || selectedNotif.email || 'N/A'})</div>
                <div>
                  <span className="font-bold text-slate-500">Actual Outbound Address(es):</span>{' '}
                  <span className="font-mono text-primary">
                    {(Array.isArray(selectedNotif.actualRecipients) && selectedNotif.actualRecipients.length > 0 ? selectedNotif.actualRecipients : [selectedNotif.vendorEmail || selectedNotif.email || 'N/A']).join(', ')}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-500">Interception Status:</span>{' '}
                  <span className="font-bold text-amber-600 dark:text-amber-400 uppercase">
                    {selectedNotif.isIntercepted ? 'Intercepted in Email Testing Mode' : 'Sent Live'}
                  </span>
                </div>
              </div>

              {selectedNotif.error && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-xs">
                  <strong className="block font-bold text-rose-700 dark:text-rose-300">SMTP Outbound Delivery Failure:</strong>
                  <code className="block mt-1 font-mono text-[11px] bg-rose-950/20 p-2 rounded-lg break-all">{selectedNotif.error}</code>
                </div>
              )}

              <div className="p-4 bg-slate-50 dark:bg-bg-dark border border-slate-200/40 dark:border-white/5 rounded-2xl whitespace-pre-wrap font-sans leading-relaxed text-slate-800 dark:text-slate-200 max-h-64 overflow-y-auto">
                {selectedNotif.body}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedNotif(null)}
                className="py-2 px-5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
