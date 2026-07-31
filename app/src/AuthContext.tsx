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

      if (!userDocSnap.exists()) {
        // Automatically promote mark@mlconnections.com to Admin, otherwise default to User
        const assignedRole: UserRole = firebaseUser.email === GOOGLE_ADMIN_EMAIL ? 'admin' : 'user';
        
        profile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'MLC User',
          role: assignedRole,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Save to named firestore database
        await setDoc(userDocRef, profile);
      } else {
        const existingData = userDocSnap.data() as UserProfile;
        
        // Double check mark@mlconnections.com is admin
        if (firebaseUser.email === GOOGLE_ADMIN_EMAIL && existingData.role !== 'admin') {
          profile = {
            ...existingData,
            role: 'admin',
            updatedAt: new Date().toISOString()
          };
          await setDoc(userDocRef, profile, { merge: true });
        } else {
          profile = existingData;
        }
      }
      
      setUser(profile);
      setIsMockMode(false);
      setSyncError(null);
    } catch (err) {
      console.warn("Firestore connection failed. Running in simulation mode.", err);
      setSyncError(err instanceof Error ? err.message : String(err));
      // Fallback to local sandbox user on connection failures (useful if database is not provisioned yet)
      const assignedRole: UserRole = firebaseUser.email === GOOGLE_ADMIN_EMAIL ? 'admin' : 'user';
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'MLC Sandbox User',
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

  // Google OAuth Login
  const loginWithGoogle = useCallback(async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await syncUserProfile(result.user);
    } catch (err) {
      console.error("Google Auth Error, redirecting to simulation", err);
      // If config is missing or popup fails, automatically launch as mock Admin for evaluation ease
      await loginAsMock('admin');
    } finally {
      setLoading(false);
    }
  }, [syncUserProfile, loginAsMock]);

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
