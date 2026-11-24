// M4: one painted episode end-to-end through POST /api/generate on the worktree server (port 4020, DB ai-studio-anim)
import fs from "node:fs";
import http from "node:http";
// the route answers only when the whole video is done (10-20 min): plain http.request, no client timeouts
const post = (url, headers, body) => new Promise((res, rej) => { const q = http.request(url, { method: "POST", headers: { "content-type": "application/json", ...headers } }, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => { try { res(JSON.parse(d)); } catch { res({ raw: d.slice(0, 2000) }); } }); }); q.on("error", rej); q.end(body); });
const base = "http://localhost:4020";
const here = new URL(".", import.meta.url).pathname;
const email = `anim-test-p2-${Date.now()}@local.test`;
const password = `P2-${Math.random().toString(36).slice(2)}-x9`;
const r = await fetch(`${base}/api/auth/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Anim P2 Test", email, password }) });
const reg = await r.json();
if (!reg.accessToken) { console.log("register failed", reg); process.exit(1); }
console.log("registered", email, new Date().toISOString());
const t = Date.now();
const res = await post(`${base}/api/generate`, { authorization: `Bearer ${reg.accessToken}` }, JSON.stringify({ script: fs.readFileSync(`${here}m4-script.txt`, "utf8"), provider: "gemini", dimension: "horizontal", animationMode: "painted", bgmMood: "none", language: "hi" }));
console.log("RESULT", JSON.stringify(res, null, 1).slice(0, 4000));
console.log("elapsed s", (Date.now() - t) / 1000);
