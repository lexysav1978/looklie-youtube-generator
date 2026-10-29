// Локальный помощник: принимает сценарии с сайта, по очереди отправляет их в Higgsfield API
// и сохраняет готовые видео в папку. Ключ хранится только в файле .env на вашем компьютере.
// Запуск: node server.js   (или двойной клик по start-server.bat)
const http = require('http');
const { spawn } = require('child_process');
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
const MODE = process.env.MODE || env.MODE || (KEY ? 'api' : 'hf');   // hf = Higgsfield CLI (hf.exe, уже авторизован), cli = через Claude CLI, api = через ключ
const CLI_MODEL = process.env.CLI_MODEL || env.CLI_MODEL || 'grok_video_v15_lite';
const CLAUDE_ARGS = process.env.CLAUDE_ARGS || env.CLAUDE_ARGS || '--dangerously-skip-permissions';
const MODEL = process.env.HF_MODEL || env.HF_MODEL || 'xai/grok-imagine-video/v1.5/reference-to-video';
const OUT_DIR = process.env.OUT_DIR || env.OUT_DIR || path.join(os.homedir(), 'Desktop', 'YouTuBe UP!');
const PORT = +(process.env.PORT || env.PORT || 8787);
const HF_BIN = process.env.HF_BIN || env.HF_BIN || [path.join(os.homedir(), 'bin', 'hf.exe')].find((p) => fs.existsSync(p)) || 'hf';
const API = 'https://api.higgsfield.ai';
const ALLOWED_ORIGINS = ['https://lexysav1978.github.io', 'http://localhost:8765', 'http://127.0.0.1:8765'];
const POLL_MS = 8000;
const TIMEOUT_MS = 20 * 60 * 1000;

if (MODE === 'api' && !KEY.includes(':')) {
  console.error('Режим api: не найден ключ HF_KEY. Создайте файл .env рядом с server.js (см. .env.example): HF_KEY=ID:SECRET');
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------- модели (все умеют 10 сек и 9:16) ----------
const MODELS = [
  { id: 'grok_video_v15_lite', name: 'Grok Imagine 1.5 Lite', args: ['--resolution', '720p'] },
  { id: 'wan3_0', name: 'Wan 3.0', args: ['--resolution', '720p'], ref: true },
  { id: 'kling3_0', name: 'Kling 3.0', args: [] },
  { id: 'kling4_0', name: 'Kling 4.0', args: ['--resolution', '720p'], ref: true, refArgs: ['--mode', 'reference-to-video'] },
  { id: 'happy_horse_video', name: 'Happy Horse', args: ['--resolution', '720p'] },
  { id: 'seedance_2_0', name: 'Seedance 2.0', args: ['--resolution', '720p'], ref: true },
  { id: 'seedance_2_5', name: 'Seedance 2.5', args: ['--resolution', '720p'], ref: true, refArgs: ['--mode', 'omni_reference'] }
];
// паспорт героя: клеится референсом ко всем моделям, которые принимают image_references
const PASSPORT = path.join(__dirname, 'character', 'passport.png');
const modelById = (id) => MODELS.find((m) => m.id === id) || MODELS.find((m) => m.id === CLI_MODEL) || MODELS[0];
const modelArgs = (m) => ['--duration', '10', '--aspect_ratio', '9:16', ...m.args, ...(m.ref && fs.existsSync(PASSPORT) ? [...(m.refArgs || []), '--image-references', PASSPORT] : [])];

// У сценария может быть несколько роликов (версий): fruits.mp4, fruits--v2.mp4, fruits--v3.mp4 …
// Для каждой версии запоминаем сценарий, модель, цену и промпт (файл рядом с server.js, в git не попадает).
const META_PATH = path.join(__dirname, 'jobs.json');
let meta = {};
try { meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8')); } catch {}
function saveMeta(job) {
  meta[job.id] = { scenario: job.scenario, model: job.model, credits: job.credits, prompt: job.prompt };
  try { fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2)); } catch {}
}
const scenarioOf = (key) => (meta[key] && meta[key].scenario) || key.replace(/--v\d+$/, '');

