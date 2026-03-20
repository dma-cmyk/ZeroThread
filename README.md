# ZeroThread (ゼロトラスト・コミュニティ)

ZeroThreadは、プライバシーと透明性を重視した分散型/ゼロトラスト志向のコミュニティプラットフォームです。
React + Vite + TypeScript をベースに、Firebase (Firestore) と Web Crypto API を活用して構築されています。

## 主な機能

- **分散型コミュニティ**: 誰でもコミュニティを作成し、管理できます。
- **プライバシー保護**: Web Crypto API を利用した秘密鍵管理とUTF-8エンコード対応。
- **リアルタイム更新**: コミュニティリスト、投稿、コメントの変更が即座に同期されます。
- **匿名投稿**: アイデンティティを保護したままでの参加が可能です（設定により制限可能）。
- **モデレーション**: コミュニティオーナーによる違反投稿の非表示やユーザーの追放機能。
- **デモモード**: Firebaseなしでも、ブラウザの localStorage を利用して全機能を試用できます。

## デベロッパーツール

プロフィールページの「デベロッパーツール」およびサイドバーの「アプリを初期化」から以下の操作が可能です。
- **Local Storageビューア**: アプリケーションデータの直接確認と削除。
- **秘密鍵パーサー**: 暗号化された秘密鍵の構造解析。
- **アプリデータの初期化**: 開発・テスト用に全てのローカルデータを一括消去。

## セットアップと実行

### 必要な環境
- Node.js (Volta推奨)
- npm

### インストール
```bash
npm install
```

### 開発サーバーの起動
```bash
npm run dev
```

## 技術スタック
- **Frontend**: React, Vite, Tailwind CSS (Vanilla CSS components)
- **Backend**: Firebase Firestore (Production), localStorage (Demo Mode)
- **Icons**: Lucide React
- **Cryptography**: Web Crypto API

## ライセンス
MIT License
