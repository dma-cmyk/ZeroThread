import { Reply, Trash2, UserX, Ban } from 'lucide-react';
import type { Comment } from '../../types';
// import UserBadge from '../common/UserBadge';
import CommentForm from './CommentForm';

interface CommentItemProps {
  comment: Comment & { children?: any[] };
  allComments: Comment[];
  depth?: number;
  activeReplyId?: string | null;
  onReply?: (commentId: string | null) => void;
  /** 削除可能かどうか（投稿者本人 or コミュニティオーナー） */
  canDelete?: boolean;
  /** 削除ハンドラ */
  onDelete?: (commentId: string) => void;
  /** BANされているユーザーIDのリスト */
  bannedUsers?: string[];
  /** BANされているコメントIDのリスト */
  bannedCommentIds?: string[];
  /** コミュニティのオーナーかどうか */
  isOwner?: boolean;
  /** ワンタッチBANハンドラ */
  onQuickBan?: (userId: string) => void;
  /** コンテンツ非表示ハンドラ */
  onToggleHide?: (commentId: string) => void;
}

/** @メンションをリンクに変換 */
function renderContent(content: string): React.ReactNode[] {
  const parts = content.split(/(@[a-z0-9_]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const userId = part.slice(1);
      return (
        <span
          key={i}
          className="cursor-pointer rounded bg-violet-500/20 px-1 py-0.5 text-violet-400 hover:bg-violet-500/30 transition-colors"
          data-testid={`mention-${userId}`}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

export default function CommentItem({
  comment,
  allComments,
  depth = 0,
  activeReplyId,
  onReply,
  canDelete,
  onDelete,
  bannedUsers = [],
  bannedCommentIds = [],
  isOwner = false,
  onQuickBan,
  onToggleHide
}: CommentItemProps) {
  const isReplying = activeReplyId === comment.id;
  const hasChildren = comment.children && comment.children.length > 0;
  const nextDepth = depth + 1;
  const isAuthorBanned = bannedUsers.includes(comment.authorId);
  const isCommentBanned = bannedCommentIds.includes(comment.id);

  if (comment.isDeleted || isAuthorBanned || isCommentBanned) {
    const placeholder = isAuthorBanned 
      ? '[このユーザーはBANされました]' 
      : (isCommentBanned ? '[このコメントはモデレーターにより非表示に設定されました]' : '[このコメントは削除されました]');
    
    return (
      <div className={`mt-4 border-l-2 border-white/5 pl-4 opacity-50`}>
        <p className="text-xs italic text-gray-500">{placeholder}</p>
        <div className="mt-2 text-[10px] text-gray-600">
          {timeAgo(comment.timestamp)}
        </div>
        {hasChildren && (
          <div className="mt-2 space-y-4">
            {comment.children!.map((child) => (
              <CommentItem
                key={child.id}
                comment={child}
                allComments={allComments}
                depth={nextDepth}
                activeReplyId={activeReplyId}
                onReply={onReply}
                canDelete={canDelete}
                onDelete={onDelete}
                bannedUsers={bannedUsers}
                bannedCommentIds={bannedCommentIds}
                isOwner={isOwner}
                onQuickBan={onQuickBan}
                onToggleHide={onToggleHide}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`mt-4 group`}>
      <div className="flex gap-3">
        {/* インデント線 */}
        <div className="relative w-0.5 shrink-0">
          <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors" />
        </div>

        <div className="flex-1">
          <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 transition-colors hover:border-white/10 hover:bg-white/[0.02]">
            {/* 投稿者情報 */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-violet-400">{comment.author}</span>
              <button
                onClick={() => isOwner && comment.authorId !== 'anonymous' && onQuickBan?.(comment.authorId)}
                disabled={!isOwner || comment.authorId === 'anonymous'}
                className={`font-mono text-[10px] transition-colors ${
                  isOwner && comment.authorId !== 'anonymous'
                    ? 'text-violet-400 hover:text-red-400 cursor-pointer'
                    : 'text-gray-600'
                }`}
                title={isOwner ? 'クリックしてユーザーをBAN/解除' : ''}
              >
                ({comment.authorId.slice(0, 8)})
              </button>
              <span className="text-gray-500">• {timeAgo(comment.timestamp)}</span>
              {isOwner && comment.authorId !== 'anonymous' && (
                <button
                  onClick={() => onQuickBan?.(comment.authorId)}
                  className="flex items-center gap-0.5 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500 transition-colors hover:bg-red-500/20"
                  title="このユーザーを即座にBAN"
                >
                  <UserX size={10} />
                  BAN
                </button>
              )}
              {isOwner && !isCommentBanned && (
                <button
                  onClick={() => onToggleHide?.(comment.id)}
                  className="flex items-center gap-0.5 rounded-md bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-bold text-orange-500 transition-colors hover:bg-orange-500/20"
                  title="このコメントのみを非表示にする"
                >
                  <Ban size={10} />
                  非表示
                </button>
              )}
            </div>

            {/* 本文 */}
            <div className="mt-2 text-sm leading-relaxed text-gray-200">
              {renderContent(comment.content)}
            </div>

            {/* アクション */}
            <div className="mt-3 flex items-center gap-4">
              <button
                onClick={() => onReply?.(isReplying ? null : comment.id)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  isReplying ? 'text-violet-400' : 'text-gray-500 hover:text-white'
                }`}
                data-testid={`btn-reply-${comment.id}`}
              >
                <Reply size={14} />
                返信
              </button>
              {canDelete && (
                <button
                  onClick={() => onDelete?.(comment.id)}
                  className="flex items-center gap-1.5 text-xs text-red-500/30 hover:text-red-500 transition-colors"
                  data-testid={`btn-delete-comment-${comment.id}`}
                >
                  <Trash2 size={14} />
                  削除
                </button>
              )}
            </div>

            {/* 返信フォーム */}
            {isReplying && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <CommentForm
                  postId={comment.postId}
                  parentId={comment.id}
                  onSuccess={() => onReply?.(null)}
                />
              </div>
            )}
          </div>

          {/* 子コメント（スレッド） */}
          {hasChildren && (
            <div className="space-y-4">
              {comment.children!.map((child) => (
                <CommentItem
                  key={child.id}
                  comment={child}
                  allComments={allComments}
                  depth={nextDepth}
                  activeReplyId={activeReplyId}
                  onReply={onReply}
                  canDelete={canDelete}
                  onDelete={onDelete}
                  bannedUsers={bannedUsers}
                  bannedCommentIds={bannedCommentIds}
                  isOwner={isOwner}
                  onQuickBan={onQuickBan}
                  onToggleHide={onToggleHide}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
