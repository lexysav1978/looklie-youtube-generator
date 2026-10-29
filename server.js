// Локальный помощник: принимает сценарии с сайта, по очереди отправляет их в Higgsfield API
// и сохраняет готовые видео в папку. Ключ хранится только в файле .env на вашем компьютере.
// Запуск: node server.js   (или двойной клик по start-server.bat)
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// ---------- настройки из .env ----------
const envPath = path.join(__dirname, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const KEY = process.env.HF_KEY || env.HF_KEY || '';
const MODEL = process.env.HF_MODEL || env.HF_MODEL || 'xai/grok-imagine-video/v1.5/reference-to-video';
const OUT_DIR = process.env.OUT_DIR || env.OUT_DIR || path.join(os.homedir(), 'Desktop', 'YouTuBe UP!');
const PORT = +(process.env.PORT || env.PORT || 8787);
const API = 'https://api.higgsfield.ai';
const ALLOWED_ORIGINS = ['https://lexysav1978.github.io', 'http://localhost:8765', 'http://127.0.0.1:8765'];
const POLL_MS = 8000;
const TIMEOUT_MS = 20 * 60 * 1000;

if (!KEY.includes(':')) {
  console.error('Не найден ключ HF_KEY. Создайте файл .env рядом с server.js (см. .env.example): HF_KEY=ID:SECRET');
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------- очередь ----------
const jobs = new Map();   // id -> {id,title,prompt,status,error,file,requestId}
const queue = [];
let running = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const safeName = (s) => String(s).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 60);

async function hf(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  return data;
}

async function runJob(job) {
  job.status = 'submitting';
  const sub = await hf(`${API}/${MODEL}`, {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ prompt: job.prompt, duration: 10, resolution: '720p', aspect_ratio: '9:16' })
  });
  job.requestId = sub.request_id;
  job.status = 'queued';
  const statusUrl = sub.status_url || `${API}/requests/${sub.request_id}/status`;
  const started = Date.now();
  for (;;) {
    await sleep(POLL_MS);
    const st = await hf(statusUrl);
    if (st.status === 'in_progress') job.status = 'generating';
    if (st.status === 'completed') {
      const url = st.video && st.video.url;
      if (!url) throw new Error('Нет video.url в ответе');
      const file = path.join(OUT_DIR, safeName(job.id) + '.mp4');
      const r = await fetch(url);
      if (!r.ok) throw new Error('Не удалось скачать видео: HTTP ' + r.status);
      fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
      job.file = file; job.status = 'done';
      return;
    }
    if (['failed', 'nsfw', 'canceled'].includes(st.status)) throw new Error(`Статус ${st.status}${st.error ? ': ' + JSON.stringify(st.error) : ''}`);
    if (Date.now() - started > TIMEOUT_MS) throw new Error('Превышено время ожидания');
  }
}

async function work() {
  if (running) return;
  running = true;
  while (queue.length) {
    const job = queue.shift();
    try { await runJob(job); console.log('Готово:', job.file); }
    catch (e) { job.status = 'failed'; job.error = String(e.message || e); console.error('Ошибка', job.id, job.error); }
  }
  running = false;
}

// ---------- HTTP ----------
function cors(req, res) {
  const o = req.headers.origin;
  if (o && ALLOWED_ORIGINS.includes(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
}
function send(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); }
function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = ''; req.on('data', (c) => { b += c; if (b.length > 2e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch (e) { reject(e); } });
  });
}

http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const o = req.headers.origin;
  if (o && !ALLOWED_ORIGINS.includes(o)) return send(res, 403, { error: 'origin not allowed' });
  const url = req.url.split('?')[0];
  try {
    if (req.method === 'GET' && url === '/health') return send(res, 200, { ok: true, model: MODEL, outDir: OUT_DIR });
    if (req.method === 'GET' && url === '/jobs') return send(res, 200, { jobs: [...jobs.values()] });
    if (req.method === 'POST' && url === '/generate') {
      const body = await readBody(req);
      const items = Array.isArray(body.items) ? body.items : [];
      const added = [];
      for (const it of items) {
        if (!it || !it.id || !it.prompt) continue;
        const existing = jobs.get(it.id);
        if (existing && !['failed', 'done'].includes(existing.status)) continue;   // уже в работе
        const job = { id: String(it.id), title: String(it.title || it.id), prompt: String(it.prompt), status: 'waiting', error: null, file: null, requestId: null };
        jobs.set(job.id, job); queue.push(job); added.push(job.id);
      }
      work();
      return send(res, 200, { added });
    }
    send(res, 404, { error: 'not found' });
  } catch (e) { send(res, 400, { error: String(e.message || e) }); }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Помощник запущен: http://localhost:${PORT}`);
  console.log(`Модель: ${MODEL}`);
  console.log(`Видео сохраняются в: ${OUT_DIR}`);
});
