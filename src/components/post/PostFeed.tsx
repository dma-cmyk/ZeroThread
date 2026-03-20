// 投稿フィード（ホーム / 人気 / 新着）
import { useState, useEffect } from 'react';
import { Flame, TrendingUp, Clock, Loader2 } from 'lucide-react';
import PostCard from './PostCard';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToPostsRealtime, getUserCommunities } from '../../lib/firestore';
import type { Post, FeedSort } from '../../types';

interface PostFeedProps {
  communityId?: string;
  onlyJoined?: boolean;
  defaultSort?: FeedSort;
  title?: string;
  bannedPostIds?: string[];
}

export default function PostFeed({ 
  communityId, 
  onlyJoined = false,
  defaultSort = 'new', 
  title, 
  bannedPostIds = [] 
}: PostFeedProps) {
  const { account } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [sort, setSort] = useState<FeedSort>(defaultSort);
  const [loading, setLoading] = useState(true);
  const [limitCount, setLimitCount] = useState(15);
  const [hasMore, setHasMore] = useState(true);
  const [joinedCommunities, setJoinedCommunities] = useState<string[] | null>(null);

  useEffect(() => {
    if (onlyJoined && account) {
      getUserCommunities(account.id).then(setJoinedCommunities);
    } else {
      setJoinedCommunities([]);
    }
  }, [onlyJoined, account]);

  useEffect(() => {
    // フィルタ条件が揃うまで待機
    if (onlyJoined && joinedCommunities === null) return;
    
    setLoading(true);
    
    // 参加済みフィルターが有効で、参加先がない場合は空
    if (onlyJoined && joinedCommunities?.length === 0) {
      setPosts([]);
      setLoading(false);
      setHasMore(false);
      return;
    }

    const filter = communityId || (onlyJoined ? joinedCommunities : undefined);

    // リアルタイムリスナーを設定
    const unsubscribe = subscribeToPostsRealtime((newPosts) => {
      // ソート適用
      let sorted = [...newPosts];
      if (sort === 'top') {
        sorted.sort((a, b) => b.votes - a.votes);
      } else if (sort === 'hot') {
        const now = Date.now();
        sorted.sort((a, b) => {
          const scoreA = a.votes / Math.pow((now - a.timestamp) / 3600000 + 2, 1.5);
          const scoreB = b.votes / Math.pow((now - b.timestamp) / 3600000 + 2, 1.5);
          return scoreB - scoreA;
        });
      }
      
      setPosts(sorted);
      setLoading(false);
      setHasMore(newPosts.length >= limitCount);
    }, filter as string | string[], limitCount);

    return () => unsubscribe();
  }, [communityId, sort, joinedCommunities, limitCount]);

  const sortOptions = [
    { key: 'hot' as FeedSort, label: 'ホット', icon: Flame },
    { key: 'new' as FeedSort, label: '新着', icon: Clock },
    { key: 'top' as FeedSort, label: '人気', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          {title && <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>}
          {onlyJoined && (
            <p className="text-xs text-violet-400 mt-1">参加中のコミュニティから表示中</p>
          )}
        </div>

        {/* ソートボタン */}
        <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 shadow-inner">
          {sortOptions.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setSort(key);
                setLimitCount(15);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                sort === key
                  ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              data-testid={`sort-${key}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* コンテンツ */}
      {loading && posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 opacity-50">
          <Loader2 size={32} className="animate-spin text-violet-500" />
          <p className="mt-4 text-sm text-gray-500 font-medium">投稿を読み込んでいます...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 py-24 text-center bg-white/[0.01]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-gray-700">
            <Clock size={32} />
          </div>
          <p className="text-lg font-bold text-gray-500">まだ投稿がありません</p>
          <p className="mt-1 text-sm text-gray-600">新しいコミュニティに参加したり、投稿を始めてみましょう！</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="post-feed">
          <div className="grid gap-4">
            {posts.map(post => (
              <PostCard 
                key={post.id} 
                post={post} 
                isBanned={bannedPostIds.includes(post.id)}
              />
            ))}
          </div>
          
          {hasMore && (
            <div className="pt-6 pb-12">
              <button 
                onClick={() => setLimitCount(prev => prev + 15)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-bold text-gray-400 transition-all hover:bg-white/10 hover:text-white hover:border-violet-500/30"
              >
                もっと見る
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
