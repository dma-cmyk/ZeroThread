// モデレーションダッシュボード
// コミュニティオーナーが管理操作を行うための専用ページ
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Shield, ArrowLeft, Ban, Trash2, UserX,
  AlertTriangle, Loader2, CheckCircle, XCircle
} from 'lucide-react';
import {
  getCommunity, getPosts,
  banUser, unbanUser,
  banPost, unbanPost,
  banComment, unbanComment,
  updateCommunitySettings
} from '../../lib/firestore';
import { useAuth } from '../../contexts/AuthContext';
import type { Community, Post, Comment } from '../../types';

/** トースト通知の型 */
interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

export default function ModerationPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const decodedId = communityId ? decodeURIComponent(communityId) : '';
  const { isLoggedIn, account } = useAuth();

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'comments' | 'bans'>('posts');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [banInput, setBanInput] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!decodedId) return;
    loadData();
  }, [decodedId]);

  async function loadData() {
    setLoading(true);
    try {
      const c = await getCommunity(decodedId);
      setCommunity(c);
      const p = await getPosts(decodedId, 'new', 100);
      
      // フロントエンドでの整合性（デモモード時のlocalStorage優先）
      const allPosts = (JSON.parse(localStorage.getItem('zt_posts') || '[]') as Post[])
        .filter((post: Post) => post.community === decodedId)
        .sort((a: Post, b: Post) => b.timestamp - a.timestamp);
      setPosts(allPosts.length > 0 ? allPosts : p);

      const allComments = (JSON.parse(localStorage.getItem('zt_comments') || '[]') as Comment[])
        .filter((comment: Comment) => {
          const postIds = new Set((allPosts.length > 0 ? allPosts : p).map((pp: Post) => pp.id));
          return postIds.has(comment.postId);
        })
        .sort((a: Comment, b: Comment) => b.timestamp - a.timestamp);
      setComments(allComments);
    } catch (err) {
      console.error('モデレーションデータ取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }

  /** トースト表示 */
  function showToast(type: 'success' | 'error', message: string) {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }

  /** 投稿のBAN/解除切り替え */
  async function handleTogglePostBan(postId: string) {
    if (!community) return;
    const isBanned = community.bannedPostIds?.includes(postId);
    setProcessingId(postId);
    try {
      if (isBanned) {
        await unbanPost(community.id, postId);
        setCommunity(prev => prev ? {
          ...prev,
          bannedPostIds: (prev.bannedPostIds || []).filter(id => id !== postId)
        } : null);
        showToast('success', '投稿を表示状態に戻しました');
      } else {
        await banPost(community.id, postId);
        setCommunity(prev => prev ? {
          ...prev,
          bannedPostIds: [...(prev.bannedPostIds || []), postId]
        } : null);
        showToast('success', '投稿を非表示にしました');
      }
    } catch {
      showToast('error', '操作に失敗しました');
    } finally {
      setProcessingId(null);
    }
  }

  /** コメントのBAN/解除切り替え */
  async function handleToggleCommentBan(commentId: string) {
    if (!community) return;
    const isBanned = community.bannedCommentIds?.includes(commentId);
    setProcessingId(commentId);
    try {
      if (isBanned) {
        await unbanComment(community.id, commentId);
        setCommunity(prev => prev ? {
          ...prev,
          bannedCommentIds: (prev.bannedCommentIds || []).filter(id => id !== commentId)
        } : null);
        showToast('success', 'コメントを表示状態に戻しました');
      } else {
        await banComment(community.id, commentId);
        setCommunity(prev => prev ? {
          ...prev,
          bannedCommentIds: [...(prev.bannedCommentIds || []), commentId]
        } : null);
        showToast('success', 'コメントを非表示にしました');
      }
    } catch {
      showToast('error', '操作に失敗しました');
    } finally {
      setProcessingId(null);
    }
  }

  /** ユーザーをBAN */
  async function handleUserBan(targetUserId?: string) {
    const target = targetUserId || banInput.trim();
    if (!target || !community) return;
    if (community.bannedUsers?.includes(target)) {
      showToast('error', 'このユーザーは既にBANされています');
      return;
    }
    
    // ワンタッチBANの場合は確認を入れる
    if (targetUserId && !confirm(`ユーザー ${target} をBANしますか？\n(このユーザーの全ての投稿・コメントが非表示になります)`)) return;

    setProcessingId(targetUserId ? `ban-${targetUserId}` : 'ban');
    try {
      await banUser(community.id, target);
      setCommunity(prev => prev ? {
        ...prev,
        bannedUsers: [...(prev.bannedUsers || []), target]
      } : null);
      setBanInput('');
      showToast('success', `${target} をBANしました`);
    } catch {
      showToast('error', 'BAN に失敗しました');
    } finally {
      setProcessingId(null);
    }
  }

  /** ユーザーのBAN解除 */
  async function handleUserUnban(userId: string) {
    if (!community) return;
    setProcessingId(`unban-${userId}`);
    try {
      await unbanUser(community.id, userId);
      setCommunity(prev => prev ? {
        ...prev,
        bannedUsers: (prev.bannedUsers || []).filter(u => u !== userId)
      } : null);
      showToast('success', `${userId} のBANを解除しました`);
    } catch {
      showToast('error', 'BAN解除に失敗しました');
    } finally {
      setProcessingId(null);
    }
  }

  /** 匿名投稿設定の切り替え */
  async function handleToggleAnonymous() {
    if (!community) return;
    const current = community.allowAnonymous !== false;
    const next = !current;
    try {
      await updateCommunitySettings(community.id, { allowAnonymous: next });
      setCommunity(prev => prev ? { ...prev, allowAnonymous: next } : null);
      showToast('success', next ? '匿名投稿を許可しました' : '匿名投稿を制限しました');
    } catch {
      showToast('error', '設定の更新に失敗しました');
    }
  }

  // 権限チェック
  const isOwner = isLoggedIn && account && community?.ownerId === account.id;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-violet-400" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="rounded-2xl border border-white/10 p-8 text-center">
        <p className="text-gray-400">コミュニティが見つかりません</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <AlertTriangle size={32} className="mx-auto mb-3 text-red-400" />
        <h2 className="text-lg font-bold text-white">アクセス拒否</h2>
        <p className="mt-2 text-sm text-gray-400">
          このページはコミュニティのオーナーのみアクセスできます
        </p>
        <Link
          to={`/community/${encodeURIComponent(community.id)}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300"
        >
          <ArrowLeft size={14} />
          コミュニティに戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* トースト通知 (画面下部中央) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-xs transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 rounded-2xl border px-5 py-3 shadow-2xl backdrop-blur-xl text-sm font-medium transition-all
              ${toast.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
              }`}
          >
            {toast.type === 'success'
              ? <CheckCircle size={16} />
              : <XCircle size={16} />
            }
            {toast.message}
          </div>
        ))}
      </div>

      {/* ヘッダー */}
      <div className="mb-6">
        <Link
          to={`/community/${encodeURIComponent(community.id)}`}
          className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft size={16} />
          {community.name} に戻る
        </Link>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-red-600/10 to-orange-600/10 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20 border border-red-500/30">
              <Shield size={24} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">モデレーションパネル</h1>
              <p className="text-sm text-gray-400">
                <span className="text-red-400 font-mono">{community.name}</span> の管理
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold text-white">{posts.length}</p>
              <p className="text-xs text-gray-500">投稿数</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold text-white">{comments.length}</p>
              <p className="text-xs text-gray-500">コメント数</p>
            </div>
            <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{community.bannedUsers?.length || 0}</p>
              <p className="text-xs text-gray-500">BAN中</p>
            </div>
            <button 
              onClick={handleToggleAnonymous}
              className={`rounded-xl border transition-all p-3 text-center group ${
                community.allowAnonymous !== false 
                  ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10' 
                  : 'border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10'
              }`}
              title="クリックして匿名投稿の許可/制限を切り替え"
            >
              <p className={`text-2xl font-bold ${community.allowAnonymous !== false ? 'text-emerald-400' : 'text-orange-400'}`}>
                {community.allowAnonymous !== false ? '許可' : '制限'}
              </p>
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                匿名投稿
                <CheckCircle size={10} className={community.allowAnonymous !== false ? 'text-emerald-500' : 'hidden'} />
                <XCircle size={10} className={community.allowAnonymous !== false ? 'hidden' : 'text-orange-500'} />
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* タブ */}
      <div className="mb-4 flex gap-1 rounded-xl border border-white/5 bg-white/[0.02] p-1">
        {([
          { key: 'posts', label: '投稿管理', icon: Trash2, count: posts.length },
          { key: 'comments', label: 'コメント管理', icon: Trash2, count: comments.length },
          { key: 'bans', label: 'BAN管理', icon: Ban, count: community.bannedUsers?.length || 0 },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all
              ${activeTab === tab.key
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-300'
              }`}
            data-testid={`tab-${tab.key}`}
          >
            <tab.icon size={14} />
            {tab.label}
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]
              ${activeTab === tab.key ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-500'}
            `}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* コンテンツエリア */}
      <div className="space-y-4">
        {activeTab === 'posts' && (
          <div className="space-y-2">
            {posts.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 py-12 text-center text-sm text-gray-500">
                投稿がありません
              </div>
            )}
            {posts.map(post => {
              const isBanned = community.bannedPostIds?.includes(post.id);
              return (
                <div key={post.id} className={`rounded-xl border p-4 transition-all ${
                  isBanned || post.isDeleted ? 'border-red-500/10 bg-red-500/5 opacity-80' : 'border-white/5 bg-white/[0.02]'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {post.isDeleted && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400 border border-red-500/10">削除済み</span>}
                        {isBanned && <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] text-orange-400 border border-orange-500/10">非表示中</span>}
                        <h3 className="text-sm font-bold text-white truncate">{post.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <button
                          onClick={() => {
                            if (!community?.bannedUsers?.includes(post.authorId)) {
                              setBanInput(post.authorId);
                              handleUserBan(post.authorId);
                            }
                          }}
                          className={`flex items-center gap-1 font-mono transition-colors ${
                            community?.bannedUsers?.includes(post.authorId)
                              ? 'text-red-400'
                              : 'text-violet-400 hover:text-red-400 hover:underline'
                          }`}
                          title={community?.bannedUsers?.includes(post.authorId) ? 'このユーザーは既にBANされています' : 'このユーザーをBANする'}
                        >
                          <UserX size={10} />
                          {post.authorId.slice(0, 16)}...
                          {community?.bannedUsers?.includes(post.authorId) && <span className="text-[8px] sm:hidden">(BAN済)</span>}
                        </button>
                        <span>•</span>
                        <span>{post.author}</span>
                        <span>•</span>
                        <span>{new Date(post.timestamp).toLocaleString()}</span>
                        {community?.bannedUsers?.includes(post.authorId) && (
                          <span className="hidden sm:inline-flex items-center gap-0.5 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[8px] text-red-400 border border-red-500/10">
                            BAN済ユーザー
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-gray-400 line-clamp-1 italic">{post.content}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link to={`/post/${post.id}`} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-white/5 hover:text-white transition-colors">
                        詳細
                      </Link>
                      <button
                        onClick={() => handleTogglePostBan(post.id)}
                        disabled={processingId === post.id}
                        className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
                          isBanned 
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                            : 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        }`}
                      >
                        {processingId === post.id ? <Loader2 size={12} className="animate-spin" /> : (isBanned ? <CheckCircle size={12} /> : <Trash2 size={12} />)}
                        {isBanned ? '表示に戻す' : '非表示にする'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-2">
            {comments.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 py-12 text-center text-sm text-gray-500">
                コメントがありません
              </div>
            )}
            {comments.map(comment => {
              const isBanned = community.bannedCommentIds?.includes(comment.id);
              return (
                <div key={comment.id} className={`rounded-xl border p-4 transition-all ${
                  isBanned || comment.isDeleted ? 'border-red-500/10 bg-red-500/5 opacity-80' : 'border-white/5 bg-white/[0.02]'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {comment.isDeleted && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400 border border-red-500/10">削除済み</span>}
                        {isBanned && <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] text-orange-400 border border-orange-500/10">非表示中</span>}
                        <span className="text-xs font-bold text-white">{comment.author}</span>
                        <span className="text-gray-600">•</span>
                        <button
                          onClick={() => {
                            if (!community?.bannedUsers?.includes(comment.authorId)) {
                              setBanInput(comment.authorId);
                              handleUserBan(comment.authorId);
                            }
                          }}
                          className={`text-[10px] font-mono transition-colors ${
                            community?.bannedUsers?.includes(comment.authorId)
                              ? 'text-red-400'
                              : 'text-violet-400 hover:text-red-400 hover:underline'
                          }`}
                          title={community?.bannedUsers?.includes(comment.authorId) ? 'このユーザーは既にBANされています' : 'このユーザーをBANする'}
                        >
                          {comment.authorId.slice(0, 16)}...
                          {community?.bannedUsers?.includes(comment.authorId) && ' (BAN済)'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-300 line-clamp-2">{comment.content}</p>
                      <p className="mt-1 text-[10px] text-gray-600">
                        {new Date(comment.timestamp).toLocaleString()}
                        {' • '}
                        <Link to={`/post/${comment.postId}`} className="text-violet-500 hover:underline">元の投稿を表示</Link>
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleCommentBan(comment.id)}
                      disabled={processingId === comment.id}
                      className={`flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
                        isBanned 
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                          : 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      }`}
                    >
                      {processingId === comment.id ? <Loader2 size={12} className="animate-spin" /> : (isBanned ? <CheckCircle size={12} /> : <Trash2 size={12} />)}
                      {isBanned ? '表示に戻す' : '非表示にする'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'bans' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <h3 className="mb-3 text-sm font-semibold text-white flex items-center gap-2">
                <UserX size={16} className="text-red-400" />
                ユーザーをBANする
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={banInput}
                  onChange={e => setBanInput(e.target.value)}
                  placeholder="BANするアカウントIDを入力"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500/30 transition-colors"
                />
                <button
                  onClick={() => handleUserBan()}
                  disabled={!banInput.trim() || processingId === 'ban'}
                  className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-40 transition-all"
                >
                  {processingId === 'ban' ? <Loader2 size={14} className="animate-spin" /> : 'BAN'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">BANユーザー一覧 ({community.bannedUsers?.length || 0})</h3>
              {(!community.bannedUsers || community.bannedUsers.length === 0) ? (
                <div className="rounded-xl border border-dashed border-white/10 py-12 text-center text-sm text-gray-500">
                  BANされたユーザーはいません
                </div>
              ) : (
                community.bannedUsers.map(userId => (
                  <div key={userId} className="flex items-center justify-between rounded-xl border border-red-500/10 bg-red-500/5 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
                        <UserX size={14} className="text-red-400" />
                      </div>
                      <span className="text-sm font-medium text-white font-mono">{userId}</span>
                    </div>
                    <button
                      onClick={() => handleUserUnban(userId)}
                      disabled={processingId === `unban-${userId}`}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:bg-white/5 hover:text-white transition-all disabled:opacity-50"
                    >
                      {processingId === `unban-${userId}` ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      BAN解除
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