// ---------- очередь ----------
const jobs = new Map();   // id версии (= имя файла без .mp4) -> {id,scenario,title,prompt,model,credits,status,error,file}
const queue = [];
let running = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const safeName = (s) => String(s).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 60);
// первое свободное имя версии: fruits, потом fruits--v2, fruits--v3 …
function nextKey(scenario) {
  const base = safeName(scenario);
  for (let n = 1; ; n++) {
    const key = n === 1 ? base : base + '--v' + n;
    if (!jobs.has(key) && !fs.existsSync(path.join(OUT_DIR, key + '.mp4'))) return key;
  }
}

async function hf(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  return data;
}

// ---------- режим CLI: Claude Code + Higgsfield MCP ----------
function runClaude(promptText) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', ...CLAUDE_ARGS.split(' ').filter(Boolean)], { shell: true, cwd: __dirname });
    let out = '', err = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Превышено время ожидания Claude CLI')); }, TIMEOUT_MS);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => { clearTimeout(timer); code === 0 ? resolve(out) : reject(new Error((err || out || 'claude завершился с кодом ' + code).trim().slice(0, 400))); });
    child.stdin.end(promptText);
  });
}

async function runJobCli(job) {
  job.status = 'generating';
  const ask = [
    'Сгенерируй одно видео через MCP-инструмент Higgsfield generate_video (без project/folder, без референс-картинок).',
    'Параметры: model "' + CLI_MODEL + '", aspect_ratio "9:16", resolution "720p", duration 10, count 1.',
    'Если инструмент предложит пресет (preset_recommendation) — отклони его: повтори вызов с declined_preset_id.',
    'Если инструмент спросит про unlim — не используй use_unlim, оплата обычными кредитами.',
    'Дождись готовности через jobs_wait (повторяй, пока не завершится). Ничего больше не делай и не скачивай.',
    'Последней строкой ответа выведи ровно: RESULT_URL: <ссылка на mp4> (или ERROR: <причина>).',
    'Промпт для видео (передай как есть, без изменений) между маркерами:',
    '<<<PROMPT',
    job.prompt,
    'PROMPT>>>'
  ].join('\n');
  const out = await runClaude(ask);
  const m = out.match(/RESULT_URL:\s*(https?:\/\/\S+)/);
  if (!m) { const e = out.match(/ERROR:\s*(.+)/); throw new Error(e ? e[1] : 'Claude не вернул ссылку: ' + out.slice(-300)); }
  const file = path.join(OUT_DIR, safeName(job.id) + '.mp4');
  const r = await fetch(m[1].replace(/[)\]>.,]+$/, ''));
  if (!r.ok) throw new Error('Не удалось скачать видео: HTTP ' + r.status);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  job.file = file; job.status = 'done';
  saveMeta(job);
}

// ---------- режим hf: Higgsfield CLI (как в проекте «Автоматизация Контента»), вход уже выполнен ----------
function runHf(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(HF_BIN, args, { windowsHide: true });
    let out = '', err = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Превышено время ожидания Higgsfield')); }, TIMEOUT_MS);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => { clearTimeout(timer); code === 0 ? resolve(out) : reject(new Error((err || out || 'hf завершился с кодом ' + code).trim().slice(0, 400))); });
    child.stdin.end(input);   // промпт идёт через stdin
  });
}

const costCache = {};   // id модели -> {credits, at}
async function modelCost(m) {
  const c = costCache[m.id];
  if (c && Date.now() - c.at < 10 * 60 * 1000) return c.credits;
  try {
    const out = await runHf(['generate', 'cost', m.id, '--prompt', 'cost', ...modelArgs(m), '--json'], '');
    const credits = JSON.parse(out).credits;
    if (typeof credits === 'number') { costCache[m.id] = { credits, at: Date.now() }; return credits; }
  } catch {}
  return c ? c.credits : null;
}
async function balance() {
  try { return JSON.parse(await runHf(['account', 'status', '--json'], '')).credits; } catch { return null; }
}

