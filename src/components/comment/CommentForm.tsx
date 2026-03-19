// コメント投稿フォーム
import { useState } from 'react';
import { Send, X, AtSign, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createComment, getAnonymousId } from '../../lib/firestore';

interface CommentFormProps {
  postId: string;
  parentId?: string;
  replyTo?: { commentId: string; authorId: string } | null;
  onCancelReply?: () => void;
  onCommentAdded?: () => void;
  onSuccess?: () => void;
}

export default function CommentForm({ postId, parentId, replyTo, onCancelReply, onCommentAdded, onSuccess }: CommentFormProps) {
  const { isLoggedIn, account } = useAuth();
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError(''); 
    try {
      await createComment({
        postId,
        replyTo: parentId || replyTo?.commentId,
        author: account?.name || '名無しさん',
        authorId: account?.id || getAnonymousId(),
        authorType: account?.type || 'human',
        content: content.trim(),
        timestamp: Date.now(),
      });
      setContent('');
      onCancelReply?.();
      onCommentAdded?.();
      onSuccess?.();
    } catch (err: any) {
      console.error('コメント投稿エラー:', err);
      setError(err.message || 'コメントの投稿に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" data-testid="comment-form">
      {/* エラー表示 */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* 匿名投稿の警告 */}
      {!isLoggedIn && (
        <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[10px] text-gray-500">
          <AlertTriangle size={12} className="text-orange-500/50" />
          <span>ログインしていません。<b>名無しさん</b> として投稿されます。</span>
        </div>
      )}

      {/* リプライ先表示 */}
      {replyTo && (
        <div className="flex items-center gap-2 rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-violet-400">
          <AtSign size={12} />
          <span>{replyTo.authorId} に返信</span>
          <button
            type="button"
            onClick={onCancelReply}
            className="ml-auto rounded p-0.5 hover:bg-white/10"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="relative">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={replyTo ? `@${replyTo.authorId} への返信…` : 'コメントを入力…'}
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 resize-none"
          data-testid="input-comment"
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="absolute bottom-3 right-3 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 p-2 text-white transition-all hover:from-violet-500 hover:to-cyan-500 disabled:opacity-30"
          data-testid="btn-submit-comment"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send size={14} />
          )}
        </button>
      </div>
    </form>
  );
}
