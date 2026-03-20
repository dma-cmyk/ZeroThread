// 投稿詳細ページ（フラットなコメントスレッド付き）
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Clock, AlertTriangle, ChevronLeft, UserX, Ban, Loader2 } from 'lucide-react';
import { getPost, subscribeToCommentsRealtime, deletePost, deleteComment, getCommunity, subscribeToCommunityRealtime, banUser, banPost, unbanPost, banComment, unbanComment } from '../../lib/firestore';
import type { Post, Comment, Community } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import VoteButton from '../common/VoteButton';
import UserBadge from '../common/UserBadge';
import CommentForm from '../comment/CommentForm';
import CommentItem from '../comment/CommentItem';

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

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { isLoggedIn, account } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    
    setLoading(true);
    let unsubscribeCommunity: (() => void) | undefined;

    getPost(postId).then(p => {
      if (p) {
        setPost(p);
        unsubscribeCommunity = subscribeToCommunityRealtime(p.community, (c) => {
          setCommunity(c);
        });
      }
      setLoading(false);
    }).catch(err => {
      console.error('投稿取得エラー:', err);
      setLoading(false);
    });

    return () => {
      if (unsubscribeCommunity) unsubscribeCommunity();
    };
  }, [postId]);

  useEffect(() => {
    if (!postId) return;
    const unsubscribe = subscribeToCommentsRealtime(postId, (newComments) => {
      setComments(newComments);
    });
    return () => unsubscribe();
  }, [postId]);

  const isPostBanned = community?.bannedPostIds?.includes(post?.id || '');
  const isOwner = !!(isLoggedIn && account && community?.ownerId === account.id);

  async function handleTogglePostHide() {
    if (!community || !post || !confirm(`この投稿を非表示にしますか？\n(可逆的な操作です)`)) return;
    try {
      await banPost(community.id, post.id);
      const updated = await getCommunity(community.id);
      setCommunity(updated);
    } catch (err) {
      console.error('投稿非表示エラー:', err);
    }
  }

  async function handleQuickBan(userId: string) {
    if (!community || !confirm(`ユーザー ${userId} をこのコミュニティからBANしますか？\n全ての投稿・コメントが非表示になります。`)) return;
    try {
      await banUser(community.id, userId);
      const updated = await getCommunity(community.id);
      setCommunity(updated);
    } catch (err) {
      console.error('BAN エラー:', err);
    }
  }

  /** コメントをツリー構造に整理する */
  const commentTree = (() => {
    const map = new Map<string, any>();
    comments.forEach(c => map.set(c.id, { ...c, children: [] }));
    
    const roots: any[] = [];
    map.forEach(c => {
      const parentId = (c as any).parentId;
      if (parentId && map.has(parentId)) {
        map.get(parentId)!.children.push(c);
      } else {
        roots.push(c);
      }
    });
    return roots;
  })();

  async function handleDeletePost() {
    if (!post || !confirm('この投稿を削除しますか？')) return;
    try {
      await deletePost(post.id);
      navigate(`/community/${encodeURIComponent(post.community)}`);
    } catch (err) {
      console.error('投稿削除エラー:', err);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('このコメントを削除しますか？')) return;
    try {
      await deleteComment(commentId);
    } catch (err) {
      console.error('コメント削除エラー:', err);
    }
  }

  async function handleToggleCommentHide(commentId: string) {
    if (!community) return;
    const isBanned = community.bannedCommentIds?.includes(commentId);
    if (!isBanned && !confirm('このコメントを非表示にしますか？')) return;
    try {
      if (isBanned) {
        await unbanComment(community.id, commentId);
      } else {
        await banComment(community.id, commentId);
      }
      const updated = await getCommunity(community.id);
      setCommunity(updated);
    } catch (err) {
      console.error('コメント非表示切替エラー:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-violet-400" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="rounded-2xl border border-white/10 p-8 text-center">
        <p className="text-gray-400">投稿が見つかりませんでした</p>
      </div>
    );
  }

  const isBannedUser = community?.bannedUsers?.includes(post.authorId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ChevronLeft size={16} />
        戻る
      </button>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-xl">
        <div className="flex gap-4">
          <VoteButton postId={post.id} votes={post.votes} />
          
          <div className="min-w-0 flex-1">
            {/* メタ情報 */}
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <Link to={`/community/${encodeURIComponent(post.community)}`} className="font-bold text-violet-400 hover:underline">
                c/{post.community}
              </Link>
              <span>•</span>
              <div className="flex items-center gap-1">
                <UserBadge type={post.authorType || 'human'} name={post.author} />
                <button
                  onClick={() => isOwner && post.authorId !== account?.id && !isBannedUser && handleQuickBan(post.authorId)}
                  disabled={!isOwner || post.authorId === account?.id || isBannedUser}
                  className={`font-mono text-[10px] transition-colors ${
                    isOwner && post.authorId !== account?.id && !isBannedUser
                      ? 'text-violet-400 hover:text-red-400 cursor-pointer'
                      : 'text-gray-600'
                  }`}
                  title={isOwner ? 'クリックしてこのユーザーをBAN' : ''}
                >
                  ({post.authorId.slice(0, 8)})
                </button>
                {isOwner && post.authorId !== account?.id && !isBannedUser && (
                  <button
                    onClick={() => handleQuickBan(post.authorId)}
                    className="ml-1 flex items-center gap-0.5 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500 transition-colors hover:bg-red-500/20"
                    title="このユーザーを即座にBAN"
                  >
                    <UserX size={10} />
                    BAN
                  </button>
                )}
                {isBannedUser && (
                  <span className="ml-1 rounded-md bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/20">
                    BAN済
                  </span>
                )}
              </div>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {timeAgo(post.timestamp)}
              </span>
            </div>

            <h1 className="mb-4 text-2xl font-bold text-white">{post.title}</h1>

            {/* 本文 */}
            <div className="whitespace-pre-wrap leading-relaxed text-gray-200">
              {isPostBanned || isBannedUser
                ? <span className="flex items-center gap-2 text-gray-500 italic"><AlertTriangle size={16}/>{isBannedUser ? '[このユーザーはBANされました]' : '[この投稿はモデレーターにより非表示に設定されました]'}</span>
                : post.content}
            </div>

            {/* アクションバー */}
            <div className="mt-6 flex items-center gap-4 border-t border-white/5 pt-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <MessageSquare size={14} />
                {comments.length} コメント
              </div>
              {isLoggedIn && (account?.id === post.authorId || isOwner) && (
                <button
                  onClick={handleDeletePost}
                  className="flex items-center gap-1.5 text-xs text-red-500/50 hover:text-red-500 transition-colors"
                >
                  <AlertTriangle size={14} />
                  削除
                </button>
              )}
              {isOwner && !isPostBanned && (
                <button
                  onClick={handleTogglePostHide}
                  className="flex items-center gap-1.5 text-xs text-orange-500/50 hover:text-orange-500 transition-colors"
                  title="投稿を非表示にする"
                >
                  <Ban size={14} />
                  非表示にする
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* コメント投稿フォーム */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-white">コメントを投稿</h2>
        {(!isLoggedIn && community?.allowAnonymous === false) ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-gray-400">このコミュニティでは匿名投稿が制限されています。<br/>投稿するにはログインしてください。</p>
          </div>
        ) : (
          <CommentForm postId={post.id} />
        )}
      </div>

      {/* コメント一覧 */}
      <div className="mt-8 space-y-6">
        {commentTree.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">まだコメントがありません</p>
        ) : (
          commentTree.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              allComments={comments}
              activeReplyId={activeReplyId}
              onReply={setActiveReplyId}
              canDelete={isLoggedIn && (account?.id === comment.authorId || isOwner)}
              onDelete={handleDeleteComment}
              bannedUsers={community?.bannedUsers || []}
              bannedCommentIds={community?.bannedCommentIds || []}
              isOwner={isOwner}
              onQuickBan={handleQuickBan}
              onToggleHide={handleToggleCommentHide}
            />
          ))
        )}
      </div>
    </div>
  );
}
