// Firestore データ操作
// Firebase未設定時はlocalStorageをデータストアとして使用するデモモード対応

import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  query, where, orderBy, limit, onSnapshot, deleteDoc,
  increment, type Unsubscribe
} from 'firebase/firestore';
import { db, isDemoMode } from './firebase';
import type { Account, Community, Post, Comment, UserVote, AccountCommunity, FeedSort } from '../types';

// 匿名ユーザー用の識別子を取得または生成
export function getAnonymousId(): string {
  const key = 'zerothread_anon_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'anon-' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem(key, id);
  }
  return id;
}

// ============================================================
// デモモード用ローカルストレージ操作
// ============================================================
function getLocalData<T>(key: string): T[] {
  const data = localStorage.getItem(`zt_${key}`);
  return data ? JSON.parse(data) : [];
}

function setLocalData<T>(key: string, data: T[]): void {
  localStorage.setItem(`zt_${key}`, JSON.stringify(data));
}

function generateId(): string {
  return crypto.randomUUID();
}

// ============================================================
// アカウント操作
// ============================================================
/** アカウントを作成 */
export async function createAccount(account: Account): Promise<void> {
  if (isDemoMode) {
    const accounts = getLocalData<Account>('accounts');
    if (accounts.find(a => a.id === account.id)) {
      throw new Error('このアカウントIDは既に使用されています');
    }
    accounts.push(account);
    setLocalData('accounts', accounts);
    return;
  }
  const ref = doc(db, 'public', 'data', 'accounts', account.id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error('このアカウントIDは既に使用されています');
  }
  await setDoc(ref, account);
}

/** アカウントを取得 */
export async function getAccount(accountId: string): Promise<Account | null> {
  if (isDemoMode) {
    const accounts = getLocalData<Account>('accounts');
    return accounts.find(a => a.id === accountId) || null;
  }
  const ref = doc(db, 'public', 'data', 'accounts', accountId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Account) : null;
}

/** アカウント表示名を更新 */
export async function updateAccountName(accountId: string, name: string): Promise<void> {
  if (isDemoMode) {
    const accounts = getLocalData<Account>('accounts');
    const idx = accounts.findIndex(a => a.id === accountId);
    if (idx >= 0) {
      accounts[idx].name = name;
      setLocalData('accounts', accounts);
    }
    return;
  }
  const ref = doc(db, 'public', 'data', 'accounts', accountId);
  await updateDoc(ref, { name });
}

// ============================================================
// コミュニティ操作
// ============================================================
/** コミュニティを作成 */
export async function createCommunity(community: Omit<Community, 'memberCount'>): Promise<void> {
  if (isDemoMode) {
    const communities = getLocalData<Community>('communities');
    if (communities.find(c => c.id === community.id)) {
      throw new Error('このコミュニティ名は既に使用されています');
    }
    communities.push({ 
      ...community, 
      memberCount: 1,
      bannedUsers: [],
      bannedIpHashes: [],
      bannedPostIds: [],
      bannedCommentIds: []
    });
    setLocalData('communities', communities);
    // 作成者を自動的に参加させる
    const memberships = getLocalData<AccountCommunity>('account_communities');
    memberships.push({
      accountId: community.ownerId,
      community: community.id,
      joinedAt: Date.now(),
    });
    setLocalData('account_communities', memberships);
    return;
  }
  const ref = doc(db, 'public', 'data', 'communities', community.id);
  await setDoc(ref, { 
    ...community, 
    memberCount: 1,
    bannedUsers: [],
    bannedIpHashes: [],
    bannedPostIds: [],
    bannedCommentIds: []
  });
  // 作成者を自動的に参加させる
  const memberRef = doc(db, 'public', 'data', 'account_communities', `${community.ownerId}_${community.id}`);
  await setDoc(memberRef, {
    accountId: community.ownerId,
    community: community.id,
    joinedAt: Date.now(),
  });
}

