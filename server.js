import express from "express";
import crypto from "node:crypto";
import { get as getBlob, put as putBlob } from "@vercel/blob";
import { access, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const app = express();
const root = import.meta.dirname;
const dist = resolve(root, "dist");
const eventFile = resolve(root, "config", "game-event.json");
const port = Number(process.env.PORT || 4174);
const isProduction = process.env.NODE_ENV === "production";
const adminUser = process.env.ADMIN_USER || (isProduction ? "" : "admin");
const adminPassword = process.env.ADMIN_PASSWORD || (isProduction ? "" : "Gano+1-Admin-2026!");
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? "" : "local-gano-plus-session-secret-change-before-production");
const loginAttempts = new Map();
const eventBlobPath = "gano-plus/config/game-event.json";
const SESSION_TTL = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW = 15 * 60 * 1000;
const LOGIN_LIMIT = 5;

if (!adminUser || !adminPassword || sessionSecret.length < 32) {
  throw new Error("Configura ADMIN_USER, ADMIN_PASSWORD y SESSION_SECRET (mínimo 32 caracteres) antes de iniciar en producción.");
}

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "10kb", strict: true }));
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin"
  });
  if (isProduction) {
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  next();
});

function constantTimeEqual(left, right) {
  const a = crypto.createHash("sha256").update(String(left)).digest();
  const b = crypto.createHash("sha256").update(String(right)).digest();
  return crypto.timingSafeEqual(a, b);
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map(part => part.trim()).filter(Boolean).map(part => {
    const separator = part.indexOf("=");
    return separator < 0 ? [part, ""] : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
  }));
}

function sign(value) {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function encodeSession(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function sessionFromRequest(req) {
  const raw = parseCookies(req.headers.cookie).gano_admin;
  if (!raw) return null;
  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature || !constantTimeEqual(signature, sign(encoded))) return null;
  try {
    const session = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!session?.csrf || !session?.expiresAt || session.expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const session = sessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Sesión no válida o vencida." });
  req.adminSession = session;
  next();
}

function requireCsrf(req, res, next) {
  if (!constantTimeEqual(req.headers["x-csrf-token"] || "", req.adminSession.csrf)) {
    return res.status(403).json({ error: "Solicitud de administración no válida." });
  }
  next();
}

function clientKey(req) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function canAttemptLogin(req) {
  const key = clientKey(req);
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || record.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW });
    return true;
  }
  record.count += 1;
  return record.count <= LOGIN_LIMIT;
}

async function readEvent() {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const stored = await getBlob(eventBlobPath, { access: "private" });
    if (stored?.statusCode === 200) {
      return JSON.parse(await new Response(stored.stream).text());
    }
  }
  return JSON.parse(await readFile(eventFile, "utf8"));
}

async function writeEvent(event) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await putBlob(eventBlobPath, JSON.stringify(event), {
      access: "private",
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      contentType: "application/json"
    });
    return;
  }
  if (process.env.VERCEL) {
    throw new Error("Falta conectar Vercel Blob al proyecto.");
  }
  const temporary = `${eventFile}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(event, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await rename(temporary, eventFile);
}

function normalizeEvent(body) {
  const localDateTime = String(body?.localDateTime || "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localDateTime)) return null;
  const parsed = new Date(`${localDateTime}:00-05:00`);
  if (!Number.isFinite(parsed.getTime())) return null;
  const now = Date.now();
  if (parsed.getTime() < now - 60_000 || parsed.getTime() > now + 366 * 24 * 60 * 60 * 1000) return null;
  return {
    date: `${localDateTime}:00-05:00`,
    timezone: "America/Guayaquil",
    timezoneLabel: "ECT",
    updatedAt: new Date().toISOString()
  };
}

app.get("/api/fecha-juego", async (_req, res, next) => {
  try {
    res.set("Cache-Control", "no-store").json(await readEvent());
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/login", (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!canAttemptLogin(req)) return res.status(429).json({ error: "Demasiados intentos. Espera 15 minutos." });
  if (!constantTimeEqual(req.body?.username || "", adminUser) || !constantTimeEqual(req.body?.password || "", adminPassword)) {
    return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  }
  loginAttempts.delete(clientKey(req));
  const csrf = crypto.randomBytes(24).toString("base64url");
  const sessionCookie = encodeSession({ csrf, expiresAt: Date.now() + SESSION_TTL });
  const secure = isProduction || req.secure ? "; Secure" : "";
  res.setHeader("Set-Cookie", `gano_admin=${sessionCookie}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL / 1000}${secure}`);
  res.json({ ok: true, csrf });
});

app.get("/api/admin/session", requireAdmin, (req, res) => {
  res.set("Cache-Control", "no-store").json({ authenticated: true, csrf: req.adminSession.csrf });
});

app.post("/api/admin/logout", requireAdmin, requireCsrf, (req, res) => {
  res.setHeader("Set-Cookie", "gano_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
  res.json({ ok: true });
});

app.post("/api/fecha-juego", requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const event = normalizeEvent(req.body);
    if (!event) return res.status(400).json({ error: "Selecciona una fecha futura válida dentro de los próximos 12 meses." });
    await writeEvent(event);
    res.set("Cache-Control", "no-store").json({ ok: true, event });
  } catch (error) {
    next(error);
  }
});

let publicRoot = root;
try {
  await access(resolve(dist, "gano-plus-landing.html"));
  publicRoot = dist;
} catch {}

app.use(express.static(publicRoot, {
  etag: true,
  maxAge: isProduction ? "1h" : 0,
  setHeaders(res, file) {
    if (file.endsWith("admin.html")) res.set("Cache-Control", "no-store");
  }
}));
app.get("/admin", (_req, res) => res.sendFile(resolve(publicRoot, "admin.html")));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "No fue posible completar la operación." });
});

if (!process.env.VERCEL) {
  app.listen(port, "127.0.0.1", () => {
    console.log(`GANO+1 listo en http://127.0.0.1:${port}`);
    if (!isProduction) console.log("Acceso local inicial: admin / Gano+1-Admin-2026!");
  });
}

export default app;
