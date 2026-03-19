// ZeroThread メインアプリケーション
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import AuthPage from './components/auth/AuthPage';
import PostFeed from './components/post/PostFeed';
import PostDetail from './components/post/PostDetail';
import CreatePost from './components/post/CreatePost';
import CommunityPage from './components/community/CommunityPage';
import CreateCommunity from './components/community/CreateCommunity';
import ProfilePage from './components/profile/ProfilePage';
import ModerationPage from './components/moderation/ModerationPage';
import { useState } from 'react';
import { seedData, resetData } from './lib/seed';
import { isDemoMode } from './lib/firebase';
import { Database, Trash2, Zap } from 'lucide-react';

/** ホームページ */
function HomePage() {
  return <PostFeed title="ホーム" onlyJoined={true} defaultSort="new" />;
}

/** 人気ページ */
function PopularPage() {
  return <PostFeed title="人気" defaultSort="top" />;
}

/** 新着ページ */
function LatestPage() {
  return <PostFeed title="新着" defaultSort="new" />;
}

/** デモモード操作パネル */
function DemoPanel() {
  const [expanded, setExpanded] = useState(false);


  if (!isDemoMode) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {expanded ? (
        <div className="rounded-2xl border border-amber-500/20 bg-[#0f0f2a]/95 backdrop-blur-xl p-4 shadow-2xl w-64">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Zap size={14} />
              デモモード
            </span>
            <button
              onClick={() => setExpanded(false)}
              className="text-gray-500 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Firebase未接続のため、localStorageでデータを管理しています。
          </p>
          <div className="space-y-2">
            <button
              onClick={async () => { await seedData(); window.location.reload(); }}
              className="flex w-full items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-all"
              data-testid="btn-seed-data"
            >
              <Database size={14} />
              シードデータを注入
            </button>
            <button
              onClick={async () => { await resetData(); window.location.reload(); }}
              className="flex w-full items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-all"
              data-testid="btn-reset-data"
            >
              <Trash2 size={14} />
              データをリセット
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 shadow-lg hover:bg-amber-500/30 transition-all animate-pulse"
          title="デモモード操作パネル"
          data-testid="btn-demo-panel"
        >
          <Zap size={20} />
        </button>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/popular" element={<PopularPage />} />
            <Route path="/latest" element={<LatestPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/post/:postId" element={<PostDetail />} />
            <Route path="/community/create" element={<CreateCommunity />} />
            <Route path="/community/:communityId" element={<CommunityPage />} />
            <Route path="/community/:communityId/moderate" element={<ModerationPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
        <DemoPanel />
      </BrowserRouter>
    </AuthProvider>
  );
}
