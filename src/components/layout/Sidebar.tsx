// サイドバーコンポーネント
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, TrendingUp, Clock, Plus, Hash, ChevronDown, ChevronRight, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserCommunities, subscribeToCommunitiesRealtime } from '../../lib/firestore';
import type { Community } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { isLoggedIn, account } = useAuth();
  const location = useLocation();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [userCommunities, setUserCommunities] = useState<string[]>([]);
  const [showAllCommunities, setShowAllCommunities] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => {
    // コミュニティリストをリアルタイム購読
    const unsubscribe = subscribeToCommunitiesRealtime((allCommunities) => {
      setCommunities(allCommunities);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoggedIn && account) {
      loadUserMembership();
      // イベントリスナー登録
      const handleMembershipChange = () => loadUserMembership();
      window.addEventListener('zt_membership_changed', handleMembershipChange);
      return () => window.removeEventListener('zt_membership_changed', handleMembershipChange);
    } else {
      setUserCommunities([]);
    }
  }, [isLoggedIn, account]);

  async function loadUserMembership() {
    if (!account) return;
    try {
      const joined = await getUserCommunities(account.id);
      setUserCommunities(joined);
    } catch (err) {
      console.error('メンバーシップ取得エラー:', err);
    }
  }

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
      isActive(path)
        ? 'bg-gradient-to-r from-violet-600/20 to-cyan-600/20 text-white shadow-sm border border-violet-500/20'
        : 'text-gray-400 hover:bg-white/5 hover:text-white'
    }`;

  const joinedCommunities = (communities || []).filter(c => (userCommunities || []).includes(c.id));
  const otherCommunities = (communities || []).filter(c => !(userCommunities || []).includes(c.id));

  return (
    <>
      {/* モバイルオーバーレイ */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-16 left-0 bottom-0 z-40 w-64 border-r border-white/10 bg-[#0a0a1a]/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="sidebar"
      >
        <div className="flex h-full flex-col overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-white/10">
          {/* メインナビ */}
          <nav className="space-y-1">
            <Link to="/" className={navLinkClass('/')} onClick={onClose} data-testid="nav-home">
              <Home size={18} />
              ホーム
            </Link>
            <Link to="/popular" className={navLinkClass('/popular')} onClick={onClose} data-testid="nav-popular">
              <TrendingUp size={18} />
              人気
            </Link>
            <Link to="/latest" className={navLinkClass('/latest')} onClick={onClose} data-testid="nav-latest">
              <Clock size={18} />
              新着
            </Link>
          </nav>

          {/* 区切り線 */}
          <div className="my-4 border-t border-white/5" />

          {/* 参加コミュニティ */}
          {isLoggedIn && joinedCommunities.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                参加中
              </h3>
              <div className="space-y-0.5">
                {joinedCommunities.map(c => (
                  <Link
                    key={c.id}
                    to={`/community/${encodeURIComponent(c.id)}`}
                    className={navLinkClass(`/community/${encodeURIComponent(c.id)}`)}
                    onClick={onClose}
                    data-testid={`nav-community-${c.id}`}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600/30 to-cyan-600/30 text-xs">
                      <Hash size={12} />
                    </div>
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto text-xs text-gray-600">{c.memberCount}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* すべてのコミュニティ */}
          <div>
            <button
              onClick={() => setShowAllCommunities(!showAllCommunities)}
              className="flex w-full items-center justify-between px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500 transition-colors hover:text-gray-400"
            >
              <span>コミュニティ</span>
              {showAllCommunities ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {showAllCommunities && (
              <div className="mt-1 space-y-0.5">
                {((isLoggedIn ? otherCommunities : communities) || []).map(c => (
                  <Link
                    key={c.id}
                    to={`/community/${encodeURIComponent(c.id)}`}
                    className={navLinkClass(`/community/${encodeURIComponent(c.id)}`)}
                    onClick={onClose}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-xs">
                      <Hash size={12} />
                    </div>
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto text-xs text-gray-600">{c.memberCount}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* スペーサー */}
          <div className="flex-1" />

          {/* コミュニティ作成ボタン */}
          {isLoggedIn && (
            <Link
              to="/community/create"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-gray-400 transition-all hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-violet-400"
              onClick={onClose}
              data-testid="btn-create-community"
            >
              <Plus size={16} />
              コミュニティを作成
            </Link>
          )}

          {/* 緊急リセットボタン (2段階) */}
          <div className="mt-4 px-2">
            {!resetConfirm ? (
              <button
                onClick={() => setResetConfirm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-[10px] text-gray-600 transition-all hover:text-red-500 hover:bg-red-500/5 group"
                title="初期化の準備"
              >
                <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
                アプリを初期化
              </button>
            ) : (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 animate-in fade-in zoom-in duration-200">
                <p className="mb-2 flex items-center gap-1 text-center text-[9px] font-bold text-red-500">
                  <AlertTriangle size={10} />
                  データを全消去しますか？
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      try {
                        console.log('強制的初期化を実行中...');
                        const keys = [];
                        for (let i = 0; i < localStorage.length; i++) {
                          const key = localStorage.key(i);
                          if (key?.startsWith('zt_')) keys.push(key);
                        }
                        keys.forEach(k => localStorage.removeItem(k));
                        localStorage.removeItem('zt_session');
                        console.log('リセット成功');
                        window.location.href = '/';
                      } catch (err) {
                        console.error('リセット失敗:', err);
                        setResetConfirm(false);
                      }
                    }}
                    className="flex-1 rounded-lg bg-red-600 py-1.5 text-[10px] font-bold text-white hover:bg-red-700 transition-colors"
                  >
                    はい
                  </button>
                  <button
                    onClick={() => setResetConfirm(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
