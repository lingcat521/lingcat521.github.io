/* 列表渲染 + 全文搜索（标题 / 摘要 / 标签 / 正文），数据来自 /posts.json 与 /search.json */
(function () {
  "use strict";
  var ALL = [];
  var INDEX = null, INDEX_P = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function loadJSON(url, fallback) {
    return fetch(url + "?v=" + Date.now())
      .then(function (r) { return r.ok ? r.json() : fallback; })
      .catch(function () { return fallback; });
  }

  function loadIndex() {
    if (INDEX) return Promise.resolve(INDEX);
    if (!INDEX_P) {
      INDEX_P = loadJSON("/search.json", { posts: [] }).then(function (d) {
        INDEX = d.posts || [];
        return INDEX;
      });
    }
    return INDEX_P;
  }

  function card(p, snip, q) {
    var tags = (p.tags || []).join(" ");
    var hay = (p.title + " " + (p.summary || "") + " " + tags).toLowerCase();
    var title = esc(p.title);
    if (q) {
      var i = title.toLowerCase().indexOf(q.toLowerCase());
      if (i >= 0) {
        title = title.slice(0, i) + "<mark>" + title.slice(i, i + q.length) + "</mark>" + title.slice(i + q.length);
      }
    }
    var body = snip || (p.summary ? esc(p.summary) : "");
    return [
      "<li class=\"post-card\" data-search=\"" + esc(hay) + "\" data-tags=\"" + esc((p.tags || []).join(",")) + "\">",
      "<h3>" + (p.pinned ? "<span class=\"pinned-mark\" title=\"置顶\">📌 </span>" : "") +
        "<a href=\"/posts/" + esc(p.slug) + "/\">" + title + "</a></h3>",
      body ? "<p>" + body + "</p>" : "",
      "<div class=\"meta\"><span>" + esc(p.date) + "</span><span>·</span><span>约 " + (p.read || 1) + " 分钟</span>",
      (p.tags || []).map(function (t) { return "<span class=\"tag\">#" + esc(t) + "</span>"; }).join(""),
      "</div></li>"
    ].join("");
  }

  function byDate(a, b) {
    if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
    return (b.date || "").localeCompare(a.date || "");
  }

  function visible(posts) {
    return posts.filter(function (p) { return !p.private; });
  }

  function tagChips(posts, el) {
    if (!el) return;
    var counts = {};
    posts.forEach(function (p) { (p.tags || []).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; }); });
    el.innerHTML = Object.keys(counts).sort().map(function (t) {
      return "<a href=\"#\" class=\"chip\" data-filter=\"" + esc(t) + "\">#" + esc(t) + " <small>" + counts[t] + "</small></a>";
    }).join("");
  }

  /* 从正文里截取命中片段，命中词高亮 */
  function snippet(p, q) {
    if (!q || !p.text) return "";
    var i = p.text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return "";
    var start = Math.max(0, i - 34);
    var end = Math.min(p.text.length, i + q.length + 70);
    return (start > 0 ? "…" : "") + esc(p.text.slice(start, i)) +
      "<mark>" + esc(p.text.slice(i, i + q.length)) + "</mark>" +
      esc(p.text.slice(i + q.length, end)) + (end < p.text.length ? "…" : "");
  }

  function score(p, q) {
    var ql = q.toLowerCase(), s = 0;
    if ((p.title || "").toLowerCase().indexOf(ql) >= 0) s += 5;
    if ((p.tags || []).join(" ").toLowerCase().indexOf(ql) >= 0) s += 3;
    if ((p.summary || "").toLowerCase().indexOf(ql) >= 0) s += 2;
    if ((p.text || "").toLowerCase().indexOf(ql) >= 0) s += 1;
    return s;
  }

  var state = { q: "", tag: "" };

  function render() {
    var list = document.getElementById("post-list");
    var empty = document.getElementById("empty");
    if (!list) return;
    var posts = visible(ALL).slice();
    if (state.tag) posts = posts.filter(function (p) { return (p.tags || []).indexOf(state.tag) >= 0; });

    if (!state.q) {
      list.innerHTML = posts.map(function (p) { return card(p); }).join("");
      if (empty) empty.style.display = posts.length ? "none" : "";
      return;
    }

    /* 有关键词：等索引到位后按「标题/标签/摘要/正文」打分排序，并给出正文片段 */
    var q = state.q;
    loadIndex().then(function (idx) {
      var map = {};
      idx.forEach(function (p) { map[p.slug] = p; });
      var hits = posts.map(function (p) {
        var full = map[p.slug] || p;
        return { p: p, full: full, s: score(full, q) };
      }).filter(function (x) { return x.s > 0; })
        .sort(function (a, b) { return b.s - a.s || byDate(a.p, b.p); });
      list.innerHTML = hits.map(function (x) {
        return card(x.p, snippet(x.full, q), q);
      }).join("");
      if (empty) empty.style.display = hits.length ? "none" : "";
    });
  }

  function wire() {
    var search = document.getElementById("search");
    var chips = document.querySelectorAll("[data-filter]");
    var timer = null;
    if (search) {
      search.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          state.q = search.value.trim();
          render();
        }, 180);
      });
    }
    Array.prototype.forEach.call(chips, function (c) {
      c.addEventListener("click", function (ev) {
        ev.preventDefault();
        var t = c.getAttribute("data-filter");
        state.tag = (state.tag === t) ? "" : t;
        Array.prototype.forEach.call(chips, function (x) { x.classList.remove("chip-on"); });
        if (state.tag) c.classList.add("chip-on");
        render();
      });
    });
    var m = /[?&]tag=([^&]+)/.exec(location.search);
    if (m) {
      state.tag = decodeURIComponent(m[1]);
      Array.prototype.forEach.call(chips, function (x) {
        if (x.getAttribute("data-filter") === state.tag) x.classList.add("chip-on");
      });
    }
    var qm = /[?&]q=([^&]+)/.exec(location.search);
    if (qm && search) {
      search.value = decodeURIComponent(qm[1]);
      state.q = search.value.trim();
    }
  }

  function boot() {
    var list = document.getElementById("post-list");
    var arch = document.getElementById("archive-list");
    loadJSON("/posts.json", { posts: [] }).then(function (data) {
      ALL = (data.posts || []).slice().sort(byDate);
      var vis = visible(ALL);
      if (list) list.innerHTML = vis.map(function (p) { return card(p); }).join("");
      tagChips(vis, document.getElementById("tag-cloud"));
      if (arch) {
        var years = {};
        vis.forEach(function (p) { var y = (p.date || "").slice(0, 4); (years[y] = years[y] || []).push(p); });
        arch.innerHTML = Object.keys(years).sort().reverse().map(function (y) {
          return "<h2>" + y + " <small class=\"meta\">(" + years[y].length + " 篇)</small></h2>" +
            "<ul class=\"post-list\">" + years[y].map(function (p) { return card(p); }).join("") + "</ul>";
        }).join("");
      }
      wire();
      if (state.q) render();
    });
  }

  window.FlowerieSite = { card: card, byDate: byDate };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();