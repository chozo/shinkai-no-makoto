// SNS共有用の OGP 画像（1200×630）を public/ogp.png に作る。
//   npm run ogp
// 1. Vite の開発サーバーでゲームを縦長の画面で開き、時計と乱数を固定して1コマずつ進めながら潜る。
//    撮影のときだけ Vite のプラグインで main.ts の末尾に読み取り用の1行を足し、魚と深さを読めるようにする（ゲームのコードは変えない）。
//    毎コマ、少し先まで魚の動きを予測して「潜る・止まる・浮上する」のうち食べられない操作を選び、ツマミをドラッグする。
//    海底の光る目が見えてきた深さ（SHOT_DEPTH）で撮る。時計と乱数を固定しているので毎回同じ絵になる
// 2. 1200×630 の台紙に、撮った画面・タイトル・遊び方・URL・光る目を並べて撮る
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const outFile = path.join(root, 'public/ogp.png');
const URL_TEXT = 'game.chozo.net/shinkai-no-makoto';
const SEED = 20261018;
const SHOT_DEPTH = 17800; // 内部の深さ（表示は半分の m）。15500 を過ぎると海底の目が近づき、約 18700 で餌に届いてクリアになる
const FRAME_MS = 16;

// 撮影用: main.ts の末尾に、魚・深さ・状態を読むための口を足す
const exposeState = {
  name: 'ogp-expose-state',
  transform(code, id) {
    if (!id.endsWith('/src/main.ts')) return;
    return `${code}\n;window.__ogp = { get fish() { return fish; }, get depth() { return depth; }, get state() { return state; }, MAX_DEPTH, DIVE_SPEED, REEL_SPEED };`;
  },
};
const server = await createServer({ root, logLevel: 'error', plugins: [exposeState], server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const url = `${server.resolvedUrls.local[0]}shinkai-no-makoto/`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });

