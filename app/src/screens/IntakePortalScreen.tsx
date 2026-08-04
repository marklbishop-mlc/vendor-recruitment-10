import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, setDoc, collection, getDocs, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import type { 
  VendorProfile, 
  WorkflowAction, 
  WorkingLanguage, 
  ApplicationConfig,
  MtqaExperienceYears,
  ErrorTaggingExpLevel,
  WeeklyAvailabilityOption,
  AgilitySelfAssessment
} from '../types';
import { getActiveSortedLanguages } from '../types';
import { COUNTRIES, TIME_ZONES } from '../utils/locationData';
import { 
  User, Globe, Upload, Plus, Trash2, 
  CheckCircle2, AlertCircle, DollarSign, FileText, Send,
  Calendar, Clock, Award, Cpu, HelpCircle, MapPin
} from 'lucide-react';
import { motion } from 'framer-motion';

const DEFAULT_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 
  'Japanese', 'Mandarin', 'Swedish', 'Wolof', 'Dutch', 'Polish'
];

const AVAILABLE_SERVICES = [
  'Translation', 'MTPE (Machine Translation Post-Editing)', 'Editing', 
  'Proofreading', 'Subtitling', 'Voiceover', 'Interpretation', 'Consulting'
];

const HANDS_ON_EXPERIENCE_OPTIONS = [
  'Machine Translation Quality Assurance (MTQA)',
  'Machine Translation Post-Editing (MTPE)',
  'AI Training Data Annotation',
  'Personally Identifiable Information (PII) Safety Auditing',
  'Content Safety / Policy Enforcement Auditing',
  'General Localization & Translation'
];

