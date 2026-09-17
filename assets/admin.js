/* 站内管理后台：浏览器直连 GitHub API（令牌只存本地 localStorage，不经过任何第三方） */
(function () {
  "use strict";
  var OWNER = "lingcat521";
  var REPO = "lingcat521.github.io";
  var BRANCH = "main";
  var API = "https://api.github.com";
  var RAW = "https://raw.githubusercontent.com/" + OWNER + "/" + REPO + "/" + BRANCH + "/";
  var TOKEN_KEY = "blog_admin_token";
  var state = { posts: [], editing: null };

  function $(id) { return document.getElementById(id); }
  function tok() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } }
  function setTok(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function b64ToUtf8(b64) {
    var bin = atob(String(b64).replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }
  function say(msg, kind) {
    var el = $("status");
    if (!el) return;
    el.textContent = msg;
    el.className = "admin-status" + (kind ? " " + kind : "");
  }

  function api(method, path, body) {
    var opt = { method: method, headers: { "Accept": "application/vnd.github+json" } };
    if (tok()) opt.headers["Authorization"] = "Bearer " + tok();
    if (body) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
    return fetch(API + path, opt).then(function (r) {
      if (r.status === 204) return {};
      return r.text().then(function (t) {
        var data;
        try { data = JSON.parse(t); } catch (e) { throw new Error("HTTP " + r.status + " " + t.slice(0, 160)); }
        if (!r.ok) throw new Error("HTTP " + r.status + " " + (data.message || t.slice(0, 160)));
        return data;
      });
    });
  }

  /* ---------- 一次提交多个文件（Git Data API）---------- */
  function commitFiles(files, message) {
    var baseCommit, baseTree;
    return api("GET", "/repos/" + OWNER + "/" + REPO + "/git/ref/heads/" + BRANCH)
      .then(function (ref) { return api("GET", "/repos/" + OWNER + "/" + REPO + "/git/commits/" + ref.object.sha); })
      .then(function (c) {
        baseCommit = c.sha; baseTree = c.tree.sha;
        var jobs = files.map(function (f) {
          if (f.content === null) return Promise.resolve({ path: f.path, mode: "100644", type: "blob", sha: null });
          return api("POST", "/repos/" + OWNER + "/" + REPO + "/git/blobs", { content: f.content, encoding: "utf-8" })
            .then(function (b) { return { path: f.path, mode: "100644", type: "blob", sha: b.sha }; });
        });
        return Promise.all(jobs);
      })
      .then(function (tree) { return api("POST", "/repos/" + OWNER + "/" + REPO + "/git/trees", { base_tree: baseTree, tree: tree }); })
      .then(function (t) { return api("POST", "/repos/" + OWNER + "/" + REPO + "/git/commits", { message: message, tree: t.sha, parents: [baseCommit] }); })
      .then(function (c) { return api("PATCH", "/repos/" + OWNER + "/" + REPO + "/git/refs/heads/" + BRANCH, { sha: c.sha }).then(function () { return c; }); });
  }

  function loadPosts() {
    return fetch(RAW + "posts.json?v=" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (d) { state.posts = (d.posts || []).slice(); return state.posts; });
  }

  function renderList() {
    var box = $("admin-list");
    if (!box) return;
    if (!state.posts.length) { box.innerHTML = "<p class=\"empty\">还没有文章，右侧新建一篇吧。</p>"; return; }
    var rows = state.posts.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
    box.innerHTML = rows.map(function (p) {
      return "<div class=\"admin-row\">" +
        "<div><a href=\"/posts/" + esc(p.slug) + "/\" target=\"_blank\" rel=\"noopener\"><strong>" + esc(p.title) + "</strong></a>" +
        "<div class=\"meta\"><span>" + esc(p.date) + "</span><span>/posts/" + esc(p.slug) + "/</span>" +
        (p.tags || []).map(function (t) { return "<span class=\"tag\">#" + esc(t) + "</span>"; }).join("") + "</div></div>" +
        "<div class=\"admin-actions\">" +
        "<button type=\"button\" class=\"icon-btn\" data-edit=\"" + esc(p.slug) + "\" title=\"编辑\">✏️</button>" +
        "<button type=\"button\" class=\"icon-btn\" data-del=\"" + esc(p.slug) + "\" title=\"删除\">🗑️</button>" +
        "</div></div>";
    }).join("");
  }

  function atom(posts) {
    var SITE = (window.FloweriePost && window.FloweriePost.SITE) || { title: "铃樱の小站" };
    var head = ["<?xml version=\"1.0\" encoding=\"utf-8\"?>",
      "<feed xmlns=\"http://www.w3.org/2005/Atom\">",
      "  <title>" + SITE.title + "</title>",
      "  <link href=\"https://lingcat521.github.io/atom.xml\" rel=\"self\"/>",
      "  <link href=\"https://lingcat521.github.io/\"/>",
      "  <updated>" + new Date().toISOString() + "</updated>",
      "  <id>https://lingcat521.github.io/</id>",
      "  <author><name>铃樱</name></author>"];
    var items = posts.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }).map(function (p) {
      return ["  <entry>",
        "    <title>" + esc(p.title) + "</title>",
        "    <link href=\"https://lingcat521.github.io/posts/" + p.slug + "/\"/>",
        "    <id>https://lingcat521.github.io/posts/" + p.slug + "/</id>",
        "    <updated>" + (p.date || "") + "T12:00:00+08:00</updated>",
        "    <summary>" + esc(p.summary || "") + "</summary>",
        "  </entry>"].join("\n");
    });
    return head.concat(items, ["</feed>", ""]).join("\n");
  }

  function neighbours(slug) {
    var sorted = state.posts.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
    var i = -1;
    sorted.forEach(function (p, k) { if (p.slug === slug) i = k; });
    return { prev: i >= 0 ? sorted[i + 1] : null, next: i > 0 ? sorted[i - 1] : null };
  }

  /* ---------- 编辑器 ---------- */
  function toSlug(s) {
    return String(s).toLowerCase().trim()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/[\u4e00-\u9fa5]/g, "")
      .replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-") || "post-" + Date.now().toString(36);
  }

  function fillForm(p, body) {
    $("f-title").value = p ? p.title : "";
    $("f-slug").value = p ? p.slug : "";
    $("f-date").value = p ? p.date : new Date().toISOString().slice(0, 10);
    $("f-tags").value = p ? (p.tags || []).join(", ") : "";
    $("f-summary").value = p ? (p.summary || "") : "";
    $("f-body").value = body || "";
    $("f-pinned").checked = !!(p && p.pinned);
    $("f-private").checked = !!(p && p.private);
    state.editing = p ? p.slug : null;
    $("editor-title").textContent = p ? "编辑文章：" + p.title : "新建文章";
    $("btn-delete").style.display = p ? "" : "none";
    updatePreview();
  }

  function updatePreview() {
    var box = $("preview");
    if (!box) return;
    var md = $("f-body").value;
    box.innerHTML = window.FlowerieMD.render(md);
  }

  function openEditor(slug) {
    if (!slug) { fillForm(null, ""); say("已切换到新建模式", ""); return; }
    var p = state.posts.filter(function (x) { return x.slug === slug; })[0];
    say("正在读取 posts/" + slug + "/post.md …", "");
    fetch(RAW + "posts/" + slug + "/post.md?v=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status + "（这篇可能没有 Markdown 源文件）"); return r.text(); })
      .then(function (md) { fillForm(p, md); say("已载入，可编辑后点「保存并发布」", "ok"); })
      .catch(function (e) { fillForm(p, ""); say("读取源文件失败：" + e.message + "（可重新粘贴正文后保存）", "err"); });
  }

  function collect() {
    var title = $("f-title").value.trim();
    if (!title) throw new Error("标题不能为空");
    var slug = ($("f-slug").value.trim() || toSlug(title));
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error("网址片段只能用英文小写、数字和连字符，例如 my-first-post");
    var date = $("f-date").value || new Date().toISOString().slice(0, 10);
    var tags = $("f-tags").value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
    var summary = $("f-summary").value.trim();
    var body = $("f-body").value;
    if (!body.trim()) throw new Error("正文不能为空");
    return { title: title, slug: slug, date: date, tags: tags, summary: summary, body: body,
      pinned: $("f-pinned").checked, private: $("f-private").checked };
  }

  function sortByDate(a, b) { return (b.date || "").localeCompare(a.date || ""); }

  /* 读取某篇的 Markdown 源（已在编辑器里的那篇直接用当前内容） */
  function readSource(p, edited) {
    if (edited && p.slug === edited.slug) return Promise.resolve(edited.body);
    return fetch(RAW + "posts/" + p.slug + "/post.md?v=" + Date.now())
      .then(function (r) { return r.ok ? r.text() : null; })
      .catch(function () { return null; });
  }

  function save() {
    var d;
    try { d = collect(); } catch (e) { say(e.message, "err"); return; }
    if (!tok()) { say("请先填 GitHub 令牌", "err"); return; }

    var list = state.posts.filter(function (p) { return p.slug !== d.slug; });
    list.push({ title: d.title, slug: d.slug, date: d.date, tags: d.tags, read: 1, summary: d.summary,
      pinned: !!d.pinned, private: !!d.private });
    list.sort(sortByDate);

    say("正在收集各篇源文件…", "");
    $("btn-save").disabled = true;

    Promise.all(list.map(function (p) { return readSource(p, d); }))
      .then(function (sources) {
        /* 重算阅读时长，并重新生成每一篇（这样相邻文章的「上一篇/下一篇」永远是对的） */
        var files = [{ path: "posts/" + d.slug + "/post.md", content: d.body }];
        list.forEach(function (p, i) {
          var src = sources[i];
          if (src == null) return;                       /* 没有源文件就不动它的页面 */
          p.read = window.FlowerieMD.readMinutes(src);
          files.push({
            path: "posts/" + p.slug + "/index.html",
            content: window.FloweriePost.postPage(p, window.FlowerieMD.render(src), list[i + 1] || null, list[i - 1] || null)
          });
        });
        files.push({ path: "posts.json", content: JSON.stringify({ posts: list }, null, 2) + "\n" });
        files.push({ path: "atom.xml", content: atom(list) });

        say("正在提交 " + files.length + " 个文件到 GitHub…", "");
        return commitFiles(files, (state.editing ? "post: 更新《" + d.title + "》" : "post: 新增《" + d.title + "》") + "（站内后台）")
          .then(function (c) {
            state.posts = list;
            state.editing = d.slug;
            renderList();
            say("✅ 已提交 " + c.sha.slice(0, 7) + "（含 " + files.length + " 个文件），Pages 约 1 分钟后生效", "ok");
          });
      })
      .catch(function (e) { say("提交失败：" + e.message, "err"); })
      .then(function () { $("btn-save").disabled = false; });
  }

  function remove(slug) {
    var p = state.posts.filter(function (x) { return x.slug === slug; })[0];
    if (!p) return;
    if (!confirm("确定删除《" + p.title + "》？\n会同时删除 posts/" + slug + "/ 下的文件，并从列表和 RSS 里移除。")) return;
    var list = state.posts.filter(function (x) { return x.slug !== slug; });
    var files = [
      { path: "posts/" + slug + "/index.html", content: null },
      { path: "posts/" + slug + "/post.md", content: null },
      { path: "posts.json", content: JSON.stringify({ posts: list }, null, 2) + "\n" },
      { path: "atom.xml", content: atom(list) }
    ];
    say("正在删除…", "");
    commitFiles(files, "post: 删除《" + p.title + "》（站内后台）")
      .then(function (c) { state.posts = list; renderList(); if (state.editing === slug) fillForm(null, ""); say("✅ 已删除：" + c.sha.slice(0, 7), "ok"); })
      .catch(function (e) { say("删除失败：" + e.message, "err"); });
  }

  /* ---------- 站点设置（site.json）---------- */
  function siteStatus(msg, kind) {
    var e = $("site-status");
    if (!e) return;
    e.textContent = msg;
    e.className = "admin-status" + (kind ? " " + kind : "");
  }

  function pct(v) { return Math.round((v == null ? 0.5 : v) * 100); }

  function fillSite(c) {
    c = c || {};
    var a = c.appearance || {};
    if (!$("s-card")) return;
    $("s-card").value = pct(a.cardAlpha);
    $("s-bg").value = pct(a.bgImageOpacity);
    $("v-card").textContent = pct(a.cardAlpha) + "%";
    $("v-bg").textContent = pct(a.bgImageOpacity) + "%";
    $("s-blur").value = a.cardBlur || "12px";
    $("s-views").value = (c.views && c.views.provider) || "none";
    $("s-views-endpoint").value = (c.views && c.views.endpoint) || "";
    $("s-comments").value = (c.comments && c.comments.provider) || "none";
    $("s-c-repo").value = (c.comments && c.comments.repo) || "";
    $("s-c-repoid").value = (c.comments && c.comments.repoId) || "";
    $("s-c-catid").value = (c.comments && c.comments.categoryId) || "";
  }

  function loadSite() {
    return fetch(RAW + "site.json?v=" + Date.now())
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (d) { fillSite(d); return d; })
      .catch(function () { fillSite({}); });
  }

  function saveSite() {
    if (!tok()) { siteStatus("请先填 GitHub 令牌", "err"); return; }
    var cfg = {
      appearance: {
        cardAlpha: Number($("s-card").value) / 100,
        bgImageOpacity: Number($("s-bg").value) / 100,
        cardBlur: $("s-blur").value.trim() || "12px"
      },
      views: { provider: $("s-views").value, endpoint: $("s-views-endpoint").value.trim() },
      comments: {
        provider: $("s-comments").value,
        repo: $("s-c-repo").value.trim(),
        repoId: $("s-c-repoid").value.trim(),
        category: "Announcements",
        categoryId: $("s-c-catid").value.trim(),
        reactions: true,
        inputPosition: "top"
      },
      features: { device: true, share: true, like: true }
    };
    siteStatus("正在保存…", "");
    commitFiles([{ path: "site.json", content: JSON.stringify(cfg, null, 2) + "\n" }], "chore: 更新站点设置（站内后台）")
      .then(function (c) { siteStatus("✅ 已保存 " + c.sha.slice(0, 7) + "，刷新页面即生效", "ok"); })
      .catch(function (e) { siteStatus("保存失败：" + e.message, "err"); });
  }

  function bindSite() {
    if (!$("btn-save-site")) return;
    $("btn-save-site").addEventListener("click", saveSite);
    $("btn-load-site").addEventListener("click", function () { loadSite(); siteStatus("已重新载入", ""); });
    $("s-card").addEventListener("input", function () { $("v-card").textContent = $("s-card").value + "%"; });
    $("s-bg").addEventListener("input", function () { $("v-bg").textContent = $("s-bg").value + "%"; });
  }

  function bind() {
    $("btn-save-token").addEventListener("click", function () {
      var t = $("f-token").value.trim();
      if (!t) { say("令牌为空", "err"); return; }
      setTok(t);
      say("正在校验令牌…", "");
      api("GET", "/repos/" + OWNER + "/" + REPO)
        .then(function (r) { say("✅ 令牌有效，可写入 " + r.full_name + "（权限 " + (r.permissions && r.permissions.push ? "含 push" : "只读") + "）", "ok"); })
        .catch(function (e) { say("令牌校验失败：" + e.message, "err"); });
    });
    $("btn-clear-token").addEventListener("click", function () { setTok(""); $("f-token").value = ""; say("已清除本机保存的令牌", ""); });
    $("btn-new").addEventListener("click", function () { openEditor(null); });
    $("btn-save").addEventListener("click", save);
    $("btn-preview").addEventListener("click", updatePreview);
    $("btn-delete").addEventListener("click", function () { if (state.editing) remove(state.editing); });
    $("f-body").addEventListener("input", function () { clearTimeout(window.__pv); window.__pv = setTimeout(updatePreview, 300); });
    $("admin-list").addEventListener("click", function (ev) {
      var b = ev.target.closest ? ev.target.closest("button") : null;
      if (!b) return;
      if (b.getAttribute("data-edit")) openEditor(b.getAttribute("data-edit"));
      if (b.getAttribute("data-del")) remove(b.getAttribute("data-del"));
    });
    $("f-title").addEventListener("blur", function () {
      if (!$("f-slug").value.trim()) $("f-slug").value = toSlug($("f-title").value);
    });
  }

  function boot() {
    $("f-token").value = tok();
    if (tok()) say("已从本机读取到令牌（只存在你这台设备的浏览器里）", "");
    bind();
    bindSite();
    loadSite();
    loadPosts().then(function () { renderList(); }).catch(function (e) { say("文章列表加载失败：" + e.message, "err"); });
    fillForm(null, "");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();