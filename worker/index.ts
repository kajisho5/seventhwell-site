// お問い合わせ受付 Worker（/api/* だけここに来る。それ以外は静的ファイル）
import { Hono } from "hono";

type Env = {
  ASSETS: Fetcher;
  // メール送信のつなぎ込み。ドメインが Cloudflare に移るまでは無い（段階2で wrangler.jsonc に足す）
  EMAIL?: { send(msg: { to: string; from: string; subject: string; text: string; replyTo?: string }): Promise<unknown> };
  CONTACT_LIMIT?: { limit(o: { key: string }): Promise<{ success: boolean }> };
  CONTACT_TO: string;
  CONTACT_FROM: string;
  TURNSTILE_SECRET?: string;
};

const TYPES: Record<string, string> = { work: "お仕事のご依頼", estimate: "お見積もり", tech: "機材・技術について", other: "その他" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const app = new Hono<{ Bindings: Env }>();

app.post("/api/contact", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";

  // 同じ接続元からの連続送信を止める（1分に3回まで）
  if (c.env.CONTACT_LIMIT) {
    const { success } = await c.env.CONTACT_LIMIT.limit({ key: ip });
    if (!success) return c.json({ ok: false, error: "too_many" }, 429);
  }

  let form: FormData;
  try { form = await c.req.formData(); } catch { return c.json({ ok: false, error: "bad_request" }, 400); }
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const name = get("name"), email = get("email"), type = get("type"), message = get("message");
  const topic = get("topic").slice(0, 40), lang = get("lang") === "en" ? "en" : "ja";

  // 迷惑送信の罠欄（人間には見えない）に何か入っていたら、成功したふりをして捨てる
  if (get("website")) return c.json({ ok: true });

  if (!name || name.length > 100) return c.json({ ok: false, error: "name" }, 400);
  if (!EMAIL_RE.test(email) || email.length > 200) return c.json({ ok: false, error: "email" }, 400);
  if (!(type in TYPES)) return c.json({ ok: false, error: "type" }, 400);
  if (!message || message.length > 4000) return c.json({ ok: false, error: "message" }, 400);
  if ((message.match(/https?:\/\//g) ?? []).length > 2) return c.json({ ok: false, error: "links" }, 400);

  // Turnstile（人間かどうかの判定）は必須
  const token = get("cf-turnstile-response");
  if (!token || !c.env.TURNSTILE_SECRET) return c.json({ ok: false, error: "captcha" }, 400);
  const vr = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: c.env.TURNSTILE_SECRET, response: token, remoteip: ip }),
  });
  const verify = (await vr.json().catch(() => ({}))) as { success?: boolean };
  if (!verify.success) return c.json({ ok: false, error: "captcha" }, 400);

  const text = [
    `種別: ${TYPES[type]}${topic ? `（${topic}）` : ""}`,
    `お名前: ${name}`,
    `メール: ${email}`,
    `言語: ${lang}`,
    "",
    message,
    "",
    "---",
    `送信元IP: ${ip}`,
    `受付: ${new Date().toISOString()}`,
  ].join("\n");

  if (!c.env.EMAIL) {
    console.error("EMAIL binding is not set yet");
    return c.json({ ok: false, error: "send" }, 503);
  }
  try {
    await c.env.EMAIL.send({
      to: c.env.CONTACT_TO,
      from: c.env.CONTACT_FROM,
      replyTo: email,
      subject: `[サイト問い合わせ] ${TYPES[type]} — ${name}`,
      text,
    });
  } catch (e) {
    console.error("send failed", e);
    return c.json({ ok: false, error: "send" }, 502);
  }
  return c.json({ ok: true });
});

app.all("/api/*", (c) => c.json({ ok: false, error: "not_found" }, 404));

export default app;