export const IntakePortalScreen: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();

  // Application Config state
  const [appConfig, setAppConfig] = useState<ApplicationConfig | null>(null);

  // Configured System Languages
  const [availableLanguages, setAvailableLanguages] = useState<string[]>(DEFAULT_LANGUAGES);
  const [servicesList, setServicesList] = useState<string[]>(AVAILABLE_SERVICES);

  // Form state
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [secondaryEmail, setSecondaryEmail] = useState('');
  const [isGmail, setIsGmail] = useState(true);
  const [phone, setPhone] = useState('');
  const [linkedInProfile, setLinkedInProfile] = useState('');
  const [prozProfile, setProzProfile] = useState('');

  // Location State
  const [country, setCountry] = useState('United States');
  const [timeZone, setTimeZone] = useState('UTC-05:00');

  // Availability & Start Date State
  const [availableStartDate, setAvailableStartDate] = useState('Immediately');
  const [weeklyAvailability, setWeeklyAvailability] = useState<WeeklyAvailabilityOption>('up_to_15');

  // Other Languages State
  const [otherLanguages, setOtherLanguages] = useState('');

  // Experience & Specialization State
  const [mtqaExperienceYears, setMtqaExperienceYears] = useState<MtqaExperienceYears>('1_to_3');
  const [handsOnExperienceAreas, setHandsOnExperienceAreas] = useState<string[]>([]);
  const [errorTaggingExperience, setErrorTaggingExperience] = useState<ErrorTaggingExpLevel>('basic');

  // Agility Self-Assessment Matrix State (1-3 scale)
  const [agilitySelfAssessment, setAgilitySelfAssessment] = useState<AgilitySelfAssessment>({
    qaPlatforms: 2,
    grammarStyle: 3,
    errorTagging: 3,
    policyFeedback: 2
  });

  // Custom Answers State
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | number>>({});

  // Languages state
  const [languages, setLanguages] = useState<WorkingLanguage[]>([]);
  const [newLangName, setNewLangName] = useState('English');
  const [newLangProf, setNewLangProf] = useState<'native' | 'bilingual' | 'professional' | 'working'>('professional');

  // Load Application Config and System Languages
  useEffect(() => {
    const fetchAppAndLanguages = async () => {
      try {
        let loadedApp: ApplicationConfig | null = null;

        // 1. Fetch Application Config if slug is provided
        if (slug) {
          const appDocRef = doc(db, 'applications', slug);
          const appSnap = await getDoc(appDocRef);
          if (appSnap.exists()) {
            loadedApp = { id: appSnap.id, ...appSnap.data() } as ApplicationConfig;
          } else {
            // Search by slug field
            const appsQuerySnap = await getDocs(collection(db, 'applications'));
            appsQuerySnap.forEach((d) => {
              const data = d.data() as ApplicationConfig;
              if (data.slug === slug || data.id === slug) {
                loadedApp = { ...data, id: d.id };
              }
            });
          }
        }

        setAppConfig(loadedApp);

        // 2. Fetch System Languages
        const snap = await getDoc(doc(db, 'settings', 'global_config'));
        let systemLangs = DEFAULT_LANGUAGES;
        if (snap.exists() && snap.data().languages) {
          const activeSorted = getActiveSortedLanguages(snap.data().languages);
          if (activeSorted.length > 0) {
            systemLangs = activeSorted.map((l) => l.name);
          }
        }

        // Apply Language Scope Filter if configured on Application
        if (loadedApp && loadedApp.allowedLanguages && !loadedApp.allowedLanguages.includes('all') && loadedApp.allowedLanguages.length > 0) {
          systemLangs = systemLangs.filter(l => loadedApp!.allowedLanguages.includes(l));
        }

        setAvailableLanguages(systemLangs);
        if (systemLangs.length > 0) {
          setNewLangName(systemLangs[0]);
        }

        // Apply Service Scope Filter if configured on Application
        if (loadedApp && loadedApp.allowedServices && !loadedApp.allowedServices.includes('all') && loadedApp.allowedServices.length > 0) {
          const filteredServices = AVAILABLE_SERVICES.filter(s => 
            loadedApp!.allowedServices.some(allowed => s.toLowerCase().includes(allowed.toLowerCase()) || allowed.toLowerCase().includes(s.toLowerCase()))
          );
          setServicesList(filteredServices.length > 0 ? filteredServices : loadedApp.allowedServices);
          setSelectedServices(filteredServices.length > 0 ? [filteredServices[0]] : [loadedApp.allowedServices[0]]);
        }

      } catch (err) {
        console.error("Failed to load intake portal application config", err);
      }
    };
    fetchAppAndLanguages();
  }, [slug]);

  // Services state
  const [selectedServices, setSelectedServices] = useState<string[]>([
    'Translation', 'Editing'
  ]);

  // Rates & Capacity
  const [hourlyRate, setHourlyRate] = useState('45');
  const [hoursAvailable, setHoursAvailable] = useState('30');
  const [mtPeExperience, setMtPeExperience] = useState<'1-3' | '3-5' | '5+'>('3-5');

  // File upload state
  const [resumeName, setResumeName] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleAddLanguage = () => {
    if (languages.some(l => l.language === newLangName)) return;
    setLanguages([...languages, { language: newLangName, proficiency: newLangProf }]);
  };

  const handleRemoveLanguage = (langName: string) => {
    setLanguages(languages.filter(l => l.language !== langName));
  };

  const handleToggleService = (service: string) => {
    if (selectedServices.includes(service)) {
      if (selectedServices.length <= 1) return;
      setSelectedServices(selectedServices.filter(s => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleToggleHandsOnArea = (area: string) => {
    if (handsOnExperienceAreas.includes(area)) {
      setHandsOnExperienceAreas(handsOnExperienceAreas.filter(a => a !== area));
    } else {
      setHandsOnExperienceAreas([...handsOnExperienceAreas, area]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeName(file.name);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !email.trim()) {
      setError('Please fill in your contact name and email address.');
      return;
    }

    if (languages.length === 0) {
      setError('Please add at least one working language and proficiency.');
      return;
    }

    // Validate Custom Required Questions
    if (appConfig?.customQuestions) {
      for (const q of appConfig.customQuestions) {
        if (q.required && (!customAnswers[q.id] || String(customAnswers[q.id]).trim() === '')) {
          setError(`Please answer required question: "${q.questionText}"`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setError('');

    const vendorId = `cand-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const parsedRate = parseFloat(hourlyRate) || 45;

    const newCandidate: VendorProfile = {
      id: vendorId,
      contactName: contactName.trim(),
      companyName: companyName.trim(),
      email: email.trim().toLowerCase(),
      secondaryEmail: secondaryEmail.trim().toLowerCase(),
      isGmail: isGmail || email.toLowerCase().includes('gmail.com'),
      phone: phone.trim(),
      workingLanguages: languages,
      services: selectedServices,
      classificationTier: 2,
      source: 'external',
      category: 'outreach',
      mlcHourlyRate: parsedRate,
      adjustedRate: parsedRate,
      confirmedRate: parsedRate,
      hoursAvailable: parseInt(hoursAvailable) || 30,
      mtPeExperience,
      prozProfile: prozProfile.trim(),
      linkedInProfile: linkedInProfile.trim(),
      resumeName: resumeName || 'Resume_Attached.pdf',
      hasSignedNda: false,
      stage: 'outreach',
      stageStatus: 'started',
      status: 'pending',
      applicationId: appConfig?.id || 'default',
      applicationName: appConfig?.name || 'General Application',

      // Detailed evaluation fields (populated when enabled)
      country: appConfig?.enableCountryTimeZone ? country : undefined,
      timeZone: appConfig?.enableCountryTimeZone ? timeZone : undefined,
      availableStartDate: appConfig?.enableAvailableStartDate ? availableStartDate : undefined,
      weeklyAvailability: appConfig?.enableWeeklyAvailability ? weeklyAvailability : undefined,
      otherLanguages: appConfig?.enableOtherLanguages ? otherLanguages.trim() : undefined,
      mtqaExperienceYears: appConfig?.enableMtqaExperience ? mtqaExperienceYears : undefined,
      handsOnExperienceAreas: appConfig?.enableHandsOnExperience ? handsOnExperienceAreas : undefined,
      agilitySelfAssessment: appConfig?.enableAgilityAssessment ? agilitySelfAssessment : undefined,
      errorTaggingExperience: appConfig?.enableErrorTaggingExp ? errorTaggingExperience : undefined,
      customAnswers: appConfig?.customQuestions && appConfig.customQuestions.length > 0 ? customAnswers : undefined,

      submittedAt: timestamp,
      updatedAt: timestamp
    };

    try {
      // 1. Save new candidate application to Cloud Firestore
      await setDoc(doc(db, 'vendors', vendorId), newCandidate);

      // Increment submission metrics on Application Config if set
      if (appConfig?.id) {
        try {
          await updateDoc(doc(db, 'applications', appConfig.id), {
            submissionsCount: increment(1)
          });
        } catch (err) {
          console.error("Failed to update application submissions count", err);
        }
      }

      // 2. Evaluate workflow actions for Outreach stage entry
      const actionsSnap = await getDocs(collection(db, 'workflow_actions'));
      const actions: WorkflowAction[] = [];
      actionsSnap.forEach((d) => actions.push(d.data() as WorkflowAction));

      const matchedAction = actions.find(
        (act) => act.isActive && act.triggerStage === 'outreach' && (act.triggerStatus === 'started' || act.triggerStatus === 'any')
      );

      if (matchedAction && matchedAction.templateId && matchedAction.templateId !== 'none') {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          id: notifRef.id,
          vendorId,
          vendorName: newCandidate.contactName,
          vendorEmail: newCandidate.email,
          actionName: matchedAction.name || 'Outreach Application Confirmation',
          templateId: matchedAction.templateId,
          templateName: 'Outreach Welcome',
          recipientType: matchedAction.recipientType || 'vendor',
          actualRecipients: [newCandidate.email],
          isIntercepted: false,
          email: newCandidate.email,
          subject: 'MLC Localization Partnership Opportunity',
          body: `Hi ${newCandidate.contactName},\n\nThank you for applying to Multilingual Connections! We have received your profile application and our recruitment team will review your qualifications shortly.\n\nBest regards,\nMLC Recruiting Team`,
          status: 'queued',
          createdAt: timestamp
        });
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error('Failed to submit application to Firestore:', err);
      setError('Failed to submit application: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header Branding */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <img src="/logomark.png" alt="Multilingual Connections Logo" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-base font-extrabold tracking-tight">Multilingual Connections</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Linguist & Specialist Application Portal</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Join Our Global Network
          </span>
        </header>

        <main className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-xl space-y-8">
          
          {/* Title Section */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-6 space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {appConfig?.portalTitle || 'Linguist Partner Application'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {appConfig?.portalSubtitle || 'Please complete the intake form below with your contact information, working languages, rates, and experience. Once submitted, our recruitment team will review your application and send you the next steps.'}
            </p>
          </div>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {isSubmitted ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-center space-y-4"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">Application Received!</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                Thank you, <strong className="text-slate-900 dark:text-white">{contactName}</strong>! Your application has been submitted to Multilingual Connections. Our recruitment specialists will review your profile and contact you via email shortly.
              </p>
              <div className="pt-4 text-[11px] text-slate-400 font-mono">
                Confirmation Record ID: MLC-APP-{Date.now()}
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmitApplication} className="space-y-8">
              
              {/* Section 1: Contact & Company Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  1. Contact & Identity Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maria Gomez"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-bold dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Company / Business Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Gomez Translation Services"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-bold dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Primary Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="maria@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (e.target.value.toLowerCase().includes('gmail.com')) {
                          setIsGmail(true);
                        }
                      }}
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-bold dark:text-white"
                    />
                    <div className="flex items-center gap-2 pt-1.5">
                      <input
                        type="checkbox"
                        id="is-gmail-chk"
                        checked={isGmail}
                        onChange={(e) => setIsGmail(e.target.checked)}
                        className="w-4 h-4 text-primary rounded cursor-pointer"
                      />
                      <label htmlFor="is-gmail-chk" className="text-xs text-slate-600 dark:text-slate-300 font-semibold cursor-pointer">
                        This email is associated with a Google Workspace / Gmail account (Enables Google Workspace integration)
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Secondary Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="backup@example.com"
                      value={secondaryEmail}
                      onChange={(e) => setSecondaryEmail(e.target.value)}
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-bold dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-bold dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">LinkedIn Profile URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://linkedin.com/in/username"
                      value={linkedInProfile}
                      onChange={(e) => setLinkedInProfile(e.target.value)}
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-bold dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">ProZ Profile URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://proz.com/profile/12345"
                      value={prozProfile}
                      onChange={(e) => setProzProfile(e.target.value)}
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-bold dark:text-white"
                    />
                  </div>

                  {/* Country of Residence & Time Zone (when enabled) */}
                  {appConfig?.enableCountryTimeZone && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-primary" /> Country of Residence *
                        </label>
                        <select
                          required
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-bold dark:text-white cursor-pointer"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-primary" /> Primary Time Zone *
                        </label>
                        <select
                          required
                          value={timeZone}
                          onChange={(e) => setTimeZone(e.target.value)}
                          className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-bold dark:text-white cursor-pointer"
                        >
                          {TIME_ZONES.map((tz) => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Section 2: Working Languages */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  2. Working Languages & Proficiencies
                </h3>

                <div className="flex flex-wrap gap-2">
                  {languages.length === 0 ? (
                    <div className="w-full text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      No working languages added yet. Please select your language and proficiency below and click <strong className="text-primary">+ Add Language</strong>.
                    </div>
                  ) : (
                    languages.map((l, i) => (
                      <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-bold">
                        {l.language} ({l.proficiency})
                        <button
                          type="button"
                          onClick={() => handleRemoveLanguage(l.language)}
                          className="hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-5 space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 block">
                        Language
                      </label>
                      <select
                        value={newLangName}
                        onChange={(e) => setNewLangName(e.target.value)}
                        className="w-full p-2.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:outline-none focus:border-primary"
                      >
                        {availableLanguages.map((lang) => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-4 space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 block">
                        Competency
                      </label>
                      <select
                        value={newLangProf}
                        onChange={(e) => setNewLangProf(e.target.value as any)}
                        className="w-full p-2.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:outline-none focus:border-primary"
                      >
                        <option value="native">Native</option>
                        <option value="bilingual">Bilingual</option>
                        <option value="professional">Professional</option>
                        <option value="working">Working</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <button
                        type="button"
                        onClick={handleAddLanguage}
                        className="w-full py-2.5 px-4 bg-primary hover:bg-primary-dark text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        Add Language
                      </button>
                    </div>
                  </div>
                </div>

                {/* Other Working Languages text field (when enabled) */}
                {appConfig?.enableOtherLanguages && (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Other Working Languages Handled (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={otherLanguages}
                      onChange={(e) => setOtherLanguages(e.target.value)}
                      placeholder="Please let us know of any additional working languages, dialects, or secondary language pairs you handle..."
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-medium dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Section 3: Services Offered */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  3. Linguistic Services Offered
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {servicesList.map((srv) => {
                    const isSelected = selectedServices.includes(srv);
                    return (
                      <div
                        key={srv}
                        onClick={() => handleToggleService(srv)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between text-xs font-bold ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <span>{srv}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section: Start Date & Weekly Availability (when enabled) */}
              {(appConfig?.enableAvailableStartDate || appConfig?.enableWeeklyAvailability) && (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Availability & Scheduling
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {appConfig?.enableAvailableStartDate && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Available Start Date *</label>
                        <select
                          value={availableStartDate}
                          onChange={(e) => setAvailableStartDate(e.target.value)}
                          className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-bold dark:text-white cursor-pointer"
                        >
                          <option value="Immediately">Immediately</option>
                          <option value="Within 1 week">Within 1 week</option>
                          <option value="Within 2 weeks">Within 2 weeks</option>
                          <option value="1 month+">1 month+</option>
                        </select>
                      </div>
                    )}

                    {appConfig?.enableWeeklyAvailability && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Weekly Availability *</label>
                        <select
                          value={weeklyAvailability}
                          onChange={(e) => setWeeklyAvailability(e.target.value as any)}
                          className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-bold dark:text-white cursor-pointer"
                        >
                          <option value="less_than_10">Less than 10 hours/week</option>
                          <option value="up_to_15">Up to 15 hours/week</option>
                          <option value="up_to_20">Up to 20 hours/week</option>
                          <option value="more_than_20">20+ hours/week</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section: Domain Experience & Specialization (when enabled) */}
              {(appConfig?.enableMtqaExperience || appConfig?.enableHandsOnExperience || appConfig?.enableErrorTaggingExp) && (
                <div className="space-y-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    Domain Experience & MTQA / MTPE Specialization
                  </h3>

                  {/* MTQA / MTPE Experience Years */}
                  {appConfig?.enableMtqaExperience && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        How many years of experience do you have specifically in Machine Translation Quality Assurance (MTQA) or Post-Editing (MTPE)? *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[
                          { key: 'less_than_1', label: 'Less than 1 yr' },
                          { key: '1_year', label: '1 year' },
                          { key: '1_to_3', label: '1–3 years' },
                          { key: '3_to_5', label: '3–5 years' },
                          { key: '5_plus', label: '5+ years' }
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setMtqaExperienceYears(item.key as any)}
                            className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                              mtqaExperienceYears === item.key
                                ? 'bg-primary/10 border-primary text-primary shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hands-On Experience Areas */}
                  {appConfig?.enableHandsOnExperience && (
                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Which of the following areas do you have proven, hands-on experience in? (Select all that apply)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {HANDS_ON_EXPERIENCE_OPTIONS.map((area) => {
                          const isChecked = handsOnExperienceAreas.includes(area);
                          return (
                            <label
                              key={area}
                              onClick={() => handleToggleHandsOnArea(area)}
                              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs font-bold ${
                                isChecked
                                  ? 'bg-primary/10 border-primary text-primary shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                              }`}
                            >
                              <span>{area}</span>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // Handled by parent div
                                className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Error-Tagging Framework Experience */}
                  {appConfig?.enableErrorTaggingExp && (
                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Have you worked with structured error-tagging frameworks or issue taxonomies (e.g. categorizing error types like Accuracy, Addition, Omission, Untranslated Content)? *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {[
                          { key: 'extensive', label: 'Yes, extensive experience' },
                          { key: 'basic', label: 'Yes, basic experience' },
                          { key: 'none_learning', label: 'No, but quick to learn' }
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setErrorTaggingExperience(item.key as any)}
                            className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                              errorTaggingExperience === item.key
                                ? 'bg-primary/10 border-primary text-primary shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Section: Technical & Operational Agility Self-Assessment (when enabled) */}
              {appConfig?.enableAgilityAssessment && (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-primary" />
                      Self-Assessment: Technical & Operational Agility
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">Please rate your capability from 1 (Beginner) to 3 (Expert) across the following metrics:</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'qaPlatforms', label: 'Comfort navigating complex QA platforms and custom tools' },
                      { key: 'grammarStyle', label: 'Attention to detail regarding grammar, style, and overall mechanics' },
                      { key: 'errorTagging', label: 'Precision in following strict error-tagging and formatting rules' },
                      { key: 'policyFeedback', label: 'Ability to apply granular, policy-based feedback across iterations' }
                    ].map((metric) => {
                      const currentVal = agilitySelfAssessment[metric.key as keyof AgilitySelfAssessment] || 2;
                      return (
                        <div key={metric.key} className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{metric.label}</span>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {[1, 2, 3].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setAgilitySelfAssessment({
                                  ...agilitySelfAssessment,
                                  [metric.key]: num
                                })}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                  currentVal === num
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary'
                                }`}
                              >
                                {num} - {num === 1 ? 'Beginner' : num === 2 ? 'Intermediate' : 'Expert'}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section: Custom Campaign Questions (when configured) */}
              {appConfig?.customQuestions && appConfig.customQuestions.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-primary" />
                    Additional Qualification Questions
                  </h3>

                  <div className="space-y-4">
                    {appConfig.customQuestions.map((cq, idx) => (
                      <div key={cq.id} className="space-y-2 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          #{idx + 1}. {cq.questionText} {cq.required && <span className="text-rose-500">*</span>}
                        </label>

                        {cq.questionType === 'open_ended' ? (
                          <textarea
                            rows={3}
                            required={cq.required}
                            value={String(customAnswers[cq.id] || '')}
                            onChange={(e) => setCustomAnswers({ ...customAnswers, [cq.id]: e.target.value })}
                            placeholder="Type your response here..."
                            className="w-full p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-medium dark:text-white"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            {[1, 2, 3].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setCustomAnswers({ ...customAnswers, [cq.id]: num })}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                  customAnswers[cq.id] === num
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                Rating {num} ({num === 1 ? 'Low' : num === 2 ? 'Medium' : 'High'})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4: Rates & Capacity */}
              {appConfig?.collectRates !== false && (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    4. Rates & Weekly Capacity
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Standard Hourly Rate ($/hr)</label>
                      <input
                        type="number"
                        required={appConfig?.collectRates ?? true}
                        min="1"
                        placeholder="45"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-bold dark:text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Hours Available / Week</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="30"
                        value={hoursAvailable}
                        onChange={(e) => setHoursAvailable(e.target.value)}
                        className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-bold dark:text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">MTPE Experience</label>
                      <select
                        value={mtPeExperience}
                        onChange={(e) => setMtPeExperience(e.target.value as any)}
                        className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary font-bold dark:text-white cursor-pointer"
                      >
                        <option value="1-3">1-3 Years</option>
                        <option value="3-5">3-5 Years</option>
                        <option value="5+">5+ Years</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 5: Resume Upload */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary" />
                  5. Resume / CV File Upload
                </h3>

                <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary/50 rounded-2xl bg-slate-50 dark:bg-slate-950/50 text-center space-y-3 transition-colors relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <Upload className="w-8 h-8 text-primary mx-auto" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {resumeName ? `Uploaded: ${resumeName}` : 'Click or Drag Resume File to Upload'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Supports PDF, DOC, DOCX files up to 10MB</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !contactName.trim() || !email.trim()}
                className="w-full py-4 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-extrabold text-sm rounded-xl btn-animate cursor-pointer shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Application to Multilingual Connections
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