/** コミュニティ一覧を取得 */
export async function getCommunities(): Promise<Community[]> {
  if (isDemoMode) {
    return getLocalData<Community>('communities');
  }
  const q = query(collection(db, 'public', 'data', 'communities'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Community);
}

/** コミュニティを取得 */
export async function getCommunity(communityId: string): Promise<Community | null> {
  if (isDemoMode) {
    const communities = getLocalData<Community>('communities');
    return communities.find(c => c.id === communityId) || null;
  }
  const ref = doc(db, 'public', 'data', 'communities', communityId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Community) : null;
}

/** コミュニティに参加 */
export async function joinCommunity(accountId: string, communityId: string): Promise<void> {
  if (isDemoMode) {
    const memberships = getLocalData<AccountCommunity>('account_communities');
    if (memberships.find(m => m.accountId === accountId && m.community === communityId)) {
      return; // 既に参加済み
    }
    memberships.push({ accountId, community: communityId, joinedAt: Date.now() });
    setLocalData('account_communities', memberships);
    // メンバーカウント更新
    const communities = getLocalData<Community>('communities');
    const idx = communities.findIndex(c => c.id === communityId);
    if (idx >= 0) {
      communities[idx].memberCount = (communities[idx].memberCount || 0) + 1;
      setLocalData('communities', communities);
    }
    return;
  }
  const memberRef = doc(db, 'public', 'data', 'account_communities', `${accountId}_${communityId}`);
  await setDoc(memberRef, { accountId, community: communityId, joinedAt: Date.now() });
  const communityRef = doc(db, 'public', 'data', 'communities', communityId);
  await updateDoc(communityRef, { memberCount: increment(1) });
}

/** コミュニティから脱退 */
export async function leaveCommunity(accountId: string, communityId: string): Promise<void> {
  if (isDemoMode) {
    const memberships = getLocalData<AccountCommunity>('account_communities');
    const newMemberships = memberships.filter(m => !(m.accountId === accountId && m.community === communityId));
    if (memberships.length === newMemberships.length) return; // 参加していなかった
    setLocalData('account_communities', newMemberships);
    
    // メンバーカウント減少
    const communities = getLocalData<Community>('communities');
    const idx = communities.findIndex(c => c.id === communityId);
    if (idx >= 0 && (communities[idx].memberCount || 0) > 0) {
      communities[idx].memberCount = (communities[idx].memberCount || 0) - 1;
      setLocalData('communities', communities);
    }
    return;
  }
  const memberRef = doc(db, 'public', 'data', 'account_communities', `${accountId}_${communityId}`);
  await deleteDoc(memberRef);
  const communityRef = doc(db, 'public', 'data', 'communities', communityId);
  await updateDoc(communityRef, { memberCount: increment(-1) });
}

/** ユーザーが参加しているコミュニティ一覧を取得 */
export async function getUserCommunities(accountId: string): Promise<string[]> {
  if (isDemoMode) {
    const memberships = getLocalData<AccountCommunity>('account_communities');
    return memberships.filter(m => m.accountId === accountId).map(m => m.community);
  }
  const q = query(
    collection(db, 'public', 'data', 'account_communities'),
    where('accountId', '==', accountId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => (d.data() as AccountCommunity).community);
}

// ============================================================
// 投稿操作
// ============================================================
/** 投稿を作成 */
export async function createPost(post: Omit<Post, 'id' | 'votes' | 'commentsCount'>): Promise<string> {
  const id = generateId();
  const fullPost: Post = {
    ...post,
    id,
    votes: 0,
    commentsCount: 0,
  };
  // BANチェック
  const community = await getCommunity(post.community);
  if (community?.bannedUsers.includes(post.authorId)) {
    throw new Error('このコミュニティからBANされています');
  }
  // TODO: IPハッシュチェック (将来的にCloud Functionsで実装)

  if (isDemoMode) {
    const posts = getLocalData<Post>('posts');
    posts.push(fullPost);
    setLocalData('posts', posts);
    return id;
  }
  const ref = doc(db, 'public', 'data', 'posts', id);
  await setDoc(ref, fullPost);
  return id;
}

/** 投稿を論理削除 */
export async function deletePost(postId: string): Promise<void> {
  if (isDemoMode) {
    const posts = getLocalData<Post>('posts');
    const index = posts.findIndex((p: Post) => p.id === postId);
    if (index !== -1) {
      posts[index].isDeleted = true;
      posts[index].content = '[モデレーターにより削除されました]';
      setLocalData('posts', posts);
    }
    return;
  }
  const ref = doc(db, 'public', 'data', 'posts', postId);
  await updateDoc(ref, {
    isDeleted: true,
    content: '[モデレーターにより削除されました]'
  });
}

/** 投稿一覧を取得 */
export async function getPosts(
  communityId?: string,
  sort: FeedSort = 'new',
  limitCount: number = 50
): Promise<Post[]> {
  if (isDemoMode) {
    let posts = getLocalData<Post>('posts');
    if (communityId) {
      posts = posts.filter(p => p.community === communityId);
    }
    posts = posts.filter(p => !p.isDeleted);
    if (sort === 'new') {
      posts.sort((a, b) => b.timestamp - a.timestamp);
    } else if (sort === 'top') {
      posts.sort((a, b) => b.votes - a.votes);
    } else {
      // hot: 簡易的なHotソート（投票数 + 時間減衰）
      const now = Date.now();
      posts.sort((a, b) => {
        const scoreA = a.votes / Math.pow((now - a.timestamp) / 3600000 + 2, 1.5);
        const scoreB = b.votes / Math.pow((now - b.timestamp) / 3600000 + 2, 1.5);
        return scoreB - scoreA;
      });
    }
    return posts.slice(0, limitCount);
  }

  let q;
  const colRef = collection(db, 'public', 'data', 'posts');
  if (communityId) {
    if (sort === 'top') {
      q = query(colRef, where('community', '==', communityId), orderBy('votes', 'desc'), limit(limitCount));
    } else {
      q = query(colRef, where('community', '==', communityId), orderBy('timestamp', 'desc'), limit(limitCount));
    }
  } else {
    if (sort === 'top') {
      q = query(colRef, orderBy('votes', 'desc'), limit(limitCount));
    } else {
      q = query(colRef, orderBy('timestamp', 'desc'), limit(limitCount));
    }
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Post);
}

/** 投稿を取得 */
export async function getPost(postId: string): Promise<Post | null> {
  if (isDemoMode) {
    const posts = getLocalData<Post>('posts');
    return posts.find(p => p.id === postId) || null;
  }
  const ref = doc(db, 'public', 'data', 'posts', postId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Post) : null;
}

/** 投票する */
export async function votePost(postId: string, accountId: string, value: 1 | -1): Promise<void> {
  if (isDemoMode) {
    const votes = getLocalData<UserVote>('votes');
    const existing = votes.find(v => v.postId === postId && v.accountId === accountId);
    const posts = getLocalData<Post>('posts');
    const postIdx = posts.findIndex(p => p.id === postId);
    if (postIdx < 0) return;

    if (existing) {
      if (existing.value === value) {
        // 同じ方向に投票 → キャンセル
        const voteIdx = votes.indexOf(existing);
        votes.splice(voteIdx, 1);
        posts[postIdx].votes -= value;
      } else {
        // 逆方向 → 変更
        posts[postIdx].votes += value * 2;
        existing.value = value;
      }
    } else {
      // 新規投票
      votes.push({ postId, accountId, value });
      posts[postIdx].votes += value;
    }
    setLocalData('votes', votes);
    setLocalData('posts', posts);
    return;
  }

  const voteRef = doc(db, 'public', 'data', 'votes', `${accountId}_${postId}`);
  const existing = await getDoc(voteRef);
  const postRef = doc(db, 'public', 'data', 'posts', postId);

  if (existing.exists()) {
    const prev = existing.data() as UserVote;
    if (prev.value === value) {
      await deleteDoc(voteRef);
      await updateDoc(postRef, { votes: increment(-value) });
    } else {
      await setDoc(voteRef, { postId, accountId, value });
      await updateDoc(postRef, { votes: increment(value * 2) });
    }
  } else {
    await setDoc(voteRef, { postId, accountId, value });
    await updateDoc(postRef, { votes: increment(value) });
  }
}

/** ユーザーの投票状態を取得 */
export async function getUserVote(postId: string, accountId: string): Promise<1 | -1 | null> {
  if (isDemoMode) {
    const votes = getLocalData<UserVote>('votes');
    const vote = votes.find(v => v.postId === postId && v.accountId === accountId);
    return vote ? vote.value : null;
  }
  const ref = doc(db, 'public', 'data', 'votes', `${accountId}_${postId}`);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserVote).value : null;
}

// ============================================================
// コメント操作
// ============================================================
/** コメントを追加 */
export async function createComment(comment: Omit<Comment, 'id'>): Promise<string> {
  const id = generateId();
  const fullComment: Comment = { ...comment, id };

  if (isDemoMode) {
    const posts = getLocalData<Post>('posts');
    const post = posts.find(p => p.id === comment.postId);
    if (!post) {
      throw new Error('コメント対象の投稿が見つかりません');
    }
    
    // BANチェック
    const communities = getLocalData<Community>('communities');
    const community = communities.find(c => c.id === post.community);
    if (community?.bannedUsers.includes(comment.authorId)) {
      throw new Error('このコミュニティからBANされています');
    }

    const comments = getLocalData<Comment>('comments');
    comments.push(fullComment);
    setLocalData('comments', comments);
    
    // 投稿のコメント数更新
    const postIdx = posts.findIndex(p => p.id === comment.postId);
    if (postIdx >= 0) {
      posts[postIdx].commentsCount = (posts[postIdx].commentsCount || 0) + 1;
      setLocalData('posts', posts);
    }
    return id;
  }

  // Firebase モード
  const postRef = doc(db, 'public', 'data', 'posts', comment.postId);
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) {
    throw new Error('コメント対象の投稿が見つかりません');
  }
  const post = postSnap.data() as Post;
  const community = await getCommunity(post.community);
  if (community?.bannedUsers.includes(comment.authorId)) {
    throw new Error('このコミュニティからBANされています');
  }

  const ref = doc(db, 'public', 'data', 'comments', id);
  // Firestore は undefined を受け付けないため、undefined のフィールドを削除
  const data = JSON.parse(JSON.stringify(fullComment));
  await setDoc(ref, data);
  await updateDoc(postRef, { commentsCount: increment(1) });
  return id;
}

