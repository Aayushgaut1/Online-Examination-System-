import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Student } from '../types';
import { api } from '../services/api';
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
  login: (email: string, password: string) => Promise<User | null>;
  register: (data: { name: string; email: string; password: string; role?: string; roll_no?: string }) => Promise<User | null>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('nexusexam_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const toast = useToast();

  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem('nexusexam_token');
    if (!savedToken) {
      setUser(null);
      setStudent(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
      setStudent(data.student || null);
    } catch (err) {
      console.warn('Session check failed, clearing token');
      localStorage.removeItem('nexusexam_token');
      setToken(null);
      setUser(null);
      setStudent(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<User | null> => {
    try {
      setIsLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const data = await api.login(cleanEmail, password);
      localStorage.setItem('nexusexam_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setStudent(data.student || null);
      toast.success(`Welcome back, ${data.user.name}!`, 'Authentication Successful');
      return data.user;
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Please check your credentials.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { name: string; email: string; password: string; role?: string; roll_no?: string }): Promise<User | null> => {
    try {
      setIsLoading(true);
      const res = await api.register({
        ...data,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase()
      });
      localStorage.setItem('nexusexam_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setStudent(res.student || null);
      toast.success(`Account created successfully for ${res.user.name}!`, 'Registration Complete');
      return res.user;
    } catch (err: any) {
      toast.error(err.message || 'Registration failed.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('nexusexam_token');
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
