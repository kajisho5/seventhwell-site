// GitHub から kajisho5 の公開リポジトリとスター数を取り、src/data/repos.json を更新する。
// 取れなかったら何もしない（前回の値をそのまま使う）。GITHUB_TOKEN があれば使う。
import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/data/repos.json", import.meta.url);
const data = JSON.parse(await readFile(file, "utf8"));
const headers = { "User-Agent": "seventhwell-site", Accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

try {
  const repos = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`https://api.github.com/users/${data.account}/repos?per_page=100&type=owner&page=${page}`, { headers });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const batch = await res.json();
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  const pub = repos.filter((r) => !r.private && !r.fork);
  const featured = pub.find((r) => r.name === data.featured.name);
  data.totalRepos = pub.length;
  data.totalStars = pub.reduce((n, r) => n + r.stargazers_count, 0);
  if (featured) {
    data.featured.stars = featured.stargazers_count;
    data.featured.language = featured.language ?? data.featured.language;
    data.featured.license = featured.license?.spdx_id ?? data.featured.license;
  }
  data.updatedAt = new Date().toISOString().slice(0, 10);
  await writeFile(file, JSON.stringify(data, null, 2) + "\n");
  console.log(`repos: ${data.totalRepos}, stars: ${data.totalStars}, featured: ${data.featured.stars}`);
} catch (e) {
  console.warn("GitHub の取得に失敗したので前回の値を使います:", e.message);
}
