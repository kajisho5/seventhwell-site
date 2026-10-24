// 画面の小さな動き：テーマ切替、メニュー、出てくる演出、時計、数字、フォーム送信
const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---- 明るい／暗い ---- */
function applyTheme(pref: string) {
  const dark = pref === "system" ? matchMedia("(prefers-color-scheme: dark)").matches : pref === "dark";
  root.dataset.theme = dark ? "dark" : "light";
  root.dataset.themePref = pref;
  try { pref === "system" ? localStorage.removeItem("theme") : localStorage.setItem("theme", pref); } catch {}
  document.querySelectorAll<HTMLSelectElement>("[data-theme-select]").forEach((s) => (s.value = pref));
}
document.querySelectorAll("[data-theme-toggle]").forEach((b) =>
  b.addEventListener("click", () => applyTheme(root.dataset.theme === "dark" ? "light" : "dark")));
document.querySelectorAll<HTMLSelectElement>("[data-theme-select]").forEach((s) => {
  s.value = root.dataset.themePref || "system";
  s.addEventListener("change", () => applyTheme(s.value));
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if ((root.dataset.themePref || "system") === "system") applyTheme("system");
});

/* ---- スマホのメニュー ---- */
const menuBtn = document.querySelector<HTMLButtonElement>("[data-menu]");
const drawer = document.getElementById("drawer");
menuBtn?.addEventListener("click", () => {
  const open = !drawer?.classList.contains("open");
  drawer?.classList.toggle("open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
  document.body.style.overflow = open ? "hidden" : "";
});
drawer?.querySelectorAll("[data-close]").forEach((a) => a.addEventListener("click", () => {
  drawer.classList.remove("open"); menuBtn?.setAttribute("aria-expanded", "false"); document.body.style.overflow = "";
}));

/* ---- スクロールで出てくる ---- */
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}), { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
// 最初から画面内にある物には動きを付けない（見えている物が一瞬消えないように）
document.querySelectorAll(".reveal").forEach((el) => {
  if (reduce) return;
  const r = el.getBoundingClientRect();
  if (r.top > innerHeight) io.observe(el);
});

/* ---- いま見ている章をナビで強調 ---- */
const links = [...document.querySelectorAll<HTMLAnchorElement>(".nav a")];
const secIo = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  links.forEach((a) => a.classList.toggle("is-active", a.hash === "#" + e.target.id));
}), { rootMargin: "-45% 0px -50% 0px" });
links.forEach((a) => { const s = a.hash && document.querySelector(a.hash); if (s) secIo.observe(s); });

/* ---- 本番監視画面の時計と数字のゆらぎ ---- */
const clock = document.querySelector<HTMLElement>("[data-clock]");
if (clock && !reduce) {
  let sec = 10 * 3600 + 42 * 60 + 18;
  setInterval(() => {
    sec++;
    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor(sec / 60) % 60).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    clock.textContent = `DAY 2  ${h}:${m}:${s}`;
  }, 1000);
  const br = document.querySelector<HTMLElement>('[data-jitter="bitrate"]');
  if (br) setInterval(() => (br.textContent = `${(5.9 + Math.random() * 0.25).toFixed(1)} Mbps`), 1500);
}

/* ---- 数字のカウントアップ ---- */
const countIo = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  countIo.unobserve(e.target);
  const el = e.target as HTMLElement;
  const raw = el.dataset.count || "";
  const m = raw.match(/^([\d,]+)(.*)$/);
  if (!m || reduce) return;
  const target = Number(m[1].replace(/,/g, "")); const suffix = m[2]; const comma = m[1].includes(",");
  const t0 = performance.now(); const dur = 1200;
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / dur); const v = Math.round(target * (1 - Math.pow(1 - p, 3)));
    el.textContent = (comma ? v.toLocaleString("en-US") : String(v)) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}), { threshold: 0.4 });
document.querySelectorAll("[data-count]").forEach((el) => countIo.observe(el));

