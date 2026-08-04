import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { VendorProfile } from './types';

export const SEEDED_DUMMY_VENDORS: VendorProfile[] = [
  {
    id: 'seed-1',
    companyName: 'Apex Translations LLC',
    contactName: 'Maria Gomez',
    email: 'maria@apextrans.com',
    isGmail: false,
    secondaryEmail: 'maria.gomez.mlc@gmail.com',
    phone: '+1 (555) 234-5678',
    workingLanguages: [
      { language: 'Spanish', proficiency: 'native' },
      { language: 'English', proficiency: 'professional' }
    ],
    services: ['Translation', 'Editing', 'MTPE'],
    classificationTier: 1,
    source: 'external',
    category: 'outreach',
    stage: 'outreach',
    mlcHourlyRate: 45,
    adjustedRate: 40,
    confirmedRate: 45,
    status: 'pending',
    submittedAt: '2026-07-20T10:00:00Z',
    updatedAt: '2026-07-20T10:00:00Z',
    mtPeExperience: '3-5',
    hoursAvailable: 30,
    hasSignedNda: false
  },
  {
    id: 'seed-2',
    companyName: 'Bavarian Localizations',
    contactName: 'Hans Weber',
    email: 'hans@bavarianloc.de',
    isGmail: false,
    secondaryEmail: 'hans.weber.work@gmail.com',
    phone: '+49 89 123456',
    workingLanguages: [
      { language: 'German', proficiency: 'native' },
      { language: 'English', proficiency: 'bilingual' }
    ],
    services: ['Translation', 'Proofreading'],
    classificationTier: 1,
    source: 'external',
    category: 'network',
    stage: 'nda',
    mlcHourlyRate: 55,
    adjustedRate: 50,
    confirmedRate: 55,
    status: 'approved',
    submittedAt: '2026-07-22T11:30:00Z',
    updatedAt: '2026-07-24T14:15:00Z',
    mtPeExperience: '5+',
    hoursAvailable: 25,
    hasSignedNda: true,
    ndaUrl: 'https://mlconnections.com/nda/hans_weber.pdf'
  },
  {
    id: 'seed-3',
    companyName: 'Sato Localization LLC',
    contactName: 'Kenji Sato',
    email: 'kenji@satoloc.jp',
    isGmail: false,
    secondaryEmail: 'kenji.sato.mlc@gmail.com',
    phone: '+81 3 5555 0123',
    workingLanguages: [
      { language: 'Japanese', proficiency: 'native' },
      { language: 'English', proficiency: 'professional' }
    ],
    services: ['Translation', 'Subtitling', 'MTPE'],
    classificationTier: 2,
    source: 'external',
    category: 'network',
    stage: 'ready_for_testing',
    mlcHourlyRate: 50,
    adjustedRate: 45,
    confirmedRate: 48,
    status: 'approved',
    submittedAt: '2026-07-25T09:00:00Z',
    updatedAt: '2026-07-26T16:20:00Z',
    mtPeExperience: '3-5',
    hoursAvailable: 20,
    hasSignedNda: true,
    ndaUrl: 'https://mlconnections.com/nda/kenji_sato.pdf'
  },
  {
    id: 'seed-4',
    companyName: 'Lumiere Translations',
    contactName: 'Claire Dubois',
    email: 'claire@lumieretrans.fr',
    isGmail: true,
    phone: '+33 1 42 68 55 00',
    workingLanguages: [
      { language: 'French', proficiency: 'native' },
      { language: 'Spanish', proficiency: 'working' }
    ],
    services: ['Translation', 'Editing'],
    classificationTier: 2,
    source: 'external',
    category: 'active',
    stage: 'in_testing',
    mlcHourlyRate: 48,
    adjustedRate: 43,
    confirmedRate: 45,
    status: 'approved',
    submittedAt: '2026-07-26T13:45:00Z',
    updatedAt: '2026-07-27T10:10:00Z',
    mtPeExperience: '1-3',
    hoursAvailable: 35,
    hasSignedNda: true,
    ndaUrl: 'https://mlconnections.com/nda/claire_dubois.pdf'
  },
  {
    id: 'seed-5',
    companyName: 'Lusitania Text',
    contactName: 'Marco Silva',
    email: 'marco@lusitaniatext.pt',
    isGmail: true,
    phone: '+351 21 345 6789',
    workingLanguages: [
      { language: 'Portuguese', proficiency: 'native' },
      { language: 'English', proficiency: 'working' }
    ],
    services: ['Translation', 'MTPE', 'Localization'],
    classificationTier: 1,
    source: 'xtrf',
    category: 'active',
    stage: 'ready_for_pm',
    mlcHourlyRate: 42,
    adjustedRate: 38,
    confirmedRate: 42,
    status: 'active',
    submittedAt: '2026-07-21T08:30:00Z',
    updatedAt: '2026-07-28T09:00:00Z',
    mtPeExperience: '5+',
    hoursAvailable: 40,
    hasSignedNda: true,
    ndaUrl: 'https://mlconnections.com/nda/marco_silva.pdf'
  },
  {
    id: 'seed-6',
    companyName: 'Hanzi Media Ltd',
    contactName: 'Li Wei',
    email: 'liwei@hanzimedia.cn',
    isGmail: false,
    secondaryEmail: 'liwei.trans@gmail.com',
    phone: '+86 10 8888 9999',
    workingLanguages: [
      { language: 'Mandarin', proficiency: 'native' },
      { language: 'English', proficiency: 'working' }
    ],
    services: ['Translation', 'Subtitling'],
    classificationTier: 2,
    source: 'external',
    category: 'network',
    stage: 'xtrf_onboarding',
    mlcHourlyRate: 52,
    adjustedRate: 47,
    confirmedRate: 50,
    status: 'approved',
    submittedAt: '2026-07-23T15:10:00Z',
    updatedAt: '2026-07-29T11:00:00Z',
    mtPeExperience: '3-5',
    hoursAvailable: 25,
    hasSignedNda: true,
    ndaUrl: 'https://mlconnections.com/nda/li_wei.pdf'
  },
  {
    id: 'seed-7',
    companyName: 'Slavic Words',
    contactName: 'Elena Rostova',
    email: 'elena@slavicwords.ru',
    isGmail: true,
    phone: '+7 495 777 1234',
    workingLanguages: [
      { language: 'German', proficiency: 'working' },
      { language: 'Spanish', proficiency: 'working' }
    ],
    services: ['Translation', 'MTPE'],
    classificationTier: 3,
    source: 'external',
    category: 'outreach',
    stage: 'outreach',
    mlcHourlyRate: 38,
    adjustedRate: 34,
    confirmedRate: 36,
    status: 'pending',
    submittedAt: '2026-07-27T14:00:00Z',
    updatedAt: '2026-07-27T14:00:00Z',
    mtPeExperience: '1-3',
    hoursAvailable: 15,
    hasSignedNda: false
  },
  {
    id: 'seed-8',
    companyName: 'Nordic Text AB',
    contactName: 'Astrid Lindgren',
    email: 'astrid@nordictext.se',
    isGmail: true,
    phone: '+46 8 123 4567',
    workingLanguages: [
      { language: 'Swedish', proficiency: 'native' },
      { language: 'English', proficiency: 'native' }
    ],
    services: ['Translation', 'Proofreading', 'Copywriting'],
    classificationTier: 1,
    source: 'xtrf',
    category: 'active',
    stage: 'ready_for_pm',
    mlcHourlyRate: 60,
    adjustedRate: 54,
    confirmedRate: 58,
    status: 'active',
    submittedAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-30T12:00:00Z',
    mtPeExperience: '5+',
    hoursAvailable: 30,
    hasSignedNda: true,
    ndaUrl: 'https://mlconnections.com/nda/astrid_lindgren.pdf'
  },
  {
    id: 'seed-9',
    companyName: 'Desert Rose Localizations',
    contactName: 'Ahmed Al-Mansoor',
    email: 'ahmed@desertroseloc.ae',
    isGmail: false,
    secondaryEmail: 'ahmed.mansoor.mlc@gmail.com',
    phone: '+971 4 321 9876',
    workingLanguages: [
      { language: 'Arabic', proficiency: 'native' },
      { language: 'French', proficiency: 'working' }
    ],
    services: ['Translation', 'Editing'],
    classificationTier: 2,
    source: 'external',
    category: 'network',
    stage: 'ready_for_testing',
    mlcHourlyRate: 45,
    adjustedRate: 40,
    confirmedRate: 42,
    status: 'approved',
    submittedAt: '2026-07-28T09:30:00Z',
    updatedAt: '2026-07-29T17:40:00Z',
    mtPeExperience: '3-5',
    hoursAvailable: 20,
    hasSignedNda: true,
    ndaUrl: 'https://mlconnections.com/nda/ahmed_mansoor.pdf'
  },
  {
    id: 'seed-10',
    companyName: 'Verba Italia',
    contactName: 'Giovanni Rossi',
    email: 'giovanni@verbaitalia.it',
    isGmail: true,
    phone: '+39 06 698 12345',
    workingLanguages: [
      { language: 'Italian', proficiency: 'native' },
      { language: 'English', proficiency: 'working' }
    ],
    services: ['Translation', 'MTPE'],
    classificationTier: 2,
    source: 'external',
    category: 'active',
    stage: 'in_testing',
    mlcHourlyRate: 46,
    adjustedRate: 41,
    confirmedRate: 44,
    status: 'approved',
    submittedAt: '2026-07-29T11:15:00Z',
    updatedAt: '2026-07-30T15:00:00Z',
    mtPeExperience: '1-3',
    hoursAvailable: 25,
    hasSignedNda: true,
    ndaUrl: 'https://mlconnections.com/nda/giovanni_rossi.pdf'
  }
];

export const seed10DummyVendors = async (): Promise<void> => {
  try {
    for (const vendor of SEEDED_DUMMY_VENDORS) {
      await setDoc(doc(db, 'vendors', vendor.id), vendor, { merge: true });
    }
    console.log("Successfully seeded 10 dummy vendors into Firestore.");
  } catch (err) {
    console.error("Failed to seed 10 dummy vendors into Firestore", err);
  }
};
