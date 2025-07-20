import { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types/database';

// --- Константы для логики входа ---
const MAX_LOGIN_ATTEMPTS = 3; // Максимальное количество попыток входа
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 минут в миллисекундах

// --- Вспомогательные функции для localStorage ---
const getLockoutTime = (): number | null => {
  const savedLock = localStorage.getItem('loginLockUntil');
  if (savedLock) {
    const lockTime = parseInt(savedLock, 10);
    return lockTime > Date.now() ? lockTime : null;
  }
  return null;
};

const setLockoutTime = (time: number) => {
  localStorage.setItem('loginLockUntil', time.toString());
};

const clearLockoutTime = () => {
  localStorage.removeItem('loginLockUntil');
};

const getLastEmail = (): string => {
  return localStorage.getItem('lastEmail') || '';
};

const setLastEmail = (email: string) => {
  localStorage.setItem('lastEmail', email);
};

// --- Основной хук useAuth ---
export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Ошибка при загрузке данных пользователя:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Ошибка при загрузке пользователя:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    const initialLockTime = getLockoutTime();
    if (initialLockTime) {
      setLockUntil(initialLockTime);
      setIsLocked(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const userData = await fetchUserData(session.user.id);
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
            fetchUserData(session.user.id).then(userData => {
                setUser(userData);
            });
        }
        setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    if (getLockoutTime()) {
      setAuthError('Доступ временно заблокирован.');
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);

        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          const newLockTime = Date.now() + LOCKOUT_DURATION_MS;
          setLockoutTime(newLockTime);
          setLockUntil(newLockTime);
          setIsLocked(true);
          setAuthError(`Покури пока. Доступ заблокирован на 5 минут`);
        } else {
          setAuthError('Неверный email или пароль');
        }
      } else {
        setFailedAttempts(0);
        setLastEmail(email);
        clearLockoutTime();
        setIsLocked(false);
      }
    } catch (err) {
      setAuthError('Произошла непредвиденная ошибка при входе.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  const isAdmin = () => user?.role === 'admin';
  const isAdminAssistant = () => user?.role === 'admin_assistant';
  const isSectionChief = () => user?.role === 'section_chief';
  const canViewAllSections = () => isAdmin() || isAdminAssistant();
  const canEditEmployee = (employeeSectionId: string) => {
    return isAdmin() || (isSectionChief() && user?.section_id === employeeSectionId);
  };

  return {
    session,
    user,
    loading,
    authError,
    isLocked,
    lockUntil,
    signIn,
    signOut,
    getLastEmail,
    isAdmin,
    isAdminAssistant,
    isSectionChief,
    canViewAllSections,
    canEditEmployee,
  };
};