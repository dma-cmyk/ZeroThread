// マイページ（プロフィール設定）
import { useState } from 'react';
import { User, Copy, Check, Save, Shield, Code, Terminal, ArrowRightLeft, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getEncryptedKey, changeAccountPassword } from '../../lib/auth';
import { updateAccountName, isDemoMode } from '../../lib/firestore';

export default function ProfilePage() {
  const { isLoggedIn, account, refreshSession } = useAuth();
  const [newName, setNewName] = useState(account?.name || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  
  // パスワード変更用ステート
  const [passwordOld, setPasswordOld] = useState('');
  const [passwordNew, setPasswordNew] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [pwMessage, setPwMessage] = useState('');
  const [pwStatus, setPwStatus] = useState<'success' | 'error' | ''>('');

  // デベロッパーツール用ステート
  const [showDevTools, setShowDevTools] = useState(false);
  const [base64Input, setBase64Input] = useState('');
  const [base64Output, setBase64Output] = useState('');
  const [lsData, setLsData] = useState<Record<string, string>>({});
  const [parsedKey, setParsedKey] = useState<any | null>(null);

  if (!isLoggedIn || !account) {
    return (
      <div className="rounded-2xl border border-white/10 p-8 text-center">
        <p className="text-gray-400">マイページにアクセスするにはログインが必要です</p>
      </div>
    );
  }

  const encryptedKey = getEncryptedKey(account.id);

  async function handleSaveName() {
    if (!newName.trim() || newName === account?.name) return;
    setSaving(true);
    try {
      await updateAccountName(account!.id, newName.trim());
      // セッション内の account 情報も更新
      const sessionData = localStorage.getItem('zt_session');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        parsed.account.name = newName.trim();
        localStorage.setItem('zt_session', JSON.stringify(parsed));
      }
      refreshSession();
      setMessage('表示名を更新しました');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('名前更新エラー:', err);
      setMessage('更新に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  function handleCopyKey() {
    if (!encryptedKey) return;
    navigator.clipboard.writeText(encryptedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handlePasswordChange() {
    if (!passwordOld || !passwordNew || passwordNew !== passwordConfirm) return;
    setChangingPw(true);
    setPwMessage('');
    setPwStatus('');

    try {
      await changeAccountPassword(account!.id, passwordOld, passwordNew);
      setPwMessage('パスワードを変更しました。秘密鍵が新しいパスワードで再暗号化されました。');
      setPwStatus('success');
      setPasswordOld('');
      setPasswordNew('');
      setPasswordConfirm('');
    } catch (err: any) {
      setPwMessage(err.message || 'パスワード変更に失敗しました');
      setPwStatus('error');
    } finally {
      setChangingPw(false);
    }
  }

  // Base64 ユーティリティ
  const handleBase64Decode = () => {
    try {
      // Base64URL にも対応
      const normalized = base64Input.replace(/-/g, '+').replace(/_/g, '/');
      const binString = atob(normalized);
      const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
      setBase64Output(new TextDecoder().decode(bytes));
    } catch (err) {
      setBase64Output('エラー: 無効な Base64 形式です');
    }
  };

  const handleBase64Encode = () => {
    try {
      const bytes = new TextEncoder().encode(base64Input);
      const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
      setBase64Output(btoa(binString));
    } catch (err) {
      setBase64Output('エラー: エンコードに失敗しました');
    }
  };

  // Local Storage ユーティリティ
  const refreshLsData = () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('zt_')) {
        data[key] = localStorage.getItem(key) || '';
      }
    }
    setLsData(data);
  };

  const toHex = (bytes: Uint8Array) => 
    Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(' ');

  const handleParseKey = () => {
    try {
      const normalized = base64Input.replace(/-/g, '+').replace(/_/g, '/').trim();
      const binary = atob(normalized);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      if (bytes.length < 32) {
        setParsedKey({ error: 'データサイズが不足しています（有効な ZT 鍵ではありません）' });
        return;
      }

      const iterations = new Uint32Array(bytes.buffer.slice(0, 4))[0];
      const salt = bytes.slice(4, 20);
      const iv = bytes.slice(20, 32);
      const body = bytes.slice(32);

      setParsedKey({
        length: bytes.length,
        iterations: iterations.toLocaleString(),
        salt: toHex(salt),
        iv: toHex(iv),
        bodyHex: toHex(body.slice(0, 32)) + (body.length > 32 ? '...' : ''),
        bodyLen: body.length
      });
    } catch (err) {
      setParsedKey({ error: '解析に失敗しました。正しい Base64 形式ではありません。' });
    }
  };

  const deleteLsKey = (key: string) => {
    if (confirm(`キー "${key}" を削除しますか？\nこの操作は元に戻せません。`)) {
      localStorage.removeItem(key);
      refreshLsData();
    }
  };

  const handleHardReset = () => {
    if (confirm('【警告】すべてのアプリデータ（アカウント、検索履歴、コミュニティ、投稿など）を完全に削除して初期化しますか？\nこの操作は取り消せません。')) {
      // zt_ で始まるすべてのキーを削除
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('zt_')) keys.push(key);
      }
      keys.forEach(k => localStorage.removeItem(k));
      
      alert('データを初期化しました。ログアウトします。');
      localStorage.removeItem('zt_session');
      window.location.href = '/';
    }
  };

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-xl font-bold text-white">
        <User size={24} className="text-violet-400" />
        マイページ
      </h1>

      <div className="space-y-4">
        {/* アカウント情報 */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-400">アカウント情報</h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">アカウントID</label>
              <p className="font-mono text-sm text-white">{account.id}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">アカウント種別</label>
              <p className="text-sm text-white capitalize">{account.type}</p>
            </div>
          </div>
        </div>

        {/* 表示名変更 */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-400">表示名の変更</h2>

          {message && (
            <div className="mb-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-400">
              {message}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="新しい表示名"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
              data-testid="input-display-name-edit"
            />
            <button
              onClick={handleSaveName}
              disabled={saving || !newName.trim() || newName === account.name}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50"
              data-testid="btn-save-name"
            >
              <Save size={14} />
              保存
            </button>
          </div>
        </div>

        {/* パスワード変更 */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-400">パスワードの変更</h2>
          
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">現在のパスワード</label>
              <input
                type="password"
                value={passwordOld}
                onChange={e => setPasswordOld(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/50"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-gray-500">新しいパスワード</label>
                <input
                  type="password"
                  value={passwordNew}
                  onChange={e => setPasswordNew(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">新しいパスワード (確認)</label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/50"
                />
              </div>
            </div>
            {pwMessage && (
              <p className={`text-xs ${pwStatus === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                {pwMessage}
              </p>
            )}
            <button
              onClick={handlePasswordChange}
              disabled={changingPw || !passwordOld || !passwordNew || passwordNew !== passwordConfirm}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-white/10 disabled:opacity-30"
            >
              {changingPw ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                'パスワードを更新して秘密鍵を再暗号化'
              )}
            </button>
            <p className="text-[10px] text-gray-600 text-center">
              ※ パスワードを変更すると、この端末に保存されている署名用秘密鍵が新しいパスワードで上書きされます。
            </p>
          </div>
        </div>

        {/* 公開鍵 */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-400">
            <Shield size={14} />
            暗号化情報
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">公開鍵 (JWK)</label>
              <div className="rounded-xl bg-black/30 p-3 text-xs text-gray-400 font-mono break-all max-h-24 overflow-y-auto">
                {account.publicKeyJwk ? JSON.stringify(account.publicKeyJwk, null, 2) : '（署名無しアカウント）'}
              </div>
            </div>

            {encryptedKey && (
              <div>
                <label className="mb-1 block text-xs text-gray-500">暗号化秘密鍵（Base64）</label>
                <div className="relative">
                  <div className="rounded-xl bg-black/30 p-3 pr-12 text-xs text-gray-400 font-mono break-all max-h-24 overflow-y-auto">
                    {encryptedKey}
                  </div>
                  <button
                    onClick={handleCopyKey}
                    className="absolute right-2 top-2 rounded-lg bg-white/5 p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
                    data-testid="btn-copy-key"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  💡 この暗号化キーを別の端末にインポートすることで、同じアカウントでログインできます。
                </p>
              </div>
            )}
          </div>
        </div>

        {/* デベロッパーツール（折りたたみ） */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <button
            onClick={() => {
              if (!showDevTools) refreshLsData();
              setShowDevTools(!showDevTools);
            }}
            className="flex w-full items-center justify-between p-6 transition-colors hover:bg-white/[0.04]"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-400">
              <Code size={18} className="text-cyan-400" />
              デベロッパーツール (Beta)
            </div>
            <div className={`text-xs text-gray-500 transition-transform ${showDevTools ? 'rotate-180' : ''}`}>
              ▼
            </div>
          </button>

          {showDevTools && (
            <div className="border-t border-white/10 p-6 space-y-8 animate-in slide-in-from-top-2 duration-200">
              {/* Base64 */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <ArrowRightLeft size={14} />
                  Base64 ユーティリティ (UTF-8)
                </h3>
                <textarea
                  value={base64Input}
                  onChange={e => setBase64Input(e.target.value)}
                  placeholder="ここに文字列または Base64 を入力"
                  className="w-full h-24 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-gray-300 font-mono outline-none focus:border-cyan-500/50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleBase64Decode}
                    className="flex-1 rounded-xl bg-cyan-600/20 py-2 text-xs font-bold text-cyan-400 border border-cyan-500/20 hover:bg-cyan-600/30"
                  >
                    デコード ↓
                  </button>
                  <button
                    onClick={handleBase64Encode}
                    className="flex-1 rounded-xl bg-violet-600/20 py-2 text-xs font-bold text-violet-400 border border-violet-500/20 hover:bg-violet-600/30"
                  >
                    エンコード ↓
                  </button>
                </div>
                {base64Output && (
                  <div className="relative group">
                    <div className="w-full min-h-[4rem] max-h-48 overflow-y-auto rounded-xl bg-black/50 p-3 text-xs text-emerald-400 font-mono break-all border border-emerald-500/20">
                      {base64Output}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(base64Output);
                        alert('コピーしました');
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* ZeroThread Key Parser */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <Shield size={14} />
                  ZeroThread 署名鍵パーサー
                </h3>
                <p className="text-[10px] text-gray-600">
                  ※ 暗号化された秘密鍵を貼り付けると、内部の暗号化パラメータを分解して表示します。
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleParseKey}
                    className="flex-1 rounded-xl bg-orange-600/20 py-2 text-xs font-bold text-orange-400 border border-orange-500/20 hover:bg-orange-600/30"
                  >
                    鍵をパース (解析)
                  </button>
                  <button
                    onClick={() => setParsedKey(null)}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs text-gray-500 hover:bg-white/5"
                  >
                    リセット
                  </button>
                </div>
                
                {parsedKey && (
                  <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-3 animate-in zoom-in-95 duration-200">
                    {parsedKey.error ? (
                      <p className="text-xs text-red-400">{parsedKey.error}</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-600 uppercase">PBKDF2 Iterations</label>
                          <p className="text-xs font-mono text-orange-300">{parsedKey.iterations}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-600 uppercase">Total Size</label>
                          <p className="text-xs font-mono text-gray-400">{parsedKey.length} bytes</p>
                        </div>
                        <div className="col-span-full space-y-1">
                          <label className="text-[10px] text-gray-600 uppercase">Salt (16 bytes)</label>
                          <p className="text-[10px] font-mono text-gray-400 break-all bg-black/20 p-1.5 rounded-lg">{parsedKey.salt}</p>
                        </div>
                        <div className="col-span-full space-y-1">
                          <label className="text-[10px] text-gray-600 uppercase">IV (12 bytes)</label>
                          <p className="text-[10px] font-mono text-gray-400 break-all bg-black/20 p-1.5 rounded-lg">{parsedKey.iv}</p>
                        </div>
                        <div className="col-span-full space-y-1">
                          <label className="text-[10px] text-gray-600 uppercase">Encrypted Body ({parsedKey.bodyLen} bytes)</label>
                          <p className="text-[10px] font-mono text-gray-500 break-all bg-black/20 p-1.5 rounded-lg">{parsedKey.bodyHex}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Local Storage Viewer */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <Terminal size={14} />
                    Local Storage ビューアー (zt_*)
                  </h3>
                  <button
                    onClick={refreshLsData}
                    className="p-1 rounded-lg hover:bg-white/5 text-gray-500"
                    title="再読み込み"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {Object.entries(lsData).sort().map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-white/5 bg-black/20 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-violet-400">{key}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(value);
                              alert('値をコピーしました');
                            }}
                            className="p-1 text-gray-600 hover:text-gray-300"
                            title="値をコピー"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            onClick={() => deleteLsKey(key)}
                            className="p-1 text-gray-600 hover:text-red-400"
                            title="キーを削除"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono break-all line-clamp-3">
                        {value}
                      </div>
                    </div>
                  ))}
                  {Object.keys(lsData).length === 0 && (
                    <p className="text-center py-4 text-xs text-gray-600 italic">データがありません</p>
                  )}
                </div>

                {/* Hard Reset */}
                <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
                  <h4 className="mb-2 text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                    <Trash2 size={14} />
                    危険な操作
                  </h4>
                  <p className="mb-4 text-[11px] text-gray-500 leading-relaxed">
                    デモモードのすべてのローカルデータを削除して工場出荷状態に戻します。<br/>
                    本番環境（Firebase）のデータには影響しません。
                  </p>
                  <button
                    onClick={handleHardReset}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600/10 border border-red-500/30 py-3 text-xs font-bold text-red-500 hover:bg-red-600 hover:text-white transition-all"
                  >
                    アプリデータを完全に初期化する
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
