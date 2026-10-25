/* SEVENTHWELL — 共通スクリプト（トップ・製品ページ共通）
   ページ固有の部品（機材メーター・GitHubの数字・問い合わせフォーム）は、
   その要素があるページでだけ動く。 */

/* ★デモ版★ true の間は問い合わせを送信しない（本番化で false にし、reCAPTCHA を読み込む） */
const DEMO = false;
const RECAPTCHA_KEY = '6LcYyoosAAAAAMoprq-WRZMkmHmRqoJx4AHQtRP2';

document.documentElement.classList.add('js');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
let LANG = 'ja';
try{ if(localStorage.getItem('sw-lang') === 'en') LANG = 'en'; }catch(e){}
{ const ql = new URLSearchParams(location.search).get('lang'); if(ql === 'en' || ql === 'ja') LANG = ql; }   // hreflang の ?lang=en 用
const onLang = [];   // 言語が変わった時に描き直す関数

/* ── タイムコード（実時刻 HH:MM:SS:FF・30fps） ──
   桁幅を固定して数字が揺れないようにする（Goodtimesは等幅数字を持たない） */
const tcEls = $$('[data-tc]');
function tcText(){
  const d = new Date(), p = n => String(n).padStart(2,'0');
  const f = RM ? 0 : Math.floor(d.getMilliseconds() / (1000/30));
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}:${p(f)}`;
}
function drawTC(){
  const t = tcText();
  const html = [...t].map(c => c === ':' ? '<span class="c">:</span>' : `<span>${c}</span>`).join('');
  tcEls.forEach(el => { if(el.dataset.last !== t){ el.innerHTML = html; el.dataset.last = t; } });
}
drawTC();
setInterval(() => { if(!document.hidden) drawTC(); }, RM ? 1000 : 1000/30);

/* ── メニュー（スマホ） ── */
const menu = $('#menu'), menuBtn = $('.menu-btn');
function setMenu(open){
  menu.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', open);
  document.body.style.overflow = open ? 'hidden' : '';
  if(open) $('.menu-close').focus(); else menuBtn.focus({preventScroll:true});
}
if(menu && menuBtn){
  menuBtn.addEventListener('click', () => setMenu(true));
  $('.menu-close').addEventListener('click', () => setMenu(false));
  $$('#menu nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });
}

/* ── いま見ているチャンネル（ナビとタリー） ── */
const navLinks = $$('.nav a');
const chObs = new IntersectionObserver(entries => {
  entries.forEach(en => {
    en.target.classList.toggle('live', en.isIntersecting);
    if(en.isIntersecting){
      navLinks.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + en.target.id));
    }
  });
}, {rootMargin:'-45% 0px -50% 0px'});
$$('main section[id]').filter(s => s.id !== 'top').forEach(s => chObs.observe(s));

/* ── 表示時のフェード ── */
const rvObs = new IntersectionObserver(entries => {
  entries.forEach(en => { if(en.isIntersecting){ en.target.classList.add('in'); rvObs.unobserve(en.target); } });
}, {rootMargin:'0px 0px -8% 0px', threshold:.05});
$$('.rv').forEach(el => rvObs.observe(el));

/* ── 機材メーター（トップのみ） ──
   本番（seventh-well.com 上）では SW-CATALOG の実データを読む。
   読めない時（デモをローカルで開いた時など）は 2026-09-23 取得のスナップショットで描く。
   0件のジャンルは出さない（カタログ側と同じ扱い）。 */
if($('[data-meters]')){
  const GENRE_EN = {'映像信号機器':'Signal Processing','映像':'Video','音響':'Audio','照明':'Lighting',
    '配信・通信':'Streaming / Network','制御・周辺機器':'Control / Peripherals','ケーブル':'Cables',
    'スタンド':'Stands','消耗品':'Consumables','その他':'Others'};
  let GENRES = [
    {name:'ケーブル',n:21},{name:'映像信号機器',n:11},{name:'映像',n:9},{name:'音響',n:9},
    {name:'その他',n:5},{name:'制御・周辺機器',n:4},{name:'照明',n:3},{name:'消耗品',n:2},{name:'スタンド',n:1}
  ];
  const ACCESSORIES = new Set(['ケーブル','スタンド','消耗品']);
  let live = false;
  const SEG = 24;
  const renderMeters = () => {
    // ケーブル・スタンド・消耗品は付属品なので出さない（数が多くても機材の強みにならない。2026-09-27 ユーザー指摘）
    const list = GENRES.filter(g => g.n > 0 && !ACCESSORIES.has(g.name)).sort((a,b) => b.n - a.n);
    const max = Math.max(...list.map(g => g.n), 1);
    $('[data-total]').textContent = list.reduce((s,g) => s + g.n, 0);
    $('[data-meters]').innerHTML = list.map(g => {
      const lit = Math.max(1, Math.round(g.n / max * SEG));
      const segs = Array.from({length:SEG}, (_,i) =>
        `<span class="seg${i < lit ? (i === lit-1 ? ' on pk' : ' on') : ''}" style="--i:${i}"></span>`).join('');
      const main = LANG === 'en' ? (GENRE_EN[g.name] || g.name) : g.name;
      const sub  = LANG === 'en' ? g.name : (GENRE_EN[g.name] || '');
      return `<li><span class="m-name">${main}<small>${sub}</small></span>`
           + `<span class="m-bar" aria-hidden="true">${segs}</span><span class="m-n">${g.n}</span></li>`;
    }).join('');   // ul の run クラスは innerHTML を替えても残る
    $('[data-meters-note]').textContent = live
      ? (LANG === 'en' ? 'Live from SW-CATALOG.' : 'SW-CATALOGの最新データを表示しています。')
      : (LANG === 'en' ? 'As of 23 Sep 2026.' : '2026年9月23日時点。');
  };
  renderMeters();
  onLang.push(renderMeters);
  const mObs = new IntersectionObserver(entries => {
    entries.forEach(en => { if(en.isIntersecting){ en.target.classList.add('run'); mObs.unobserve(en.target); } });
  }, {threshold:.25});
  mObs.observe($('[data-meters]'));

  (async () => {
    if(!/seventh-well\.com$/.test(location.hostname)) return;   // 同一オリジンでしか読めない
    try{
      const r = await fetch('/equipment/index.php?view=1&api=1&action=get&key=sw-v6', {cache:'no-store'});
      const d = JSON.parse((await r.json()).value);
      const eq = (d.equipment || []).filter(e => e.status !== '廃棄予定');
      const groups = (d.catDef && d.catDef.groups) || [];
      if(!groups.length) return;
      GENRES = groups.map(g => {
        const names = new Set([g.name]);
        (g.subs || []).forEach(s => { names.add(s.name); (s.subs || []).forEach(ss => names.add(ss.name)); });
        return {name:g.name, n:eq.filter(e => names.has(e.category)).length};
      });
      live = true;
      renderMeters();
    }catch(e){ console.warn('SW-CATALOG の取得に失敗。スナップショットで表示:', e); }
  })();
}

/* ── GitHub の数字（トップのみ） ──
   公開APIは未認証で 60回/時/IP。訪問者ごとに1回だけ叩き、セッション中はキャッシュを使う。
   取れない時は 2026-09-23 のスナップショットのまま（HTMLに書いてある数字）。 */
if($('[data-gh-repos]')){
  let live = false;
  const ghNote = () => {
    $('[data-gh-note]').textContent = live
      ? (LANG === 'en' ? 'Live from GitHub.' : 'GitHubの最新の数字を表示しています。')
      : (LANG === 'en' ? 'As of 23 Sep 2026.' : '2026年9月23日時点');
  };
  onLang.push(ghNote);
  (async () => {
    const fmt = n => n.toLocaleString('en-US');
    let data = null;
    try{ data = JSON.parse(sessionStorage.getItem('sw-gh') || 'null'); }catch(e){}
    if(!data){
      try{
        const r = await fetch('https://api.github.com/users/kajisho5/repos?per_page=100', {headers:{Accept:'application/vnd.github+json'}});
        if(!r.ok) throw new Error('GitHub ' + r.status);
        const repos = (await r.json()).filter(x => !x.fork);
        data = {repos:repos.length, total:repos.reduce((s,x) => s + x.stargazers_count, 0),
                stars:Object.fromEntries(repos.map(x => [x.name, x.stargazers_count]))};
        try{ sessionStorage.setItem('sw-gh', JSON.stringify(data)); }catch(e){}
      }catch(e){ console.warn('GitHub の取得に失敗。スナップショットで表示:', e); return; }
    }
    $('[data-gh-repos]').textContent = fmt(data.repos);
    $('[data-gh-total]').textContent = fmt(data.total);
    $$('[data-gh-star]').forEach(el => { const n = data.stars[el.dataset.ghStar]; if(n != null) el.textContent = fmt(n); });
    live = true; ghNote();
  })();
}

/* ── 言語切替（data-en に英語を持たせ、日本語は初回に退避） ── */
function applyLang(lang){
  LANG = lang;
  document.documentElement.lang = lang;
  $$('[data-en]').forEach(el => {
    if(el.dataset.ja === undefined) el.dataset.ja = el.innerHTML;
    el.innerHTML = lang === 'en' ? el.dataset.en : el.dataset.ja;
  });
  $$('[data-en-ph]').forEach(el => {
    if(el.dataset.jaPh === undefined) el.dataset.jaPh = el.placeholder;
    el.placeholder = lang === 'en' ? el.dataset.enPh : el.dataset.jaPh;
  });
  $$('.lang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang));
  onLang.forEach(fn => fn());
  try{ localStorage.setItem('sw-lang', lang); }catch(e){}
}
$$('.lang button').forEach(b => b.addEventListener('click', () => applyLang(b.dataset.lang)));
if(LANG === 'en') applyLang('en');

/* ── 問い合わせ（トップのみ） ──
   製品ページから ?topic=presync のように来たら、種別とメッセージの書き出しを埋めておく */
const cform = $('#cform');
if(cform){
  const topic = new URLSearchParams(location.search).get('topic');
  if(topic){
    const sel = $('#f-cat'); if(sel) sel.selectedIndex = 1;
    const name = ({presync:'Presync', pulse:'PULSE', holdline:'HOLDLINE', telopdeck:'TELOPDECK', streamtally:'STREAMTALLY'})[topic.toLowerCase()] || topic;
    const msg = $('#f-msg'); if(msg && !msg.value) msg.value = name + (LANG === 'en' ? ' — inquiry\n' : ' について\n');
  }
  cform.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget;
    if(!form.reportValidity()) return;
    const label = $('[data-send-label]'), btn = form.querySelector('button[type=submit]');
    if(DEMO){
      $('[data-sent-text]').textContent = LANG === 'en'
        ? 'This is a demo — nothing was sent.'
        : 'デモ版のため、送信は行われていません（本番では /mail.php に送信されます）。';
      form.hidden = true; $('#sent').classList.add('show'); $('#sent').focus();
      return;
    }
    btn.disabled = true; label.textContent = LANG === 'en' ? 'Sending…' : '送信中…';
    try{
      const token = await new Promise((ok, ng) => {
        if(typeof grecaptcha === 'undefined') return ng(new Error('reCAPTCHA not loaded'));
        grecaptcha.ready(() => grecaptcha.execute(RECAPTCHA_KEY, {action:'contact'}).then(ok).catch(ng));
      });
      $('#recaptcha_token').value = token;
      const res = await fetch('/mail.php', {method:'POST', body:new FormData(form)});
      const json = await res.json();
      if(!json.success) throw new Error(json.message || 'send failed');
      form.hidden = true; $('#sent').classList.add('show'); $('#sent').focus();
    }catch(err){
      console.error(err);
      alert(LANG === 'en' ? 'Sending failed. Please try again later.' : '送信に失敗しました。時間をおいて再度お試しください。');
      btn.disabled = false; label.textContent = LANG === 'en' ? 'Send message' : '送信する';
    }
  });
}
