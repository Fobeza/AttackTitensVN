#!/usr/bin/env node
/**
 * serve.mjs — статический сервер без зависимостей (вместо python -m http.server).
 *   node tools/serve.mjs          → http://localhost:8000/
 *   node tools/serve.mjs 8080
 * Отдаёт файлы с отключённым кэшем: правки сцен видны после обычного F5.
 */
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".md": "text/markdown; charset=utf-8",
  ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".woff2": "font/woff2"
};

export function serve(port = 8000, { log = true } = {}) {
  const server = http.createServer((req, res) => {
    let p;
    try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); }
    catch { res.writeHead(400).end("Bad request"); return; }
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(root, p);
    if (!file.startsWith(root + path.sep) || p.split("/").some(part => part.startsWith(".") || part === "node_modules")) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("404 " + p); return; }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(data);
    });
  });
  return new Promise(ok => server.listen(port, "0.0.0.0", () => {
    if (log) console.log(`Sova VN: http://localhost:${port}/  ·  Конструктор: http://localhost:${port}/editor.html`);
    ok(server);
  }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]))
  serve(+process.argv[2] || 8000);
