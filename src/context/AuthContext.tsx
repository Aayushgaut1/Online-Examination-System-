import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import { User, Student } from '../types';
import { api } from '../services/api';
import {
  supabase,
  isSupabaseConfigured,
  checkSupabaseConfig,
} from '../services/supabase';

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

  register: (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    roll_no?: string;
  }) => Promise<User | null>;

  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const toast = useToast();

  // Prevent multiple simultaneous profile loads
  const refreshingRef = useRef(false);

  /**
   * Load the current authenticated user's profile.
   *
   * Supabase Auth is the source of truth for authentication.
   * public.users is only the application profile.
   */
  const refreshUser = useCallback(async () => {
    if (refreshingRef.current) {
      return;
    }

    refreshingRef.current = true;

    try {
      const config = checkSupabaseConfig();

      if (!config.valid) {
        setUser(null);
        setStudent(null);
        setToken(null);
        return;
      }

      // Get the current Supabase session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.warn(
          '[AuthContext] Failed to get Supabase session:',
          sessionError.message
        );

        setUser(null);
        setStudent(null);
        setToken(null);
        return;
      }

      // No authenticated session
      if (!session || !session.user) {
        setUser(null);
        setStudent(null);
        setToken(null);
        return;
      }

      // Session exists
      setToken(session.access_token);

      /**
       * The database trigger creates public.users after
       * auth.users is created.
       *
       * Give the trigger a moment and retry profile loading.
       */
      let profileLoaded = false;

      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const data = await api.getMe();

          if (data?.user) {
            setUser(data.user);
            setStudent(data.student || null);
            profileLoaded = true;
            break;
          }
        } catch (err: any) {
          console.warn(
            `[AuthContext] Profile load attempt ${attempt + 1} failed:`,
            err?.message
          );
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      if (!profileLoaded) {
        console.warn(
          '[AuthContext] Auth session exists but application profile could not be loaded.'
        );

        setUser(null);
        setStudent(null);
        setToken(null);
      }
    } finally {
      refreshingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  /**
   * Listen to Supabase authentication changes.
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      if (!mounted) return;

      await refreshUser();
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      console.log(
        '[AuthContext] Supabase auth event:',
        event,
        Boolean(session)
      );

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setStudent(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      if (
        (event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION') &&
        session
      ) {
        /**
         * IMPORTANT:
         *
         * Do not call api.getMe() directly inside this callback.
         * Signup/profile-trigger operations can still be completing.
         *
         * refreshUser() handles retries safely.
         */
        setToken(session.access_token);

        setTimeout(() => {
          if (mounted) {
            refreshUser();
          }
        }, 300);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  /**
   * LOGIN
   */
  const login = async (
    email: string,
    password: string
  ): Promise<User | null> => {
    try {
      setIsLoading(true);

      const cleanEmail = email.trim().toLowerCase();

      const data = await api.login(cleanEmail, password);

      if (!data || !data.user) {
        throw new Error('Login succeeded but user profile was not found.');
      }

      // Supabase session is already created by api.login()
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setToken(session?.access_token || data.token || null);

      setUser(data.user);
      setStudent(data.student || null);

      toast.success(
        `Welcome back, ${data.user.name}!`,
        'Authentication Successful'
      );

      return data.user;
    } catch (err: any) {
      console.error('[AuthContext] Login error:', err);

      setUser(null);
      setStudent(null);
      setToken(null);

      toast.error(
        err?.message ||
          'Login failed. Please verify your email and password.'
      );

      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * REGISTER
   */
  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    roll_no?: string;
  }): Promise<User | null> => {
    try {
      setIsLoading(true);

      const cleanData = {
        ...data,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
      };

      /**
       * api.register():
       *
       * 1. Creates auth.users
       * 2. Database trigger creates public.users
       * 3. Fetches the application profile
       *
       * It must NOT manually insert public.users from the browser.
       */
      const res = await api.register(cleanData);

      if (!res || !res.user) {
        throw new Error(
          'Account was created, but the user profile could not be loaded.'
        );
      }

      /**
       * Get the actual Supabase session instead of relying only
       * on the token returned by api.register().
       */
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error(
          'Account created, but no active session was returned. Please log in.'
        );
      }

      setToken(session.access_token);

      setUser(res.user);
      setStudent(res.student || null);

      toast.success(
        `Account created successfully for ${res.user.name}!`,
        'Registration Complete'
      );

      return res.user;
    } catch (err: any) {
      console.error('[AuthContext] Registration error:', err);

      setUser(null);
      setStudent(null);
      setToken(null);

      toast.error(
        err?.message ||
          'Registration failed. Please try again.'
      );

      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * LOGOUT
   */
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Logout Error]', err);
    }

    setToken(null);
    setUser(null);
    setStudent(null);

    toast.info(
      'You have been logged out securely.',
      'Session Ended'
    );
  };

  const isTeacher =
    user?.role === 'TEACHER' ||
    user?.role === 'ADMIN';

  const isStudent =
    user?.role === 'STUDENT';

  const isAdmin =
    user?.role === 'ADMIN';

  /**
   * User is authenticated only when BOTH:
   *
   * 1. Supabase session token exists
   * 2. Application profile exists
   */
  const isAuthenticated =
    Boolean(user && token);

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
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};