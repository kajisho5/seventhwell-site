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
document.querySelectorAll(".reveal").forEach((el) => (reduce ? el.classList.add("in") : io.observe(el)));

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
