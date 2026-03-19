// ECDSA P-256 暗号化ユーティリティ
// WebCrypto API を使用した公開鍵暗号方式

/** ECDSA P-256 鍵ペアを生成 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true, // extractable: エクスポート可能
    ['sign', 'verify']
  );
}

/** 公開鍵をJWK形式でエクスポート */
export async function exportPublicKeyJwk(publicKey: CryptoKey): Promise<JsonWebKey> {
  return await crypto.subtle.exportKey('jwk', publicKey);
}

/** 秘密鍵をJWK形式でエクスポート */
export async function exportPrivateKeyJwk(privateKey: CryptoKey): Promise<JsonWebKey> {
  return await crypto.subtle.exportKey('jwk', privateKey);
}

/** JWK形式から公開鍵をインポート */
export async function importPublicKeyJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify']
  );
}

/** JWK形式から秘密鍵をインポート */
export async function importPrivateKeyJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign']
  );
}

/** パスワードからAES-GCM用の暗号鍵を導出 (PBKDF2) */
async function deriveEncryptionKey(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password) as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** 秘密鍵をパスワードで暗号化してBase64文字列として返す */
export async function encryptPrivateKey(
  privateKey: CryptoKey,
  password: string
): Promise<string> {
  const jwk = await exportPrivateKeyJwk(privateKey);
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(jwk));

  // イテレーション回数をランダムに生成 (500,000 ~ 700,000)
  const iterArray = new Uint32Array(1);
  crypto.getRandomValues(iterArray);
  const iterations = (iterArray[0] % 200000) + 500000;

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encKey = await deriveEncryptionKey(password, salt, iterations);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encKey,
    data
  );

  // iterations(4) + salt(16) + iv(12) + 暗号文 を結合してBase64エンコード
  const encryptedBytes = new Uint8Array(encrypted);
  const combined = new Uint8Array(4 + salt.length + iv.length + encryptedBytes.length);
  
  //Uint32Arrayをバイト列として埋め込む (Little Endian)
  const iterBytes = new Uint8Array(new Uint32Array([iterations]).buffer);
  combined.set(iterBytes, 0);
  combined.set(salt, 4);
  combined.set(iv, 4 + 16);
  combined.set(encryptedBytes, 4 + 16 + 12);

  return btoa(String.fromCharCode(...combined));
}

/** Base64文字列の暗号化秘密鍵をパスワードで復号 */
export async function decryptPrivateKey(
  encryptedBase64: string,
  password: string
): Promise<CryptoKey> {
  const binary = atob(encryptedBase64);
  const combined = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    combined[i] = binary.charCodeAt(i);
  }

  // 先頭4バイトからイテレーション回数を復元
  const iterations = new Uint32Array(combined.buffer.slice(0, 4))[0];
  const salt = combined.slice(4, 20);
  const iv = combined.slice(20, 32);
  const encrypted = combined.slice(32);

  const encKey = await deriveEncryptionKey(password, salt, iterations);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    encKey,
    encrypted
  );

  const decoder = new TextDecoder();
  const jwk: JsonWebKey = JSON.parse(decoder.decode(decrypted));
  return await importPrivateKeyJwk(jwk);
}

/** データに署名する */
export async function sign(privateKey: CryptoKey, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoder.encode(data)
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/** 署名を検証する */
export async function verify(
  publicKey: CryptoKey,
  signature: string,
  data: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
  return await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    sigBytes,
    encoder.encode(data)
  );
}

/** チャレンジ文字列を生成 */
export function generateChallenge(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}