/* ---- お問い合わせフォーム ---- */
const form = document.querySelector<HTMLFormElement>("[data-contact]");
if (form) {
  const msg = form.querySelector<HTMLElement>(".form-msg")!;
  const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const ta = form.querySelector<HTMLTextAreaElement>("textarea")!;
  const counter = form.querySelector<HTMLElement>("[data-count-for]");
  ta.addEventListener("input", () => counter && (counter.textContent = `${ta.value.length} / 4000`));
  // ?topic=pulse などで来た場合と、「見積り」ボタンから来た場合に種別を合わせる
  const params = new URLSearchParams(location.search);
  const topicInput = form.querySelector<HTMLInputElement>('input[name="topic"]')!;
  topicInput.value = params.get("topic") ?? "";
  const setType = (v: string) => { const r = form.querySelector<HTMLInputElement>(`input[name="type"][value="${v}"]`); if (r) r.checked = true; };
  if (params.get("topic")) setType("work");
  document.querySelectorAll<HTMLElement>("[data-topic]").forEach((a) => a.addEventListener("click", () => setType(a.dataset.topic!)));

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    msg.className = "form-msg";
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const label = btn.innerHTML;
    btn.disabled = true; btn.textContent = form.dataset.sending || "…";
    try {
      const res = await fetch("/api/contact", { method: "POST", body: new FormData(form) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        msg.textContent = form.dataset.ok || "OK"; msg.classList.add("ok"); form.reset();
        counter && (counter.textContent = "0 / 4000");
      } else {
        msg.textContent = form.dataset.ng || "NG"; msg.classList.add("ng");
      }
    } catch {
      msg.textContent = form.dataset.ng || "NG"; msg.classList.add("ng");
    } finally {
      btn.disabled = false; btn.innerHTML = label;
      (window as any).turnstile?.reset?.();
    }
  });
}

