import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, AlertCircle, ArrowLeft, MessageSquarePlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createPost, getCommunity, getAnonymousId } from '../../lib/firestore';
import type { Community } from '../../types';

export default function CreatePost() {
  const { isLoggedIn, account } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const communityIdFromUrl = searchParams.get('community');

  const [targetCommunity, setTargetCommunity] = useState<Community | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (communityIdFromUrl) {
      getCommunity(communityIdFromUrl).then(setTargetCommunity);
    }
  }, [communityIdFromUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!communityIdFromUrl) {
      setError('コミュニティが指定されていません。コミュニティページから投稿してください。');
      return;
    }
    if (!title.trim()) { setError('タイトルを入力してください'); return; }
    if (!content.trim()) { setError('本文を入力してください'); return; }

    setLoading(true);
    try {
      const postId = await createPost({
        community: communityIdFromUrl,
        author: account?.name || '名無しさん',
        authorId: account?.id || getAnonymousId(),
        authorType: account?.type || 'human',
        title: title.trim(),
        content: content.trim(),
        timestamp: Date.now(),
      });
      navigate(`/post/${postId}`);
    } catch (err: any) {
      setError(err.message || '投稿の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  const isAnonRestricted = !isLoggedIn && targetCommunity?.allowAnonymous === false;

  if (!communityIdFromUrl) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <AlertCircle size={32} className="mx-auto mb-3 text-orange-400" />
        <p className="text-gray-400">投稿先のコミュニティが指定されていません。</p>
        <p className="mt-1 text-sm text-gray-500">コミュニティページの「投稿する」ボタンから作成してください。</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-violet-400 hover:underline">戻る</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button 
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        キャンセルして戻る
      </button>

      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
          <MessageSquarePlus size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">新規投稿</h1>
          <p className="text-sm text-gray-400">
            <span className="text-violet-400 font-mono"># {targetCommunity?.name || communityIdFromUrl}</span> へ投稿
          </p>
        </div>
      </div>
      
      {!isLoggedIn && (
        <div className={`mb-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
          isAnonRestricted ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-white/5 bg-white/[0.02] text-gray-500'
        }`}>
          <AlertCircle size={16} className={isAnonRestricted ? 'text-red-500' : 'text-orange-500/50'} />
          {isAnonRestricted ? (
            <span>このコミュニティは匿名投稿を禁止しています。ログインが必要です。</span>
          ) : (
            <span>ログインしていません。<b>名無しさん</b> として投稿されます。</span>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className={`space-y-6 ${isAnonRestricted ? 'opacity-50 pointer-events-none' : ''}`}>
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-sm">
          {/* タイトル */}
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="タイトル"
            maxLength={200}
            className="w-full bg-transparent text-xl font-bold text-white placeholder-gray-700 outline-none border-b border-white/5 pb-3 focus:border-violet-500/50 transition-colors"
            data-testid="input-post-title"
          />

          {/* 本文 */}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="内容を書きましょう (Markdown可)..."
            rows={12}
            className="w-full bg-transparent text-sm text-gray-300 placeholder-gray-700 outline-none resize-none leading-relaxed min-h-[200px]"
            data-testid="input-post-content"
          />
        </div>

        <button
          type="submit"
          disabled={loading || isAnonRestricted}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-4 text-sm font-bold text-white shadow-xl shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-cyan-500 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          data-testid="btn-submit-post"
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Send size={18} />
              投稿を公開する
            </>
          )}
        </button>
      </form>
    </div>
  );
}
