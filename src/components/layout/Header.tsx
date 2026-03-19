// ヘッダーコンポーネント
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, LogOut, User, Zap, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { isLoggedIn, account, logout } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/10 bg-[#0a0a1a]/80 backdrop-blur-xl" data-testid="header">
      <div className="flex h-full items-center justify-between px-4">
        {/* 左: メニュー + ロゴ */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
            data-testid="btn-toggle-sidebar"
          >
            <Menu size={20} />
          </button>
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80" data-testid="logo-link">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Zero<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">Thread</span>
            </span>
          </Link>
        </div>

        {/* 中央: 検索 */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="コミュニティや投稿を検索…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-violet-500/50 focus:bg-white/10 focus:ring-1 focus:ring-violet-500/30"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* 右: ボタン群 */}
        <div className="flex items-center gap-2">
          {/* モバイル検索ボタン */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white md:hidden"
          >
            {searchOpen ? <X size={20} /> : <Search size={20} />}
          </button>

          {isLoggedIn ? (
            <>
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white transition-all hover:bg-white/10"
                  data-testid="btn-user-menu"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-xs font-bold">
                    {account?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">{account?.name}</span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-[#0f0f2a]/95 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-2">
                    <div className="p-1">
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                        data-testid="btn-profile"
                      >
                        <User size={16} />
                        マイページ
                      </Link>
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); navigate('/'); }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        data-testid="btn-logout"
                      >
                        <LogOut size={16} />
                        ログアウト
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-1.5 text-sm font-medium text-white transition-all hover:from-violet-500 hover:to-cyan-500 hover:shadow-lg hover:shadow-violet-500/25"
              data-testid="btn-login"
            >
              ログイン
            </Link>
          )}
        </div>
      </div>

      {/* モバイル検索バー */}
      {searchOpen && (
        <div className="border-t border-white/10 bg-[#0a0a1a]/95 p-3 md:hidden">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="検索…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500/50"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}