/* ===== v4：細かく動き続ける数字・マス目・ログ・投票 ===== */
if (!reduce) {
  // data-tick：数字が少しずつ増える（data-tick-range="最小,最大" の幅で）
  document.querySelectorAll<HTMLElement>("[data-tick]").forEach((el) => {
    let v = Number(el.dataset.tick);
    const [lo, hi] = (el.dataset.tickRange || "0,2").split(",").map(Number);
    const max = el.dataset.tickMax ? Number(el.dataset.tickMax) : Infinity;
    const ms = Number(el.dataset.tickMs || 1000);
    setInterval(() => {
      v = Math.min(max, v + lo + Math.round(Math.random() * (hi - lo)));
      el.textContent = v.toLocaleString("en-US");
    }, ms + Math.random() * 300);
  });
  // data-jit：値が上下にゆらぐ（配信のビットレート）
  document.querySelectorAll<HTMLElement>("[data-jit]").forEach((el) => {
    const base = Number(el.dataset.jit);
    const dec = (el.dataset.jit!.split(".")[1] || "").length;
    setInterval(() => (el.textContent = (base * (0.97 + Math.random() * 0.06)).toFixed(dec)), 1200 + Math.random() * 600);
  });
  // 投票の割合がじわじわ動く
  const opts = [...document.querySelectorAll<HTMLElement>(".ph-opt")];
  if (opts.length) {
    let p = [48, 33, 19];
    const draw = () => opts.forEach((o, k) => { o.querySelector<HTMLElement>("i")!.style.setProperty("--w", p[k] + "%"); o.querySelector("b")!.textContent = p[k] + "%"; });
    draw();
    setInterval(() => {
      const a = Math.floor(Math.random() * 3), b = (a + 1 + Math.floor(Math.random() * 2)) % 3;
      if (p[b] > 6) { p[a]++; p[b]--; } draw();
    }, 1400);
  }
  // 受付の64マス：受付中 → 完了 が1つずつ進み、全部終わったらやり直す
  const grid = document.querySelector<HTMLElement>("[data-jobs]");
  if (grid) {
    const cells = [...grid.querySelectorAll<HTMLElement>("[data-job]")];
    const count = grid.querySelector<HTMLElement>("[data-jobs-count]")!;
    let order: HTMLElement[] = [];
    const reset = () => { cells.forEach((c) => c.classList.remove("done")); order = [...cells].sort(() => Math.random() - 0.5); count.textContent = "0"; };
    reset();
    let started = false;
    const run = () => {
      const c = order.shift();
      if (c) { c.classList.add("done"); count.textContent = String(64 - order.length - 1 + 1); setTimeout(run, 180 + Math.random() * 380); }
      else setTimeout(() => { reset(); run(); }, 2500);
    };
    new IntersectionObserver((es, ob) => { if (es[0].isIntersecting && !started) { started = true; run(); ob.disconnect(); } }, { threshold: 0.2 }).observe(grid);
  }
  // 本番ログ：1行ずつ増える
  const log = document.querySelector<HTMLElement>("[data-log]");
  if (log) {
    const lines: string[] = JSON.parse(log.dataset.log || "[]");
    let i = 4, sec = 10 * 3600 + 42 * 60 + 22;
    setInterval(() => {
      sec += 2 + Math.floor(Math.random() * 5);
      const tm = `${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor(sec / 60) % 60).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
      const row = document.createElement("div");
      row.innerHTML = `<time>${tm}</time><span></span>`;
      row.querySelector("span")!.textContent = lines[i++ % lines.length];
      log.appendChild(row);
      while (log.children.length > 6) log.firstElementChild?.remove();
    }, 1600);
  }
}

/* 仮押さえの残り時間（1秒ずつ減る） */
document.querySelectorAll<HTMLElement>("[data-countdown]").forEach((el) => {
  let s = Number(el.dataset.countdown);
  const draw = () => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; el.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`; };
  draw();
  if (!reduce) setInterval(() => { s = s > 0 ? s - 1 : 86000; draw(); }, 1000);
});
/* PULSE の投票バーがじわじわ動く */
document.querySelectorAll<HTMLElement>("[data-poll]").forEach((box) => {
  const bars = [...box.querySelectorAll<HTMLElement>(".bar")];
  let p = [46, 31, 15, 8];
  const draw = () => bars.forEach((b, k) => { b.querySelector<HTMLElement>("i")!.style.setProperty("--w", p[k] + "%"); b.querySelectorAll("b")[1].textContent = p[k] + "%"; });
  if (!reduce) setInterval(() => { const a = Math.floor(Math.random() * 4), c = (a + 1 + Math.floor(Math.random() * 3)) % 4; if (p[c] > 4) { p[a]++; p[c]--; } draw(); }, 1300);
});

/* ===== 最初の画面：6.5秒ごとに場面を切り替える（タブを押しても切り替わる） ===== */
const stage = document.querySelector<HTMLElement>("[data-stage]");
if (stage) {
  const scenes = [...stage.querySelectorAll<HTMLElement>("[data-scene]")];
  const tabs = [...stage.querySelectorAll<HTMLElement>("[data-scene-tab]")];
  const MS = 6500;
  stage.style.setProperty("--scene-ms", MS + "ms");
  let cur = 0, timer: number | undefined;
  const show = (n: number) => {
    cur = (n + scenes.length) % scenes.length;
    scenes.forEach((s, i) => s.classList.toggle("on", i === cur));
    tabs.forEach((t, i) => { t.classList.toggle("on", i === cur); t.setAttribute("aria-selected", String(i === cur)); });
  };
  const loop = () => { clearInterval(timer); if (!reduce) timer = window.setInterval(() => show(cur + 1), MS); };
  tabs.forEach((t, i) => t.addEventListener("click", () => { show(i); loop(); }));
  if (reduce) stage.classList.add("paused");
  loop();
  // スイッチャーの PGM / PVW が順に切り替わる
  const sw = [...stage.querySelectorAll<HTMLElement>("[data-sw]")];
  let pg = 1, pv = 3;
  if (sw.length && !reduce) setInterval(() => {
    pg = pv; pv = (pv + 1 + Math.floor(Math.random() * 4)) % sw.length; if (pv === pg) pv = (pv + 1) % sw.length;
    sw.forEach((e, i) => { e.classList.toggle("pgm-t", i === pg); e.classList.toggle("pvw-t", i === pv); });
  }, 1800);
}

/* ===== ヘッダー：最初の画面の上では透明、過ぎたら白い帯 ===== */
const header = document.querySelector<HTMLElement>("[data-header]");
if (header && header.classList.contains("on-dark") && stage) {
  const upd = () => header.classList.toggle("on-dark", stage.getBoundingClientRect().bottom > 90 && !header.classList.contains("menu-open"));
  addEventListener("scroll", upd, { passive: true }); upd();
}
/* 大きいメニュー（プロダクト） */
const megaBtn = document.querySelector<HTMLButtonElement>("[data-mega]");
if (header && megaBtn) {
  const set = (open: boolean) => {
    header.classList.toggle("menu-open", open);
    megaBtn.setAttribute("aria-expanded", String(open));
    if (open) header.classList.remove("on-dark"); else dispatchEvent(new Event("scroll"));
  };
  megaBtn.addEventListener("click", (e) => { e.stopPropagation(); set(!header.classList.contains("menu-open")); });
  document.addEventListener("click", (e) => { if (!header.contains(e.target as Node)) set(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
}

/* ===== 3つの話：画面の真ん中に来た行を濃くする ===== */
const story = document.querySelector<HTMLElement>("[data-story]");
if (story && !reduce) {
  const rows = [...story.querySelectorAll<HTMLElement>("[data-story-row]")];
  story.classList.add("js");
  const pick = () => {
    const mid = innerHeight * 0.45;
    let best = rows[0], bestD = Infinity;
    rows.forEach((r) => { const t = r.querySelector(".story-text")!.getBoundingClientRect(); const d = Math.abs(t.top + 40 - mid); if (d < bestD) { bestD = d; best = r; } });
    rows.forEach((r) => r.classList.toggle("active", r === best));
  };
  addEventListener("scroll", pick, { passive: true }); pick();
}
