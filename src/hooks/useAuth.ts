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
  const [visitUpdated, setVisitUpdated] = useState(false);

  const fetchUserData = useCallback(async (userId: string, updateVisit: boolean = false) => {
    try {
      // Обновляем время последнего визита при входе
      if (updateVisit) {
        console.log('Обновляем время последнего визита для пользователя:', userId);
        const { data: updateResult, error: rpcError } = await supabase.rpc('update_user_last_visit', { user_id: userId });
        if (rpcError) {
          console.error('Ошибка при обновлении времени визита:', rpcError);
        } else {
          console.log('Время последнего визита успешно обновлено, результат:', updateResult);
        }
      }

      // Небольшая задержка после обновления, чтобы изменения успели примениться
      if (updateVisit) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Ошибка при загрузке данных пользователя:', error);
        return null;
      }
      
      if (updateVisit) {
        console.log('Загруженные данные пользователя после обновления:', {
          id: data.id,
          full_name: data.full_name,
          last_visit_at: data.last_visit_at,
          last_action_at: data.last_action_at
        });
        
        // Уведомляем о том, что данные пользователя обновились
        window.dispatchEvent(new CustomEvent('userDataUpdated', { 
          detail: data 
        }));
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user) {
        // Обновляем время последнего визита только при входе
        const shouldUpdateVisit = event === 'SIGNED_IN';
        const userData = await fetchUserData(session.user.id, shouldUpdateVisit);
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session?.user && !visitUpdated) {
            // При загрузке приложения обновляем время визита только один раз
            setVisitUpdated(true);
            fetchUserData(session.user.id, true).then(userData => {
                setUser(userData);
            });
        } else if (session?.user) {
            // Если уже обновляли, просто загружаем данные
            fetchUserData(session.user.id, false).then(userData => {
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

  const updateLastAction = async () => {
    if (user?.id) {
      try {
        await supabase.rpc('update_user_last_action', { user_id: user.id });
        // Обновляем данные пользователя после действия
        const userData = await fetchUserData(user.id, false);
        setUser(userData);
      } catch (error) {
        console.error('Ошибка при обновлении времени последнего действия:', error);
      }
    }
  };

  const refreshUserData = async () => {
    if (user?.id) {
      const userData = await fetchUserData(user.id, false);
      setUser(userData);
      return userData;
    }
    return null;
  };

  const updateLastVisit = async () => {
    if (user?.id) {
      try {
        await supabase.rpc('update_user_last_visit', { user_id: user.id });
        console.log('Время последнего визита обновлено при активности');
        // Обновляем данные пользователя
        const userData = await fetchUserData(user.id, false);
        setUser(userData);
      } catch (error) {
        console.warn('Не удалось обновить время последнего визита:', error);
      }
    }
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
    updateLastAction,
    refreshUserData,
    updateLastVisit,
  };
};