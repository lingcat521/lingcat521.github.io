#!/usr/bin/env node
/* 本地重建：从 posts.json + posts/<slug>/post.md 生成文章页与 atom.xml
   用法：node tools/build.js       （站内后台也能做同样的事，这个脚本用于批量重建） */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const sandbox = { window: {}, console: console };
vm.createContext(sandbox);
for (const f of ["assets/md.js", "assets/post-template.js"]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f });
}
const MD = sandbox.window.FlowerieMD;
const Post = sandbox.window.FloweriePost;

const dataPath = path.join(ROOT, "posts.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const posts = (data.posts || []).slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });

let changed = 0;
posts.forEach(function (p, i) {
  const mdPath = path.join(ROOT, "posts", p.slug, "post.md");
  if (!fs.existsSync(mdPath)) { console.log("  跳过（无 post.md）: " + p.slug); return; }
  const src = fs.readFileSync(mdPath, "utf8");
  const read = MD.readMinutes(src);
  if (read !== p.read) { p.read = read; }
  const html = Post.postPage(
    { title: p.title, slug: p.slug, date: p.date, tags: p.tags || [], read: read, summary: p.summary || "" },
    MD.render(src),
    posts[i + 1] || null,
    posts[i - 1] || null
  );
  const out = path.join(ROOT, "posts", p.slug, "index.html");
  const old = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
  if (old !== html) { fs.writeFileSync(out, html); changed++; console.log("  重建 posts/" + p.slug + "/index.html  (" + read + " 分钟)"); }
  else { console.log("  未变 posts/" + p.slug + "/index.html"); }
});

fs.writeFileSync(dataPath, JSON.stringify({ posts: posts }, null, 2) + "\n");

function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
const SITE = Post.SITE;
const lines = ["<?xml version=\"1.0\" encoding=\"utf-8\"?>",
  "<feed xmlns=\"http://www.w3.org/2005/Atom\">",
  "  <title>" + SITE.title + "</title>",
  "  <link href=\"https://lingcat521.github.io/atom.xml\" rel=\"self\"/>",
  "  <link href=\"https://lingcat521.github.io/\"/>",
  "  <updated>" + new Date().toISOString() + "</updated>",
  "  <id>https://lingcat521.github.io/</id>",
  "  <author><name>铃樱</name></author>"];
posts.forEach(function (p) {
  lines.push("  <entry>",
    "    <title>" + esc(p.title) + "</title>",
    "    <link href=\"https://lingcat521.github.io/posts/" + p.slug + "/\"/>",
    "    <id>https://lingcat521.github.io/posts/" + p.slug + "/</id>",
    "    <updated>" + (p.date || "") + "T12:00:00+08:00</updated>",
    "    <summary>" + esc(p.summary || "") + "</summary>",
    "  </entry>");
});
lines.push("</feed>", "");
fs.writeFileSync(path.join(ROOT, "atom.xml"), lines.join("\n"));
console.log("  重建 atom.xml（" + posts.length + " 条）");
console.log("完成：" + posts.length + " 篇，改动 " + changed + " 个页面");