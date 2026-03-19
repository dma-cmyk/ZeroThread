// 認証状態のグローバル管理
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthSession, Account } from '../types';
import { restoreSession, loginAccount, registerAccount, logout as logoutAuth, importAccountKey } from '../lib/auth';

interface AuthContextType {
  session: AuthSession | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  /** ログイン中のアカウント情報 */
  account: Account | null;
  /** ログイン */
  login: (accountId: string, password: string) => Promise<void>;
  /** 新規登録 */
  register: (accountId: string, displayName: string, password: string) => Promise<void>;
  /** ログアウト */
  logout: () => void;
  /** 鍵インポート */
  importKey: (accountId: string, encryptedKey: string, password: string) => Promise<void>;
  /** セッション更新 */
  refreshSession: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 起動時にセッション復元
  useEffect(() => {
    const restored = restoreSession();
    if (restored && restored.accountId && restored.account) {
      setSession({
        accountId: restored.accountId,
        account: restored.account,
        privateKey: restored.privateKey || null,
      });
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (accountId: string, password: string) => {
    const s = await loginAccount(accountId, password);
    setSession(s);
  }, []);

  const register = useCallback(async (accountId: string, displayName: string, password: string) => {
    const s = await registerAccount(accountId, displayName, password);
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    logoutAuth();
    setSession(null);
  }, []);

  const importKey = useCallback(async (accountId: string, encryptedKey: string, password: string) => {
    const s = await importAccountKey(accountId, encryptedKey, password);
    setSession(s);
  }, []);

  const refreshSession = useCallback(() => {
    const restored = restoreSession();
    if (restored && restored.accountId && restored.account) {
      setSession(prev => ({
        accountId: restored.accountId!,
        account: restored.account!,
        privateKey: prev?.privateKey || null,
      }));
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      session,
      isLoading,
      isLoggedIn: !!session,
      account: session?.account || null,
      login,
      register,
      logout,
      importKey,
      refreshSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth は AuthProvider 内で使用してください');
  return ctx;
}
