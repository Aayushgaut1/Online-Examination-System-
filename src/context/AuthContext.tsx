import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Student } from '../types';
import { api } from '../services/api';
import { supabase, isSupabaseConfigured, checkSupabaseConfig } from '../services/supabase';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  student: Student | null;
  token: string | null;
  isAuthenticated: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  isSupabaseConfigured: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  register: (data: { name: string; email: string; password: string; role?: string; roll_no?: string }) => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const toast = useToast();

  const refreshUser = useCallback(async () => {
    const config = checkSupabaseConfig();
    if (!config.valid) {
      setUser(null);
      setStudent(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUser(null);
        setStudent(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      setToken(session.access_token);
      const data = await api.getMe();
      setUser(data.user);
      setStudent(data.student || null);
    } catch (err: any) {
      console.warn('[AuthContext] Session synchronization note:', err?.message);
      setUser(null);
      setStudent(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen to Supabase Auth state changes as the single source of truth
  useEffect(() => {
    refreshUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setToken(session.access_token);
        try {
          const data = await api.getMe();
          setUser(data.user);
          setStudent(data.student || null);
        } catch {}
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setStudent(null);
        setToken(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<User | null> => {
    try {
      setIsLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const data = await api.login(cleanEmail, password);
      setToken(data.token);
      setUser(data.user);
      setStudent(data.student || null);
      toast.success(`Welcome back, ${data.user.name}!`, 'Authentication Successful');
      return data.user;
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Please verify credentials in Supabase.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    roll_no?: string;
  }): Promise<User | null> => {
    try {
      setIsLoading(true);
      const res = await api.register({
        ...data,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase()
      });
      setToken(res.token);
      setUser(res.user);
      setStudent(res.student || null);
      toast.success(`Account created successfully for ${res.user.name}!`, 'Registration Complete');
      return res.user;
    } catch (err: any) {
      toast.error(err.message || 'Registration failed in Supabase.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Logout Error]', err);
    }
    setToken(null);
    setUser(null);
    setStudent(null);
    toast.info('You have been logged out securely.', 'Session Ended');
  };

  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';
  const isStudent = user?.role === 'STUDENT';
  const isAdmin = user?.role === 'ADMIN';
  const isAuthenticated = Boolean(user && token);

  return (
    <AuthContext.Provider
      value={{
        user,
        student,
        token,
        isAuthenticated,
        isTeacher,
        isStudent,
        isAdmin,
        isLoading,
        isSupabaseConfigured,
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
