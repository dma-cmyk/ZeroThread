// ZeroThread 型定義

/** アカウント種別 */
export type AccountType = 'human' | 'bot' | 'anonymous';

/** アカウント情報 */
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  publicKeyJwk: JsonWebKey | null;
  createdAt: number;
}

/** コミュニティ情報 */
export interface Community {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  bannedUsers: string[];
  bannedIpHashes: string[];
  bannedPostIds?: string[];
  /** BANされているコメントIDのリスト */
  bannedCommentIds?: string[];
  /** 匿名投稿を許可するかどうか */
  allowAnonymous?: boolean;
  createdAt: number;
  memberCount: number;
}

/** 投稿 */
export interface Post {
  id: string;
  community: string;
  author: string;
  authorId: string;
  authorType: AccountType;
  ipHash?: string;
  title: string;
  content: string;
  votes: number;
  commentsCount: number;
  timestamp: number;
  isDeleted?: boolean;
}

/** コメント */
export interface Comment {
  id: string;
  postId: string;
  replyTo?: string;
  author: string;
  authorId: string;
  authorType: AccountType;
  ipHash?: string;
  content: string;
  timestamp: number;
  isDeleted?: boolean;
}

/** ユーザーの投票状態 */
export interface UserVote {
  postId: string;
  accountId: string;
  value: 1 | -1;
}

/** コミュニティ参加情報 */
export interface AccountCommunity {
  accountId: string;
  community: string;
  joinedAt: number;
}

/** 認証セッション情報 */
export interface AuthSession {
  accountId: string;
  account: Account;
  privateKey: CryptoKey | null;
}

/** フィードのソート方式 */
export type FeedSort = 'hot' | 'new' | 'top';
