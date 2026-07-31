import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserProfile, UserRole } from './types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  isMockMode: boolean;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMockMode, setIsMockMode] = useState<boolean>(true);

  // Set initial mock user for easy local evaluation
  useEffect(() => {
    // Simulate loading state
    const timer = setTimeout(() => {
      setUser({
        uid: 'mock-admin-uid-123',
        email: 'admin@multilingualconnections.com',
        displayName: 'MLC Administrator (Demo)',
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const login = useCallback(async (role: UserRole) => {
    setLoading(true);
    // Mock login based on role
    const mockUsers: Record<UserRole, UserProfile> = {
      admin: {
        uid: 'mock-admin-uid-123',
        email: 'admin@multilingualconnections.com',
        displayName: 'MLC Administrator (Demo)',
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      recruiter: {
        uid: 'mock-recruiter-uid-456',
        email: 'recruiter@multilingualconnections.com',
        displayName: 'Sarah Jenkins (Recruitment Lead)',
        role: 'recruiter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      vendor: {
        uid: 'mock-vendor-uid-789',
        email: 'vendor@translationpros.com',
        displayName: 'Jean-Pierre (Spanish/French Translator)',
        role: 'vendor',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    setTimeout(() => {
      setUser(mockUsers[role]);
      setIsMockMode(true);
      setLoading(false);
    }, 300);
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setTimeout(() => {
      setUser(null);
      setLoading(false);
    }, 200);
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    setUser((prev) => {
      if (!prev) return null;
      const displayNames: Record<UserRole, string> = {
        admin: 'MLC Administrator (Demo)',
        recruiter: 'Sarah Jenkins (Recruitment Lead)',
        vendor: 'Jean-Pierre (Spanish/French Translator)',
      };
      const emails: Record<UserRole, string> = {
        admin: 'admin@multilingualconnections.com',
        recruiter: 'recruiter@multilingualconnections.com',
        vendor: 'vendor@translationpros.com',
      };
      return {
        ...prev,
        role,
        displayName: displayNames[role],
        email: emails[role],
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isMockMode, switchRole }}>
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
