# seventhwell-site

SEVENTHWELL 公式サイト（seventh-well.com）。Astro 7 で静的に書き出し、Cloudflare Workers で配信する。
お問い合わせだけ `worker/index.ts`（Hono）が受ける。

## 文章や実績を直すとき
`src/data/` の中のファイルだけ直せばよい（GitHub の画面で編集 → 保存すると自動で公開される）。

| ファイル | 中身 |
|---|---|
| site.ts | 画面の文章（日本語・英語） |
| works.json | 実績 |
| products.json | 自社プロダクト |
| services.json | サービス |
| tools.json | 無料ツール |
| repos.json | GitHub の数字（毎朝自動更新） |
| equipment.json | SW-CATALOG の機材（今は仮データ） |

## 手元で動かす
```
npm ci
npm run build
npx wrangler dev   # http://localhost:8787
```

## 公開の仕組み
`.github/workflows/deploy.yml` が、main への変更時と毎朝 6:13（日本時間）にビルドして `wrangler deploy` する。
必要な設定（GitHub の Settings → Secrets and variables → Actions）:
- Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Variables: `TURNSTILE_SITE_KEY`
- Cloudflare 側: `wrangler secret put TURNSTILE_SECRET`

## 今のサイトから持ってくる物
- `public/pulse/` `public/presync/` `public/holdline/` `public/telopdeck/` `public/streamtally/`
- `public/e2mapper/` `public/pptx-analyzer/` `public/colortemp/` `public/meter/` `public/sumidashi/`
- `public/fonts/goodtimes.woff2`、`public/ogp.png`
