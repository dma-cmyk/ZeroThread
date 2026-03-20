// コミュニティ作成フォーム
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createCommunity } from '../../lib/firestore';

export default function CreateCommunity() {
  const { isLoggedIn, account } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    // 自動スラグ生成（英数字とアンダースコアのみ）
    const autoSlug = value.replace(/\//g, '_');
    setSlug(autoSlug);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn || !account) return;
    setError('');

    if (!name.trim()) { setError('コミュニティ名を入力してください'); return; }
    if (!slug.trim()) { setError('IDを入力してください'); return; }

    const communityId = slug;
    setLoading(true);

    try {
      await createCommunity({
        id: communityId,
        name: name.trim(),
        description: description.trim(),
        ownerId: account.id,
        bannedUsers: [],
        bannedIpHashes: [],
        createdAt: Date.now(),
      });
      navigate(`/community/${encodeURIComponent(communityId)}`);
    } catch (err: any) {
      setError(err.message || 'コミュニティの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-white/10 p-8 text-center">
        <p className="text-gray-400">コミュニティを作成するにはログインが必要です</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-xl font-bold text-white">
        <Sparkles size={24} className="text-violet-400" />
        コミュニティを作成
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <label className="mb-2 block text-xs font-medium text-gray-400">コミュニティ名</label>
          <input
            type="text"
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="例: AI研究、テクノロジー"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
            data-testid="input-community-name"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <label className="mb-2 block text-xs font-medium text-gray-400">コミュニティID</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-mono">c/</span>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value.replace(/\//g, ''))}
              placeholder="community_id"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 font-mono"
              data-testid="input-community-id"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <label className="mb-2 block text-xs font-medium text-gray-400">説明（任意）</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="コミュニティの説明を入力…"
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 resize-none"
            data-testid="input-community-description"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50"
          data-testid="btn-submit-community"
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Hash size={16} />
              コミュニティを作成
            </>
          )}
        </button>
      </form>
    </div>
  );
}
