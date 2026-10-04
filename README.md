# 深海の誠

スマホブラウザ向けの縦長カジュアルゲームです。小舟から餌を深海へ沈め、魚に食べられずに海底まで到達すると、伝説の生物「深海の誠」の正体が判明します。

公開URL: https://game.chozo.net/shinkai-no-makoto/

ソースコード: https://github.com/chozo/shinkai-no-makoto

## 遊び方

1. `START DIVE` をタップします。
2. 右下のツマミを下へ倒すと餌が潜り、上へ倒すと浮上します。
3. ツマミを中央または離すと、その深度を保ちます。
4. 魚の頭側に餌が重なるとゲームオーバーです。
5. 海底まで到達して、深海の誠が餌に食いつくとクリアです。

制限時間は30秒です。画面右上の `♪` / `×` でBGMを切り替えられ、設定は同じ端末内に保存されます。

テスト用に `?nofish=1` を付けると魚が出現せず、クリア画面を確認できます。

```
https://game.chozo.net/shinkai-no-makoto/?nofish=1
```

## 実装内容

- Canvasによる描画と `requestAnimationFrame` のゲームループ
- 深度に応じて晴天の海上から深海へ暗く遷移する背景
- 深くなるほど魚が増え、速度も上がる難易度設計
- 魚は画面端から現れ、端へ消える挙動
- 魚の頭側のみを判定する餌の当たり判定
- 海底で光る目が近づき、クリア時に正体をランダム表示
- Web Audio APIで合成したBGM・開始／失敗／クリア効果音・ファンファーレ
- 深度に応じて低音、音域、フィルターが変化するBGM
- 右上のミュートボタンと端末内への音量設定保存
- 外部音源や外部画像への依存なし
- スマホでビューポート全体を使うレイアウトとSVGファビコン

現在の深海の誠候補は以下の3種です。

- デンキノコ
- 全長5センチメートルのイカ
- カニノナワ

## 開発環境

Node.jsとnpmを使用します。

```bash
npm install
npm run dev
```

表示されたローカルURLをブラウザで開きます。ビルド確認は以下です。

```bash
npm run build
```

## デプロイ

Cloudflare Workers + Static Assetsで配信しています。

```bash
npm run deploy
```

ゲームは `game.chozo.net/shinkai-no-makoto/*` にルーティングされています。`game.chozo.net` のトップ画面は、このゲームとは別プロジェクトで管理します。

旧Cloudflare Pagesプロジェクトは削除済みです。Pagesではなく、上記のWorkerデプロイを使用してください。

## GitHub

ソースはOrganization `chozo` のリポジトリで管理しています。

```bash
git status
git add <更新したファイル>
git commit -m "変更内容"
git push
```

ローカルの `main` ブランチは `origin/main` を追跡しています。pushには、GitHubアカウント `matsudam` がOrganization `chozo` に対して持つ書き込み権限を使用します。

## 主な構成

```text
src/
  main.ts              ゲーム状態、操作、Canvas描画、当たり判定
  AudioManager.ts      Web Audio APIによるBGM・効果音
  worker.ts            ゲーム配下の静的アセット配信
  style.css            基本スタイル
  overrides.css        晴天演出、ミュートボタンなどの追加スタイル
public/
  favicon.svg          光る目のファビコン
  makoto/              クリア時に表示する正体画像
wrangler.jsonc         Cloudflare Worker設定
vite.config.ts         `/shinkai-no-makoto/` 配下へのビルド設定
```

`img/makoto/` は元画像の保管場所で、実際にゲームが配信する画像は `public/makoto/` です。新しい正体を追加する場合は、PNGを `public/makoto/` に置き、`src/main.ts` の `MAKOTOS` に名称とパスを追加します。

## 作業記録

- 釣りをテーマにした縦長スマホゲームとして、海面から深海へ潜る単純な1プレイ完結型に設計。
- ツマミの上下で餌を操作する方式、30秒制限、海底到達で必ずクリアというルールを実装。
- 魚の描画位置と当たり判定を揃え、頭側のみが餌を食べる判定に調整。
- 深度ごとの魚増加・高速魚の追加を実装し、避ける操作に必要な反応速度を調整。
- 海底に固定された光る目、接近時のサイズ変化、ヒット演出、ランダムな正体表示を追加。
- クリア／失敗画面に再挑戦とタイトル画面への導線を追加。
- Cloudflare DNSの `game.chozo.net` をハブとして設定し、ゲームをパス単位の専用Workerとして公開。
- 初期に使っていたCloudflare Pagesプロジェクトを廃止し、Workers配信へ一本化。
- サブパス配信で画像が表示されない問題を、Viteの公開ベースURLを使う形へ修正。
- スマホでゲームが小さく表示される問題を、viewport設定の追加で修正。
- 晴天のタイトル画面、光る目のファビコン、Web Audio APIによるBGM・効果音・クリアファンファーレを追加。
- GitHub Organization `chozo` の `shinkai-no-makoto` リポジトリへ初回コミットをpush。

## 今後追加しやすい要素

- 深海の誠の画像・名称パターンの追加
- 深度別の魚の種類や見た目の追加
- クリアタイム／到達深度のローカルランキング
- より本格的なBGM音源への差し替え
- SNS共有用の結果画像生成

## ライセンス

[MIT License](./LICENSE)（Copyright (c) 2026 chozo）です。改変・再配布・商用利用ができます。利用するときは、著作権表示とライセンス文を残してください。
