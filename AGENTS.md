日本語で簡潔かつ丁寧に回答してください

自分で `vitest --run`, `npx playwright test` してエラーを自分で読んでください

エラーを修正したら、起動コマンドを使ってエラーが出ていないか確認してください

# プロジェクト概要
`gridtypo` は、グリッドを使って文字や図形を扱う試作リポジトリです。
主に次の2系統があります。

- 手動編集ツール: セルを塗る、頂点を動かす、境界を確認するための SVG ベースのエディタ
- 画像解析ツール: OpenCV を使って画像からグリッド候補や輪郭を調べる実験群

現在の主な開発対象は `hand_gridtypo1.html` です。

# 現在開発しているもの
- `hand_gridtypo1.html`
- 対応する実装は `src/hand_gridtypo1.ts` / `src/hand_gridtypo_core.ts` / `src/hand_gridtypo_view.ts` です
- ビルド成果物は `dist/hand_gridtypo1.js` です

# ファイル構成
主要なファイルだけ把握しておけば十分です。

- `hand_gridtypo1.html`: 手動グリッド編集ツールの画面
- `src/hand_gridtypo1.ts`: UI イベント、初期化、GUI 連携
- `src/hand_gridtypo_core.ts`: 純粋ロジック、状態管理、セル塗り、頂点移動、境界計算
- `src/hand_gridtypo_view.ts`: SVG 描画専用
- `dist/hand_gridtypo1.js`: `esbuild` による出力
- `tests/hand_gridtypo_vitest.test.ts`: core/view/app 初期化の Vitest 
- `tests/hand_gridtypo1_playwright.spec.ts`: `hand_gridtypo1.html` の Playwright テスト
- `tests/gridtypo2.spec.ts`: 画像解析系の Playwright テスト
- `scan_gridtypo1.html` `scan_gridtypo2.html` `scan_gridtypo3.html`: 画像解析ツールの試作 HTML 
- `images/`: テスト用画像
- `playwright.config.ts` / `vitest.config.mjs`: テスト設定
- `readme.md`: 仕様メモとアイデア置き場

# ビルドと起動
- 手動ツールのビルド: `npm run build:hand` 
- 監視ビルド: `npm run build:hand:watch` 
- HTML はローカルサーバー経由で開く前提です
- Playwright テスト内では `http://172.20.160.1:5500/hand_gridtypo1.html` を使っています

# テスト方針
- まず `vitest --run` で失敗を確認し、自分で読んで直してください
- 修正後は必要に応じて起動コマンドと Playwright でも確認してください
- 純粋ロジックは Vitest、ブラウザ操作は Playwright で確認します

主なコマンドは次です。

- `npx vitest --run`
- `npx playwright test`
- `npm run test:ui`

`npm run test:ui` は次をまとめて起動します。

- `npm run build:hand:watch`
- `npx vitest --ui --watch`
- `npx playwright test --ui`

# テストを書くとき
- 最後に sleep 処理を挟まないと正しく描画されないことがあります
- Playwright の描画待ちでは `await page.waitForTimeout(100);` を最後に入れてください
- Vitest ではできるだけ純粋ロジックを優先してテストしてください
- DOM を使う統合寄りのテストは必要最小限にしてください
