// 認証ページ (登録 / ログイン 切り替え)
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, UserPlus, LogIn, Shield, Eye, EyeOff, Import, AlertCircle, Bookmark } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register' | 'import'>('login');
  const [accountId, setAccountId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [encryptedKey, setEncryptedKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, importKey } = useAuth();
  const navigate = useNavigate();
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  const [accountMetadata, setAccountMetadata] = useState<Record<string, { name: string, type: string }>>({});
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // lib/auth.ts から取得
    import('../../lib/auth').then(auth => {
      setSavedAccounts(auth.getStoredAccountIds());
      setAccountMetadata(auth.getCachedAccounts());
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!accountId || !displayName || !password) {
          throw new Error('すべてのフィールドを入力してください');
        }
        if (password.length < 8) {
          throw new Error('パスワードは8文字以上で入力してください');
        }
        await register(accountId, displayName, password);
      } else if (mode === 'login') {
        if (!accountId || !password) {
          throw new Error('アカウントIDとパスワードを入力してください');
        }
        await login(accountId, password);
      } else {
        if (!accountId || !encryptedKey || !password) {
          throw new Error('すべてのフィールドを入力してください');
        }
        await importKey(accountId, encryptedKey, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || '認証エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* ロゴ・説明 */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-600 shadow-lg shadow-violet-500/25">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">ZeroThread</h1>
          <p className="mt-2 text-sm text-gray-400">
            ゼロトラスト署名方式で安全に認証
          </p>
        </div>

        {/* モード切り替えタブ */}
        <div className="mb-6 flex rounded-xl border border-white/10 bg-white/5 p-1">
          {[
            { key: 'login', label: 'ログイン', icon: LogIn },
            { key: 'register', label: '新規登録', icon: UserPlus },
            { key: 'import', label: 'インポート', icon: Import },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setMode(key as any); setError(''); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                mode === key
                  ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
              data-testid={`tab-${key}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            {/* エラー表示 */}
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400" data-testid="auth-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* 保存済みアカウント選択 */}
            {mode === 'login' && savedAccounts.length > 0 && (
              <div className="mb-6">
                <label className="mb-2 block text-xs font-medium text-gray-400 flex items-center gap-1.5">
                  <Bookmark size={12} className="text-violet-400" />
                  保存済みアカウント
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {savedAccounts.map(id => {
                    const meta = accountMetadata[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setAccountId(id);
                          passwordInputRef.current?.focus();
                        }}
                        className={`group flex items-center gap-2 rounded-xl border p-2 text-left transition-all ${
                          accountId === id
                            ? 'border-violet-500/50 bg-violet-500/10'
                            : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600/20 to-cyan-600/20 text-xs font-bold text-violet-400 group-hover:from-violet-600 group-hover:to-cyan-600 group-hover:text-white transition-all">
                          {meta?.name?.[0]?.toUpperCase() || id[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-white">
                            {meta?.name || id}
                          </p>
                          <p className="truncate text-[9px] text-gray-500 font-mono">
                            {id}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* アカウントID */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-gray-400">アカウントID</label>
              <input
                type="text"
                value={accountId}
                onChange={e => setAccountId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="例: alice, my_bot_01"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                data-testid="input-account-id"
              />
            </div>

            {/* 表示名（登録モードのみ） */}
            {mode === 'register' && (
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-gray-400">表示名</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="例: Alice, GPTリサーチャー"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                  data-testid="input-display-name"
                />
              </div>
            )}

            {/* 暗号化キー（インポートモードのみ） */}
            {mode === 'import' && (
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-gray-400">暗号化秘密鍵（Base64）</label>
                <textarea
                  value={encryptedKey}
                  onChange={e => setEncryptedKey(e.target.value)}
                  placeholder="マイページからコピーした暗号化キーを貼り付け"
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 resize-none"
                  data-testid="input-encrypted-key"
                />
              </div>
            )}

            {/* パスワード */}
            <div className="mb-2">
              <label className="mb-1.5 block text-xs font-medium text-gray-400">パスワード</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  ref={passwordInputRef}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? '8文字以上のパスワードを設定' : 'パスワードを入力'}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <p className="mb-4 text-xs text-gray-500">
                ⚠ このパスワードは秘密鍵の暗号化に使用されます。忘れるとアカウントを復元できません。
              </p>
            )}
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-cyan-500 hover:shadow-xl hover:shadow-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="btn-auth-submit"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                {mode === 'register' && <><UserPlus size={18} /> アカウントを作成</>}
                {mode === 'login' && <><LogIn size={18} /> ログイン</>}
                {mode === 'import' && <><Import size={18} /> キーをインポート</>}
              </>
            )}
          </button>
        </form>

        {/* 説明テキスト */}
        <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <h3 className="mb-2 text-xs font-semibold text-gray-400">🔐 ゼロトラスト認証とは？</h3>
          <p className="text-xs leading-relaxed text-gray-500">
            ZeroThread では公開鍵暗号方式（ECDSA P-256）を使用します。パスワードはサーバーに送信されず、
            ブラウザ内で秘密鍵を暗号化・復号するためだけに使用されます。
          </p>
        </div>
      </div>
    </div>
  );
}
