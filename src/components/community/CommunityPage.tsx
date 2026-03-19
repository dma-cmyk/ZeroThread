// コミュニティページ
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, Shield, Loader2, UserPlus, Ban, Plus, LogOut } from 'lucide-react';
import { getCommunity, joinCommunity, leaveCommunity, getUserCommunities, banUser } from '../../lib/firestore';
import { useAuth } from '../../contexts/AuthContext';
import PostFeed from '../post/PostFeed';
import QuickPostForm from '../post/QuickPostForm';
import type { Community } from '../../types';

export default function CommunityPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const decodedId = communityId ? decodeURIComponent(communityId) : '';
  const { isLoggedIn, account } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false); // NEW
  const [banTarget, setBanTarget] = useState('');
  const [isQuickPostOpen, setIsQuickPostOpen] = useState(false);

  useEffect(() => {
    if (!decodedId) return;
    loadCommunity();
  }, [decodedId, isLoggedIn]);

  async function loadCommunity(silent = false) {
    if (!silent) setLoading(true);
    try {
      const c = await getCommunity(decodedId);
      setCommunity(c);
      if (isLoggedIn && account) {
        const joined = await getUserCommunities(account.id);
        setIsMember(joined.includes(decodedId));
      }
    } catch (err) {
      console.error('コミュニティ取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!isLoggedIn || !account || !decodedId) return;
    try {
      await joinCommunity(account.id, decodedId);
      setIsMember(true);
      loadCommunity(true); // サイレント更新
      window.dispatchEvent(new CustomEvent('zt_membership_changed'));
    } catch (err) {
      console.error('コミュニティ参加エラー:', err);
    }
  }

  async function handleBan() {
    if (!community || !banTarget.trim()) return;
    try {
      await banUser(community.id, banTarget.trim());
      setShowBanModal(false);
      setBanTarget('');
      loadCommunity();
    } catch (err) {
      console.error('BAN エラー:', err);
    }
  }

  async function handleLeave() {
    if (!isLoggedIn || !account || !decodedId) return;
    try {
      await leaveCommunity(account.id, decodedId);
      setIsMember(false);
      setShowLeaveModal(false);
      loadCommunity(true); // サイレント更新
      window.dispatchEvent(new CustomEvent('zt_membership_changed'));
    } catch (err) {
      console.error('コミュニティ脱退エラー:', err);
    }
  }

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

  return (
    <div>
      {/* コミュニティヘッダー */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/10 to-cyan-600/10 p-6" data-testid={`community-header-${community.id}`}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{community.name}</h1>
            <p className="mt-1 text-sm text-violet-400 font-mono">{community.id}</p>
            <p className="mt-2 text-sm text-gray-400">{community.description}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Users size={14} />
                {community.memberCount} メンバー
              </span>
              <span className="flex items-center gap-1">
                <Shield size={14} />
                管理者: {community.ownerId}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {isOwner && (
              <>
                <Link
                  to={`/community/${encodeURIComponent(community.id)}/moderate`}
                  className="flex items-center gap-1.5 rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-400 transition-all hover:bg-orange-500/20"
                  data-testid="btn-moderate"
                >
                  <Shield size={14} />
                  管理パネル
                </Link>
                <button
                  onClick={() => setShowBanModal(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20"
                  data-testid="btn-ban-user"
                >
                  <Ban size={14} />
                  BAN
                </button>
              </>
            )}
            {isLoggedIn && !isMember && (
              <button
                onClick={handleJoin}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-1.5 text-sm font-medium text-white transition-all hover:from-violet-500 hover:to-cyan-500"
                data-testid="btn-join-community"
              >
                <UserPlus size={14} />
                参加
              </button>
            )}
            {isLoggedIn && isMember && !isOwner && (
              <button
                onClick={() => setShowLeaveModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-gray-400 transition-all hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                data-testid="btn-leave-community"
              >
                脱退
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 脱退確認モーダル */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0f0f2a] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 mx-auto">
              <LogOut size={32} />
            </div>
            <h3 className="mb-2 text-center text-xl font-bold text-white">脱退の確認</h3>
            <p className="mb-8 text-center text-sm text-gray-400 leading-relaxed">
              #{community.name} から脱退してもよろしいですか？<br/>
              参加していたコンテンツは引き続き閲覧可能です。
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleLeave}
                className="flex w-full items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-red-500"
                data-testid="btn-confirm-leave"
              >
                脱退する
              </button>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BANモーダル (既存) */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f2a] p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-bold text-white">ユーザーをBANする</h3>
            <input
              type="text"
              value={banTarget}
              onChange={e => setBanTarget(e.target.value)}
              placeholder="BANするアカウントIDを入力"
              className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500/50"
              data-testid="input-ban-target"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowBanModal(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-400 hover:bg-white/5"
              >
                キャンセル
              </button>
              <button
                onClick={handleBan}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                data-testid="btn-confirm-ban"
              >
                BANする
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 投稿フィード */}
      <PostFeed 
        communityId={decodedId} 
        title="投稿" 
        bannedPostIds={community.bannedPostIds} 
      />

      {/* フローティングアクションボタン (FAB) */}
      <div className="fixed bottom-8 right-8 z-40">
        <button
          onClick={() => setIsQuickPostOpen(true)}
          className="group flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-600 text-white shadow-2xl shadow-violet-500/40 transition-all hover:scale-110 active:scale-95 translate-y-0"
          title="新規投稿"
          data-testid="btn-fab-post"
        >
          <Plus size={28} className="transition-transform group-hover:rotate-90" />
        </button>
      </div>

      {/* クイック投稿フォーム */}
      {isQuickPostOpen && (
        <QuickPostForm
          communityId={community.id}
          communityName={community.name}
          onClose={() => setIsQuickPostOpen(false)}
        />
      )}
    </div>
  );
}