// 1. ゲーム画面を撮る
const page = await browser.newPage({ viewport: { width: 390, height: 693 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.error('pageerror', e.message));
await page.addInitScript((seed) => {
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}, SEED);
await page.clock.install({ time: 0 });
await page.clock.pauseAt(1000); // install だけだと実時間で進むので止める。以後は runFor の分だけ進む
await page.goto(url, { waitUntil: 'networkidle' });
await page.click('.intro button');

// 潜る(1)・止まる(0)・浮上する(-1)のそれぞれで少し先まで進めたとき、魚の頭に餌が重なるかを調べ、安全な操作を返す
const choose = () =>
  page.evaluate(() => {
    const g = window.__ogp;
    const W = document.querySelector('canvas').clientWidth, H = document.querySelector('canvas').clientHeight;
    const safe = (move) => {
      let depth = g.depth;
      const fish = g.fish.map((f) => ({ ...f }));
      for (let k = 1; k <= 40; k++) {
        const speed = move > 0 ? g.DIVE_SPEED : move < 0 ? -g.REEL_SPEED : 0;
        depth = Math.max(0, Math.min(g.MAX_DEPTH, depth + speed * 0.016 * Math.min(1, k / 3)));
        const hookY = H * (0.32 + Math.min(1, depth / g.MAX_DEPTH) * 0.43);
        for (const f of fish) {
          f.x += f.dir * f.speed;
          const headX = f.x * W + f.dir * f.r * 0.9, fy = (f.depth - depth) * 0.12 + H * 0.6;
          if (Math.abs(headX - W / 2) < f.r * 0.62 + 10 + 14 && Math.abs(fy - (hookY + 14)) < f.r * 0.58 + 10 + 14) return false;
        }
      }
      return true;
    };
    return { move: [1, 0, -1].find(safe) ?? -1, depth: g.depth, state: g.state };
  });
const tb = await page.locator('.track').boundingBox();
const knobAt = { 1: tb.y + tb.height, 0: tb.y + tb.height / 2, '-1': tb.y };
await page.mouse.move(tb.x + tb.width / 2, knobAt[0]);
await page.mouse.down();
let st = await choose();
for (let frame = 0; frame < 60 * 30 && st.depth < SHOT_DEPTH; frame++) {
  await page.mouse.move(tb.x + tb.width / 2, knobAt[st.move]);
  await page.clock.runFor(FRAME_MS);
  st = await choose();
  if (st.state !== 'playing') throw new Error(`撮影前にゲームが終わりました（${st.state}）`);
}
if (st.depth < SHOT_DEPTH) throw new Error('時間内に撮る深さまで潜れませんでした');
console.log('撮った場面:', JSON.stringify({ depth: Math.round(st.depth), caption: await page.textContent('#caption'), timer: await page.textContent('#timer') }));
const shot = await page.locator('.game').screenshot({ type: 'png' });
await page.mouse.up();

// 2. 台紙に並べて撮る
const card = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const img = `data:image/png;base64,${shot.toString('base64')}`;
await card.setContent(`<!doctype html><meta charset="utf-8">
<style>
  body { margin: 0; }
  #ogp { position: relative; width: 1200px; height: 630px; overflow: hidden; color: #fff;
    font-family: ui-rounded, "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif; font-weight: 900;
    background: linear-gradient(180deg, #16a0d4 0%, #0b4f86 30%, #062448 62%, #020510 100%); }
  #ogp::before { content: ""; position: absolute; inset: 0; opacity: .5;
    background-image: radial-gradient(circle, rgba(198, 246, 255, .8) 0 1.5px, transparent 2px), radial-gradient(circle, rgba(198, 246, 255, .5) 0 1px, transparent 1.6px);
    background-size: 97px 73px, 53px 61px; background-position: 11px 17px, 31px 5px; }
  .shot { position: absolute; left: 840px; top: 22px; width: 320px; border-radius: 22px;
    transform: rotate(4deg); transform-origin: 50% 0;
    box-shadow: 0 0 0 6px #edfbff, 0 0 40px rgba(201, 255, 67, .35), 0 22px 44px rgba(0, 0, 0, .55); }
  .text { position: absolute; left: 70px; top: 0; bottom: 0; width: 720px;
    display: flex; flex-direction: column; justify-content: center; align-items: flex-start; }
  .eyebrow { font-size: 30px; color: #ecff87; letter-spacing: .12em; text-shadow: 0 3px #12213d; }
  .logo { margin-top: 4px; font-size: 140px; line-height: 1.1; letter-spacing: .06em; white-space: nowrap;
    text-shadow: 0 8px 0 #12213d, 0 18px 36px rgba(0, 0, 0, .5); }
  .lead { margin-top: 20px; font-size: 36px; line-height: 1.5; color: #dff7ff; text-shadow: 0 3px #12213d; }
  .lead em { font-style: normal; color: #ecff87; }
  .url { margin-top: 28px; padding: 12px 30px; border-radius: 999px; color: #0b3557; font-size: 30px;
    background: #edfbff; box-shadow: 0 6px 0 #7fbcd6, 0 12px 26px rgba(0, 0, 0, .45); }
  .eyes { position: absolute; left: 640px; top: 565px; display: flex; gap: 34px; }
  .eyes i { width: 60px; height: 22px; border-radius: 50%; background: #e7ff8b; box-shadow: 0 0 22px #c9ff43, 0 0 50px #c9ff43; }
</style>
<div id="ogp">
  <img class="shot" src="${img}">
  <div class="eyes"><i></i><i></i></div>
  <div class="text">
    <div class="eyebrow">伝説の生物を釣り上げろ</div>
    <div class="logo">深海の誠</div>
    <div class="lead">ツマミで餌を深海へ。魚をかわして<br><em>「誠」の正体</em>をたしかめよう！</div>
    <div class="url">${URL_TEXT}</div>
  </div>
</div>`);
await card.waitForFunction(() => [...document.images].every((i) => i.complete));
await card.evaluate(() => document.fonts.ready);
await card.screenshot({ path: outFile, clip: { x: 0, y: 0, width: 1200, height: 630 } });

await browser.close();
await server.close();
console.log('OGP画像:', outFile);
