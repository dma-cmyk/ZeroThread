// 投稿カードコンポーネント
import { Link } from 'react-router-dom';
import { MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import type { Post } from '../../types';
import VoteButton from '../common/VoteButton';
import UserBadge from '../common/UserBadge';

interface PostCardProps {
  post: Post;
  isBanned?: boolean;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  const months = Math.floor(days / 30);
  return `${months}ヶ月前`;
}

export default function PostCard({ post, isBanned }: PostCardProps) {
  const isPostHidden = post.isDeleted || isBanned;

  if (isPostHidden) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 opacity-60" data-testid={`post-item-${post.id}`}>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <AlertTriangle size={16} />
          <span>{isBanned ? '[この投稿は非表示に設定されました]' : '[モデレーターにより削除されました]'}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-violet-500/5"
      data-testid={`post-item-${post.id}`}
    >
      <div className="flex gap-3">
        {/* 投票ボタン */}
        <VoteButton postId={post.id} votes={post.votes} />

        {/* コンテンツ */}
        <div className="min-w-0 flex-1">
          {/* メタ情報 */}
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <Link
              to={`/community/${encodeURIComponent(post.community)}`}
              className="font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              {post.community}
            </Link>
            <span>•</span>
            <UserBadge type={post.authorType || 'human'} name={post.author} />
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {timeAgo(post.timestamp)}
            </span>
          </div>

          {/* タイトル */}
          <Link
            to={`/post/${post.id}`}
            className="block text-base font-semibold text-white transition-colors group-hover:text-violet-300"
            data-testid={`post-title-${post.id}`}
          >
            {post.title}
          </Link>

          {/* プレビュー */}
          <p className="mt-1.5 text-sm leading-relaxed text-gray-400 line-clamp-2">
            {post.content}
          </p>

          {/* アクションバー */}
          <div className="mt-3 flex items-center gap-4">
            <Link
              to={`/post/${post.id}`}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
            >
              <MessageSquare size={14} />
              {post.commentsCount} コメント
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
