import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { VendorProfile, WorkflowAction } from '../types';
import { FileCheck, Download, CheckCircle2, ShieldCheck, AlertCircle, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

const DEMO_VENDOR_FALLBACK: VendorProfile = {
  id: 'cand-1785542235',
  companyName: 'Apex Translations LLC',
  contactName: 'Carlos Santillan',
  email: 'carlos.santillan@apextrans.com',
  isGmail: false,
  status: 'approved',
  mlcHourlyRate: 45,
  adjustedRate: 42,
  confirmedRate: 45,
  workingLanguages: [
    { language: 'Spanish', proficiency: 'native' },
    { language: 'English', proficiency: 'professional' }
  ],
  services: ['Translation', 'Localization'],
  classificationTier: 1,
  source: 'external',
  category: 'active',
  stage: 'nda',
  stageStatus: 'started',
  hasSignedNda: false,
  submittedAt: '2026-07-20T10:00:00Z',
  updatedAt: '2026-07-20T10:00:00Z'
};

export const NdaPortalScreen: React.FC = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [typedName, setTypedName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const fetchVendor = async () => {
      if (!vendorId) {
        setVendor(DEMO_VENDOR_FALLBACK);
        setTypedName(DEMO_VENDOR_FALLBACK.contactName);
        setLoading(false);
        return;
      }

      try {
        const docSnap = await getDoc(doc(db, 'vendors', vendorId));
        if (docSnap.exists()) {
          const vData = docSnap.data() as VendorProfile;
          setVendor(vData);
          setTypedName(vData.contactName);
          if (vData.hasSignedNda) {
            setIsSubmitted(true);
          }
        } else {
          // Demo mode fallback so dummy/sample links work out of the box
          setVendor({ ...DEMO_VENDOR_FALLBACK, id: vendorId });
          setTypedName(DEMO_VENDOR_FALLBACK.contactName);
        }
      } catch (err) {
        console.warn('Using demo vendor fallback:', err);
        setVendor({ ...DEMO_VENDOR_FALLBACK, id: vendorId });
        setTypedName(DEMO_VENDOR_FALLBACK.contactName);
      } finally {
        setLoading(false);
      }
    };

    fetchVendor();
  }, [vendorId]);

  const handlePrintPdf = () => {
    window.print();
  };

  const handleSubmitNda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !typedName.trim() || !agreed) return;

    setIsSubmitting(true);
    const signedTimestamp = new Date().toISOString();

    const updatedVendor: VendorProfile = {
      ...vendor,
      hasSignedNda: true,
      stageStatus: 'completed',
      ndaSignedAt: signedTimestamp,
      ndaSignatureName: typedName.trim(),
      ndaUrl: `https://mlc-vendor-recruitment.web.app/portal/nda/${vendor.id}`,
      updatedAt: signedTimestamp
    };

    try {
      // 1. Save NDA signature to Firestore
      await setDoc(doc(db, 'vendors', vendor.id), updatedVendor);

      // 2. Check for automated workflow actions on NDA completion
      const actionsSnap = await getDocs(collection(db, 'workflow_actions'));
      const actions: WorkflowAction[] = [];
      actionsSnap.forEach((d) => actions.push(d.data() as WorkflowAction));

      const matchedAction = actions.find(
        (act) => act.isActive && act.triggerStage === 'nda' && (act.triggerStatus === 'completed' || act.triggerStatus === 'any')
      );

      if (matchedAction && matchedAction.autoAdvanceStage && matchedAction.autoAdvanceStage !== 'none') {
        const nextStage = matchedAction.autoAdvanceStage;
        const autoAdvancedVendor: VendorProfile = {
          ...updatedVendor,
          stage: nextStage,
          stageStatus: 'started',
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'vendors', vendor.id), autoAdvancedVendor);
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error('Failed to submit NDA signature:', err);
      alert('Failed to submit agreement: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="flex items-center gap-3 bg-white/5 p-6 rounded-2xl border border-white/10">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold">Loading agreement documents...</span>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold">Portal Error</h2>
          <p className="text-xs text-slate-400 leading-relaxed">Unable to load candidate record for NDA signing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header Branding */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black">
              MLC
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight">Multilingual Connections</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Global Vendor & Specialist Portal</p>
            </div>
          </div>
          <button
            onClick={handlePrintPdf}
            className="py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4 text-primary" />
            Download / Print PDF
          </button>
        </header>

        {/* Printable Document Body */}
        <main className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-xl space-y-8 print:shadow-none print:border-none print:p-0">
          
          {/* Document Title */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-6 text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Mutual Non-Disclosure Agreement
            </span>
            <h2 className="text-2xl font-black tracking-tight pt-2">Non-Disclosure & Confidentiality Agreement</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Effective Date: {vendor.ndaSignedAt ? new Date(vendor.ndaSignedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Party Details Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Disclosing Party</span>
              <div className="font-extrabold text-slate-900 dark:text-white">Multilingual Connections, LLC</div>
              <div className="text-slate-500">Evanston, IL 60201, USA</div>
              <div className="text-slate-500">hr@mlconnections.com</div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Receiving Party (Specialist)</span>
              <div className="font-extrabold text-slate-900 dark:text-white">{vendor.contactName}</div>
              {vendor.companyName && <div className="text-slate-500 flex items-center gap-1"><Building2 className="w-3 h-3" /> {vendor.companyName}</div>}
              <div className="text-slate-500">{vendor.email}</div>
            </div>
          </div>

          {/* Agreement Legal Content */}
          <div className="space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-sans max-h-96 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/30 dark:border-slate-800 print:max-h-none print:overflow-visible">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">1. Purpose of Disclosure</h4>
            <p>
              Multilingual Connections ("Company") wishes to engage Specialist ("Receiving Party") for linguistic, translation, interpretation, localization, or related consulting services. In connection with this business relationship, Company may disclose to Receiving Party certain confidential, proprietary, or non-public technical, financial, and business information.
            </p>

            <h4 className="font-bold text-slate-900 dark:text-white text-sm pt-2">2. Definition of Confidential Information</h4>
            <p>
              "Confidential Information" includes all written, oral, electronic, or visual information provided by Company or its clients, including but not limited to source documents, target translations, glossaries, client names, project rates, trade secrets, software, and proprietary workflows.
            </p>

            <h4 className="font-bold text-slate-900 dark:text-white text-sm pt-2">3. Obligations of Receiving Party</h4>
            <p>
              Receiving Party agrees to: (a) hold Confidential Information in strict confidence and take all reasonable precautions to prevent unauthorized disclosure; (b) use Confidential Information solely for performing contracted linguistic services for Company; and (c) not copy, transmit, or disclose any portion of Confidential Information to third parties without prior written consent.
            </p>

            <h4 className="font-bold text-slate-900 dark:text-white text-sm pt-2">4. Term and Termination</h4>
            <p>
              This Agreement remains in effect for a period of five (5) years from the date of disclosure, or perpetually for trade secrets and client proprietary source assets. Upon termination of engagement, Receiving Party agrees to permanently delete and return all Company assets and files.
            </p>

            <h4 className="font-bold text-slate-900 dark:text-white text-sm pt-2">5. Governing Law & Electronic Signatures</h4>
            <p>
              This Agreement shall be governed by and construed in accordance with the laws of the State of Illinois, USA. Both parties agree that electronic signatures executed via this portal hold full legal validity under the US E-SIGN Act and UETA regulations.
            </p>
          </div>

          {/* Submission Form OR Completed Signature Record */}
          {isSubmitted ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-3"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">NDA Agreement Executed & Verified</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Signed by <strong className="text-slate-900 dark:text-white">{vendor.ndaSignatureName || vendor.contactName}</strong> on{' '}
                {new Date(vendor.ndaSignedAt || Date.now()).toLocaleString('en-US')}.
              </p>
              <div className="text-[10px] text-slate-400 font-mono">
                Audit Record ID: NDA-{vendor.id.toUpperCase()}-{Date.parse(vendor.ndaSignedAt || vendor.submittedAt)}
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmitNda} className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800 print:hidden">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
                  Typed Signature (Full Legal Name)
                </label>
                <input
                  type="text"
                  required
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="e.g. Maria Gomez"
                  className="w-full p-3.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-bold dark:text-white"
                />
              </div>

              <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                <input
                  type="checkbox"
                  id="agree-checkbox"
                  required
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-primary rounded cursor-pointer"
                />
                <label htmlFor="agree-checkbox" className="text-xs text-slate-600 dark:text-slate-300 font-medium cursor-pointer leading-relaxed">
                  I, <strong>{typedName || 'the undersigned'}</strong>, confirm that I have read, understood, and agree to be bound by the terms and conditions of this Non-Disclosure & Confidentiality Agreement.
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !agreed || !typedName.trim()}
                className="w-full py-4 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-extrabold text-sm rounded-xl btn-animate cursor-pointer shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Executing Agreement...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-5 h-5" />
                    Submit & Execute Non-Disclosure Agreement
                  </>
                )}
              </button>
            </form>
          )}

        </main>
      </div>
    </div>
  );
};
