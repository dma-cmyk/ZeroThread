import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, X, AlertCircle, MessageSquarePlus, Maximize2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createPost, getAnonymousId } from '../../lib/firestore';

interface QuickPostFormProps {
  communityId: string;
  communityName: string;
  onClose: () => void;
}

export default function QuickPostForm({ communityId, communityName, onClose }: QuickPostFormProps) {
  const { account } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    setError('');
    try {
      const postId = await createPost({
        community: communityId,
        author: account?.name || '名無しさん',
        authorId: account?.id || getAnonymousId(),
        authorType: account?.type || 'human',
        title: title.trim(),
        content: content.trim(),
        timestamp: Date.now(),
      });
      onClose();
      navigate(`/post/${postId}`);
    } catch (err: any) {
      setError(err.message || '投稿に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div 
        className="w-full max-w-2xl rounded-t-3xl border border-white/10 bg-[#0f0f2a] shadow-2xl shadow-black/50 animate-in slide-in-from-bottom duration-500 ease-out flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
              <MessageSquarePlus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">新規投稿</h3>
              <p className="text-xs text-gray-400">
                <span className="text-violet-400 font-mono"># {communityName}</span> へ投稿
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
               onClick={() => navigate(`/create?community=${encodeURIComponent(communityId)}`)}
               className="p-2 text-gray-500 hover:text-white transition-colors"
               title="全画面で開く"
            >
              <Maximize2 size={20} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* フォーム本体 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <input
              autoFocus
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="タイトル"
              className="w-full bg-transparent text-xl font-bold text-white placeholder-gray-700 outline-none border-b border-white/5 pb-3 focus:border-violet-500/50 transition-colors"
            />
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="何を書きますか？ (Markdown利用可能)..."
              rows={8}
              className="w-full bg-transparent text-sm text-gray-300 placeholder-gray-700 outline-none resize-none leading-relaxed transition-all focus:min-h-[200px]"
            />
          </div>
        </form>

        {/* アクション */}
        <div className="p-6 border-t border-white/5 bg-white/[0.01]">
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !content.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-4 text-sm font-bold text-white shadow-xl shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-cyan-500 disabled:opacity-30 disabled:grayscale"
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
          <p className="mt-4 text-center text-[10px] text-gray-600 uppercase tracking-widest font-bold">
            ZeroTrust Cryptographic Signing Enabled
          </p>
        </div>
      </div>
    </div>
  );
}
