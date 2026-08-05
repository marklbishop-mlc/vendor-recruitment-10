import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { UserProfile, UserRole } from './types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAsMock: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  isMockMode: boolean;
  syncError: string | null;
  switchRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GOOGLE_ADMIN_EMAIL = 'mark@mlconnections.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMockMode, setIsMockMode] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Sync Firebase authenticated user with Firestore user document
  const syncUserProfile = useCallback(async (firebaseUser: FirebaseUser) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    try {
      const userDocSnap = await getDoc(userDocRef);
      let profile: UserProfile;
      const userEmail = (firebaseUser.email || '').toLowerCase();

      // Check if there are any pre-created user records for this email address
      let preCreatedProfile: UserProfile | null = null;
      let orphanDocId: string | null = null;

      if (userEmail) {
        try {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const q = query(collection(db, 'users'), where('email', '==', userEmail));
          const emailSnap = await getDocs(q);
          emailSnap.forEach((d) => {
            if (d.id !== firebaseUser.uid) {
              const data = d.data() as UserProfile;
              const currentPre = preCreatedProfile as UserProfile | null;
              if (!currentPre || data.role === 'admin' || (data.role === 'manager' && currentPre.role !== 'admin')) {
                preCreatedProfile = data;
              }
              orphanDocId = d.id;
            }
          });
        } catch (e) {
          console.warn("Could not query users by email", e);
        }
      }

      const preRole = preCreatedProfile ? (preCreatedProfile as UserProfile).role : null;
      const preName = preCreatedProfile ? (preCreatedProfile as UserProfile).displayName : null;
      const preCreated = preCreatedProfile ? (preCreatedProfile as UserProfile).createdAt : null;

      const isMlcDomain = userEmail.endsWith('@mlconnections.com');

      if (!userDocSnap.exists()) {
        // Promote all @mlconnections.com staff to Admin by default, or inherit pre-created role
        let assignedRole: UserRole = isMlcDomain ? 'admin' : 'user';
        if (preRole) {
          assignedRole = preRole;
        }

        profile = {
          uid: firebaseUser.uid,
          email: userEmail,
          displayName: firebaseUser.displayName || preName || 'MLC Staff Member',
          role: assignedRole,
          createdAt: preCreated || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await setDoc(userDocRef, profile);
      } else {
        const existingData = userDocSnap.data() as UserProfile;
        
        // Determine highest role between existing profile and pre-created profile
        let finalRole: UserRole = existingData.role;
        if (isMlcDomain && (existingData.role === 'user' || !existingData.role)) {
          finalRole = 'admin';
        } else if (preRole === 'admin') {
          finalRole = 'admin';
        } else if (preRole === 'manager' && existingData.role === 'user') {
          finalRole = 'manager';
        }

        if (finalRole !== existingData.role || (preName && (!existingData.displayName || existingData.displayName === 'MLC User'))) {
          profile = {
            ...existingData,
            displayName: (existingData.displayName && existingData.displayName !== 'MLC User') ? existingData.displayName : (firebaseUser.displayName || preName || existingData.displayName),
            role: finalRole,
            updatedAt: new Date().toISOString()
          };
          await setDoc(userDocRef, profile, { merge: true });
        } else {
          profile = existingData;
        }
      }

      // Delete the orphan dummy document if found so duplicate rows don't exist
      if (orphanDocId) {
        try {
          const { doc: docFn, deleteDoc } = await import('firebase/firestore');
          await deleteDoc(docFn(db, 'users', orphanDocId));
        } catch (e) {
          console.warn("Could not clean up orphan user doc", e);
        }
      }

      setUser(profile);
      setIsMockMode(false);
      setSyncError(null);
    } catch (err) {
      console.warn("Firestore connection failed. Running in simulation mode.", err);
      setSyncError(err instanceof Error ? err.message : String(err));
      // Fallback to local sandbox user on connection failures (useful if database is not provisioned yet)
      const userEmail = (firebaseUser.email || '').toLowerCase();
      const isMlcDomain = userEmail.endsWith('@mlconnections.com');
      const assignedRole: UserRole = isMlcDomain ? 'admin' : 'user';
      setUser({
        uid: firebaseUser.uid,
        email: userEmail,
        displayName: firebaseUser.displayName || 'MLC Staff Member',
        role: assignedRole,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setIsMockMode(true);
    }
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await syncUserProfile(firebaseUser);
      } else {
        // If not authenticated in Firebase, check if we have a mocked session
        const storedMock = localStorage.getItem('mlc_mock_user');
        if (storedMock) {
          setUser(JSON.parse(storedMock));
          setIsMockMode(true);
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncUserProfile]);

  // Developer Simulation Mock Login
  const loginAsMock = useCallback(async (role: UserRole) => {
    setLoading(true);
    const mockUsers: Record<UserRole, UserProfile> = {
      admin: {
        uid: 'mock-admin-mark',
        email: GOOGLE_ADMIN_EMAIL,
        displayName: 'Mark Bishop (Admin)',
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      manager: {
        uid: 'mock-manager-sarah',
        email: 'sarah.recruiter@mlconnections.com',
        displayName: 'Sarah Jenkins (Manager)',
        role: 'manager',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      user: {
        uid: 'mock-user-basic',
        email: 'read.only@mlconnections.com',
        displayName: 'Basic User (PM Reader)',
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const selectedMock = mockUsers[role];
    setUser(selectedMock);
    setIsMockMode(true);
    localStorage.setItem('mlc_mock_user', JSON.stringify(selectedMock));
    setLoading(false);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setLoading(true);
    setSyncError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await syncUserProfile(result.user);
    } catch (err: any) {
      console.error("Google Auth Error", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setSyncError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [syncUserProfile]);

  // Logout action
  const logout = useCallback(async () => {
    setLoading(true);
    localStorage.removeItem('mlc_mock_user');
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn("Firebase SignOut error", err);
    }
    setUser(null);
    setIsMockMode(false);
    setLoading(false);
  }, []);

  // Developer role switching helper
  const switchRole = useCallback(async (role: UserRole) => {
    if (isMockMode && user) {
      const mockUsers: Record<UserRole, UserProfile> = {
        admin: {
          uid: 'mock-admin-mark',
          email: GOOGLE_ADMIN_EMAIL,
          displayName: 'Mark Bishop (Admin)',
          role: 'admin',
          createdAt: user.createdAt,
          updatedAt: new Date().toISOString(),
        },
        manager: {
          uid: 'mock-manager-sarah',
          email: 'sarah.recruiter@mlconnections.com',
          displayName: 'Sarah Jenkins (Manager)',
          role: 'manager',
          createdAt: user.createdAt,
          updatedAt: new Date().toISOString(),
        },
        user: {
          uid: 'mock-user-basic',
          email: 'read.only@mlconnections.com',
          displayName: 'Basic User (PM Reader)',
          role: 'user',
          createdAt: user.createdAt,
          updatedAt: new Date().toISOString(),
        },
      };
      
      const updatedUser = mockUsers[role];
      setUser(updatedUser);
      localStorage.setItem('mlc_mock_user', JSON.stringify(updatedUser));
    } else if (user) {
      // If live mode and user is admin, allow writing role update to database
      const userDocRef = doc(db, 'users', user.uid);
      try {
        const updatedProfile = { ...user, role, updatedAt: new Date().toISOString() };
        await setDoc(userDocRef, { role }, { merge: true });
        setUser(updatedProfile);
      } catch (err) {
        console.error("Failed to update live user role", err);
      }
    }
  }, [isMockMode, user]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginWithGoogle, 
      loginAsMock,
      logout, 
      isMockMode, 
      syncError,
      switchRole 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
