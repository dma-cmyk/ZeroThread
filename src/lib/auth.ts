// 認証ロジック
// 署名ベース認証のフロー管理

import {
  generateKeyPair,
  exportPublicKeyJwk,
  encryptPrivateKey,
  decryptPrivateKey,
  sign,
  verify,
  generateChallenge,
  importPublicKeyJwk,
} from './crypto';
import { createAccount, getAccount } from './firestore';
import type { Account, AuthSession } from '../types';

const ENCRYPTED_KEY_PREFIX = 'zt_enckey_';
const SESSION_KEY = 'zt_session';

/** 新規アカウントを登録 */
export async function registerAccount(
  accountId: string,
  displayName: string,
  password: string
): Promise<AuthSession> {
  // 1. 鍵ペア生成
  const keyPair = await generateKeyPair();

  // 2. 公開鍵をJWKでエクスポート
  const publicKeyJwk = await exportPublicKeyJwk(keyPair.publicKey);

  // 3. 秘密鍵をパスワードで暗号化してlocalStorageに保存
  const encryptedKey = await encryptPrivateKey(keyPair.privateKey, password);
  localStorage.setItem(ENCRYPTED_KEY_PREFIX + accountId, encryptedKey);

  // 4. アカウント情報をFirestoreに登録
  const account: Account = {
    id: accountId,
    name: displayName,
    type: 'human',
    publicKeyJwk,
    createdAt: Date.now(),
  };
  await createAccount(account);
  cacheAccountMetadata(account);

  // 5. セッション作成
  const session: AuthSession = {
    accountId,
    account,
    privateKey: keyPair.privateKey,
  };

  // セッション情報保存（秘密鍵以外）
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    accountId,
    account,
  }));

  return session;
}

/** ログイン（署名ベース認証） */
export async function loginAccount(
  accountId: string,
  password: string
): Promise<AuthSession> {
  // 1. アカウント情報を取得
  const account = await getAccount(accountId);
  if (!account) {
    throw new Error('アカウントが見つかりません');
  }

  // 2. 暗号化秘密鍵を取得
  const encryptedKey = localStorage.getItem(ENCRYPTED_KEY_PREFIX + accountId);
  if (!encryptedKey) {
    throw new Error('この端末にはアカウントの秘密鍵が保存されていません。キーのインポートが必要です。');
  }

  // 3. パスワードで復号
  let privateKey: CryptoKey;
  try {
    privateKey = await decryptPrivateKey(encryptedKey, password);
  } catch {
    throw new Error('パスワードが正しくありません');
  }

  // 4. チャレンジ・レスポンスで認証
  if (account.publicKeyJwk) {
    const challenge = generateChallenge();
    const signature = await sign(privateKey, challenge);
    const publicKey = await importPublicKeyJwk(account.publicKeyJwk);
    const isValid = await verify(publicKey, signature, challenge);

    if (!isValid) {
      throw new Error('署名の検証に失敗しました。鍵が一致しません。');
    }
  }

  // 5. セッション作成
  const session: AuthSession = {
    accountId,
    account,
    privateKey,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify({
    accountId,
    account,
  }));
  cacheAccountMetadata(account);

  return session;
}

/** ログアウト */
export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

/** 保存されたセッションを復元（秘密鍵はメモリにないため再ログインが必要） */
export function restoreSession(): Partial<AuthSession> | null {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;
  try {
    const { accountId, account } = JSON.parse(data);
    return { accountId, account, privateKey: null };
  } catch {
    return null;
  }
}

/** 秘密鍵のインポート（アカウント引き継ぎ用） */
export async function importAccountKey(
  accountId: string,
  encryptedKeyBase64: string,
  password: string
): Promise<AuthSession> {
  // 1. アカウントが存在するか確認
  const account = await getAccount(accountId);
  if (!account) {
    throw new Error('アカウントが見つかりません');
  }

  // 2. 秘密鍵を復号して検証
  let privateKey: CryptoKey;
  try {
    privateKey = await decryptPrivateKey(encryptedKeyBase64, password);
  } catch {
    throw new Error('パスワードまたは暗号化キーが正しくありません');
  }

  // 3. ローカルに保存
  localStorage.setItem(ENCRYPTED_KEY_PREFIX + accountId, encryptedKeyBase64);

  // 4. セッション作成
  const session: AuthSession = {
    accountId,
    account,
    privateKey,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify({
    accountId,
    account,
  }));
  cacheAccountMetadata(account);

  return session;
}

/** 暗号化された秘密鍵を取得（エクスポート用） */
export function getEncryptedKey(accountId: string): string | null {
  return localStorage.getItem(ENCRYPTED_KEY_PREFIX + accountId);
}

/** 保存されている秘密鍵のアカウントID一覧を取得 */
export function getStoredAccountIds(): string[] {
  const accounts: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(ENCRYPTED_KEY_PREFIX)) {
      accounts.push(key.replace(ENCRYPTED_KEY_PREFIX, ''));
    }
  }
  return accounts;
}

/** アカウント情報をローカルにキャッシュ保存 */
function cacheAccountMetadata(account: Account): void {
  const cached = localStorage.getItem('zt_cached_accounts');
  const accounts = cached ? JSON.parse(cached) : {};
  accounts[account.id] = { name: account.name, type: account.type };
  localStorage.setItem('zt_cached_accounts', JSON.stringify(accounts));
}

/** キャッシュされたアカウント情報を取得 */
export function getCachedAccounts(): Record<string, { name: string, type: string }> {
  const cached = localStorage.getItem('zt_cached_accounts');
  return cached ? JSON.parse(cached) : {};
}

/** パスワードを変更 */
export async function changeAccountPassword(
  accountId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  // 1. 既存の暗号化鍵を取得
  const oldEncryptedKey = localStorage.getItem(ENCRYPTED_KEY_PREFIX + accountId);
  if (!oldEncryptedKey) {
    throw new Error('秘密鍵が見つかりません。パスワードを変更するには、この端末に鍵が保存されている必要があります。');
  }

  // 2. 既存のパスワードで復号して秘密鍵を取り出す
  let privateKey: CryptoKey;
  try {
    privateKey = await decryptPrivateKey(oldEncryptedKey, oldPassword);
  } catch {
    throw new Error('現在のパスワードが正しくありません');
  }

  // 3. 新しいパスワードで再暗号化
  const newEncryptedKey = await encryptPrivateKey(privateKey, newPassword);

  // 4. 保存
  localStorage.setItem(ENCRYPTED_KEY_PREFIX + accountId, newEncryptedKey);
}