async function runJobHf(job) {
  job.status = 'generating';
  const out = await runHf(['generate', 'create', job.model, ...modelArgs(modelById(job.model)), '--wait', '--wait-timeout', '20m', '--json'], job.prompt);
  let r; try { r = JSON.parse(out); } catch { throw new Error('Не удалось разобрать ответ hf: ' + out.slice(-300)); }
  r = Array.isArray(r) ? r[0] : r;
  if (!r || r.status !== 'completed' || !r.result_url) throw new Error('Статус: ' + (r && r.status));
  const file = path.join(OUT_DIR, safeName(job.id) + '.mp4');
  const dl = await fetch(r.result_url);
  if (!dl.ok) throw new Error('Не удалось скачать видео: HTTP ' + dl.status);
  fs.writeFileSync(file, Buffer.from(await dl.arrayBuffer()));
  job.file = file; job.status = 'done';
  saveMeta(job);
}

async function runJob(job) {
  if (MODE === 'hf') return runJobHf(job);
  if (MODE === 'cli') return runJobCli(job);
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
      saveMeta(job);
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
    if (req.method === 'GET' && url === '/health') return send(res, 200, { ok: true, mode: MODE, model: MODE !== 'api' ? CLI_MODEL : MODEL, outDir: OUT_DIR });
    if (req.method === 'GET' && url === '/models') {
      const [credits, bal] = await Promise.all([Promise.all(MODELS.map(modelCost)), balance()]);
      return send(res, 200, { default: modelById(CLI_MODEL).id, balance: bal, models: MODELS.map((m, i) => ({ id: m.id, name: m.name, credits: credits[i], ref: !!(m.ref && fs.existsSync(PASSPORT)) })) });
    }
    if (req.method === 'GET' && url === '/jobs') {
      const list = [...jobs.values()];
      for (const f of fs.readdirSync(OUT_DIR)) {
        if (!/\.mp4$/i.test(f)) continue;
        const id = f.replace(/\.mp4$/i, '');
        if (!jobs.has(id)) list.push({ id, title: id, status: 'done', file: path.join(OUT_DIR, f), ...(meta[id] || {}), scenario: scenarioOf(id) });
      }
      const doneAt = (j) => { try { return j.status === 'done' && j.file ? fs.statSync(j.file).mtimeMs : undefined; } catch { return undefined; } };
      return send(res, 200, { jobs: list.map((j) => ({ ...j, modelName: j.model ? modelById(j.model).name : undefined, doneAt: doneAt(j) })) });
    }
    if (req.method === 'GET' && url.startsWith('/video/')) {
      const name = path.basename(decodeURIComponent(url.slice(7)));
      const fp = path.join(OUT_DIR, name);
      if (!/\.mp4$/i.test(name) || !fs.existsSync(fp)) return send(res, 404, { error: 'no video' });
      const size = fs.statSync(fp).size;
      const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
      let start = 0, end = size - 1, code = 200;
      if (range) { if (range[1]) start = +range[1]; if (range[2]) end = Math.min(+range[2], size - 1); code = 206; }
      const h = { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 };
      if (code === 206) h['Content-Range'] = `bytes ${start}-${end}/${size}`;
      res.writeHead(code, h);
      return fs.createReadStream(fp, { start, end }).pipe(res);
    }
    if (req.method === 'POST' && url === '/generate') {
      const body = await readBody(req);
      const items = Array.isArray(body.items) ? body.items : [];
      const added = [];
      for (const it of items) {
        if (!it || !it.id || !it.prompt) continue;
        const scenario = String(it.id);
        // обычный запуск не дублирует сценарий, который уже в работе; перегенерация (regen) всегда даёт новую версию
        const busy = [...jobs.values()].some((j) => j.scenario === scenario && !['failed', 'done'].includes(j.status));
        if (busy && !it.regen) continue;
        const m = modelById(it.model);
        const job = { id: nextKey(scenario), scenario, title: String(it.title || scenario), prompt: String(it.prompt), model: m.id, credits: await modelCost(m), status: 'waiting', error: null, file: null, requestId: null };
        jobs.set(job.id, job); queue.push(job); added.push(job.id);
      }
      work();
      return send(res, 200, { added });
    }
    send(res, 404, { error: 'not found' });
  } catch (e) { send(res, 400, { error: String(e.message || e) }); }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Помощник запущен: http://localhost:${PORT}`);
  console.log(`Режим: ${MODE}, модель: ${MODE !== 'api' ? CLI_MODEL : MODEL}`);
  console.log(`Видео сохраняются в: ${OUT_DIR}`);
});