/** コメントを論理削除 */
export async function deleteComment(commentId: string): Promise<void> {
  if (isDemoMode) {
    const comments = getLocalData<Comment>('comments');
    const index = comments.findIndex((c: Comment) => c.id === commentId);
    if (index !== -1) {
      comments[index].isDeleted = true;
      comments[index].content = '[モデレーターにより削除されました]';
      setLocalData('comments', comments);
    }
    return;
  }
  const ref = doc(db, 'public', 'data', 'comments', commentId);
  await updateDoc(ref, {
    isDeleted: true,
    content: '[モデレーターにより削除されました]'
  });
}

/** 投稿のコメント一覧を取得（時系列フラット） */
export async function getComments(postId: string): Promise<Comment[]> {
  if (isDemoMode) {
    const comments = getLocalData<Comment>('comments');
    return comments
      .filter(c => c.postId === postId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }
  const q = query(
    collection(db, 'public', 'data', 'comments'),
    where('postId', '==', postId),
    orderBy('timestamp', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Comment);
}

// ============================================================
// BAN操作
// ============================================================
/** ユーザーをBANする */
export async function banUser(communityId: string, targetUserId: string): Promise<void> {
  if (isDemoMode) {
    const communities = getLocalData<Community>('communities');
    const idx = communities.findIndex(c => c.id === communityId);
    if (idx >= 0) {
      if (!communities[idx].bannedUsers.includes(targetUserId)) {
        communities[idx].bannedUsers.push(targetUserId);
        setLocalData('communities', communities);
      }
    }
    return;
  }
  const ref = doc(db, 'public', 'data', 'communities', communityId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const community = snap.data() as Community;
  if (!community.bannedUsers.includes(targetUserId)) {
    const updated = [...(community.bannedUsers || []), targetUserId];
    await updateDoc(ref, { bannedUsers: updated });
  }
}

/** ユーザーのBANを解除する */
export async function unbanUser(communityId: string, targetUserId: string): Promise<void> {
  if (isDemoMode) {
    const communities = getLocalData<Community>('communities');
    const idx = communities.findIndex(c => c.id === communityId);
    if (idx >= 0) {
      communities[idx].bannedUsers = (communities[idx].bannedUsers || []).filter(id => id !== targetUserId);
      setLocalData('communities', communities);
    }
    return;
  }
  const ref = doc(db, 'public', 'data', 'communities', communityId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const community = snap.data() as Community;
  const updated = (community.bannedUsers || []).filter(id => id !== targetUserId);
  await updateDoc(ref, { bannedUsers: updated });
}

/** 投稿をBANする */
export async function banPost(communityId: string, postId: string): Promise<void> {
  if (isDemoMode) {
    const communities = getLocalData<Community>('communities');
    const idx = communities.findIndex(c => c.id === communityId);
    if (idx >= 0) {
      const banned = communities[idx].bannedPostIds || [];
      if (!banned.includes(postId)) {
        communities[idx].bannedPostIds = [...banned, postId];
        setLocalData('communities', communities);
      }
    }
    return;
  }
  const ref = doc(db, 'public', 'data', 'communities', communityId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const community = snap.data() as Community;
  const updated = [...(community.bannedPostIds || []), postId];
  await updateDoc(ref, { bannedPostIds: updated });
}

/** 投稿のBANを解除する */
export async function unbanPost(communityId: string, postId: string): Promise<void> {
  if (isDemoMode) {
    const communities = getLocalData<Community>('communities');
    const idx = communities.findIndex(c => c.id === communityId);
    if (idx >= 0) {
      communities[idx].bannedPostIds = (communities[idx].bannedPostIds || []).filter(id => id !== postId);
      setLocalData('communities', communities);
    }
    return;
  }
  const ref = doc(db, 'public', 'data', 'communities', communityId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const community = snap.data() as Community;
  const updated = (community.bannedPostIds || []).filter(id => id !== postId);
  await updateDoc(ref, { bannedPostIds: updated });
}

/** コメントをBANする */
export async function banComment(communityId: string, commentId: string): Promise<void> {
  if (isDemoMode) {
    const communities = getLocalData<Community>('communities');
    const idx = communities.findIndex(c => c.id === communityId);
    if (idx >= 0) {
      const banned = communities[idx].bannedCommentIds || [];
      if (!banned.includes(commentId)) {
        communities[idx].bannedCommentIds = [...banned, commentId];
        setLocalData('communities', communities);
      }
    }
    return;
  }
  const ref = doc(db, 'public', 'data', 'communities', communityId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const community = snap.data() as Community;
  const updated = [...(community.bannedCommentIds || []), commentId];
  await updateDoc(ref, { bannedCommentIds: updated });
}

/** コメントのBANを解除する */
export async function unbanComment(communityId: string, commentId: string): Promise<void> {
  if (isDemoMode) {
    const communities = getLocalData<Community>('communities');
    const idx = communities.findIndex(c => c.id === communityId);
    if (idx >= 0) {
      communities[idx].bannedCommentIds = (communities[idx].bannedCommentIds || []).filter(id => id !== commentId);
      setLocalData('communities', communities);
    }
    return;
  }
  const ref = doc(db, 'public', 'data', 'communities', communityId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const community = snap.data() as Community;
  const updated = (community.bannedCommentIds || []).filter(id => id !== commentId);
  await updateDoc(ref, { bannedCommentIds: updated });
}

/** ユーザーがBANされているか確認 */
export function isUserBanned(community: Community, accountId: string, ipHash?: string): boolean {
  if (!community) return false;
  if (community.bannedUsers?.includes(accountId)) return true;
  if (ipHash && community.bannedIpHashes?.includes(ipHash)) return true;
  return false;
}

// ============================================================
// リアルタイムリスナー (Firestore onSnapshot)
// ============================================================
/** 投稿一覧のリアルタイムリスナー */
export function subscribeToPostsRealtime(
  callback: (posts: Post[]) => void,
  communityFilter?: string | string[],
  limitCount: number = 50
): Unsubscribe | (() => void) {
  if (isDemoMode) {
    const interval = setInterval(() => {
      let posts = getLocalData<Post>('posts');
      if (communityFilter) {
        if (Array.isArray(communityFilter)) {
          posts = posts.filter(p => communityFilter.includes(p.community));
        } else {
          posts = posts.filter(p => p.community === communityFilter);
        }
      }
      posts.sort((a, b) => b.timestamp - a.timestamp);
      callback(posts.slice(0, limitCount));
    }, 1000);
    return () => clearInterval(interval);
  }

  const colRef = collection(db, 'public', 'data', 'posts');
  let q;
  if (communityFilter) {
    if (Array.isArray(communityFilter)) {
      // 10件以上ある場合は、複数を扱うためにチャンク分けが必要だが
      // シンプルにするため一旦全件取得（またはinクエリの制限内で対応）
      if (communityFilter.length === 0) {
        callback([]);
        return () => {};
      }
      q = query(
        colRef, 
        where('community', 'in', communityFilter.slice(0, 30)), 
        orderBy('timestamp', 'desc'), 
        limit(limitCount)
      );
    } else {
      q = query(colRef, where('community', '==', communityFilter), orderBy('timestamp', 'desc'), limit(limitCount));
    }
  } else {
    q = query(colRef, orderBy('timestamp', 'desc'), limit(limitCount));
  }
  return onSnapshot(q, (snap) => {
    const posts = snap.docs.map(d => d.data() as Post);
    callback(posts);
  });
}

/** コミュニティ設定を更新 */
export async function updateCommunitySettings(
  communityId: string,
  settings: Partial<Pick<Community, 'allowAnonymous'>>
): Promise<void> {
  if (isDemoMode) {
    const communities = getLocalData<Community>('communities');
    const idx = communities.findIndex(c => c.id === communityId);
    if (idx >= 0) {
      communities[idx] = { ...communities[idx], ...settings };
      setLocalData('communities', communities);
    }
    return;
  }
  const ref = doc(db, 'public', 'data', 'communities', communityId);
  await updateDoc(ref, settings);
}

/** コメントのリアルタイムリスナー */
export function subscribeToCommentsRealtime(
  postId: string,
  callback: (comments: Comment[]) => void
): Unsubscribe | (() => void) {
  if (isDemoMode) {
    const interval = setInterval(() => {
      const comments = getLocalData<Comment>('comments')
        .filter(c => c.postId === postId)
        .sort((a, b) => a.timestamp - b.timestamp);
      callback(comments);
    }, 1000);
    return () => clearInterval(interval);
  }

  const q = query(
    collection(db, 'public', 'data', 'comments'),
    where('postId', '==', postId),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const comments = snap.docs.map(d => d.data() as Comment);
    callback(comments);
  });
}
