/* 列表渲染：从 /posts.json 读数据，渲染首页 / 归档 / 标签三处的文章列表 */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function card(p) {
    var tags = (p.tags || []).join(" ");
    var hay = (p.title + " " + (p.summary || "") + " " + tags).toLowerCase();
    return [
      "<li class=\"post-card\" data-search=\"" + esc(hay) + "\" data-tags=\"" + esc((p.tags || []).join(",")) + "\">",
      "<h3><a href=\"/posts/" + esc(p.slug) + "/\">" + esc(p.title) + "</a></h3>",
      p.summary ? "<p>" + esc(p.summary) + "</p>" : "",
      "<div class=\"meta\"><span>" + esc(p.date) + "</span><span>·</span><span>约 " + (p.read || 1) + " 分钟</span>",
      (p.tags || []).map(function (t) { return "<span class=\"tag\">#" + esc(t) + "</span>"; }).join(""),
      "</div></li>"
    ].join("");
  }

  function byDate(a, b) { return (b.date || "").localeCompare(a.date || ""); }

  function renderInto(el, posts) {
    if (!el) return;
    el.innerHTML = posts.map(card).join("");
  }

  function tagChips(posts, el) {
    if (!el) return;
    var counts = {};
    posts.forEach(function (p) { (p.tags || []).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; }); });
    el.innerHTML = Object.keys(counts).sort().map(function (t) {
      return "<a href=\"#\" class=\"chip\" data-filter=\"" + esc(t) + "\">#" + esc(t) + " <small>" + counts[t] + "</small></a>";
    }).join("");
  }

  /* 搜索 + 标签筛选（渲染后统一绑定） */
  function wireFilter() {
    var search = document.getElementById("search");
    var list = document.getElementById("post-list");
    var chips = document.querySelectorAll("[data-filter]");
    var activeTag = "";
    function apply() {
      if (!list) return;
      var q = (search && search.value || "").trim().toLowerCase();
      var shown = 0;
      Array.prototype.forEach.call(list.children, function (item) {
        var hay = (item.getAttribute("data-search") || "");
        var tags = (item.getAttribute("data-tags") || "").split(",");
        var ok = (!q || hay.indexOf(q) >= 0) && (!activeTag || tags.indexOf(activeTag) >= 0);
        item.style.display = ok ? "" : "none";
        if (ok) shown++;
      });
      var empty = document.getElementById("empty");
      if (empty) empty.style.display = shown ? "none" : "";
    }
    if (search) search.addEventListener("input", apply);
    Array.prototype.forEach.call(chips, function (c) {
      c.addEventListener("click", function (ev) {
        ev.preventDefault();
        var t = c.getAttribute("data-filter");
        activeTag = (activeTag === t) ? "" : t;
        Array.prototype.forEach.call(chips, function (x) { x.classList.remove("chip-on"); });
        if (activeTag) c.classList.add("chip-on");
        apply();
      });
    });
    /* 支持从 URL 带标签进来，例如 /tags/?tag=建站 */
    var m = /[?&]tag=([^&]+)/.exec(location.search);
    if (m) {
      activeTag = decodeURIComponent(m[1]);
      Array.prototype.forEach.call(chips, function (x) {
        if (x.getAttribute("data-filter") === activeTag) x.classList.add("chip-on");
      });
      apply();
    }
  }

  function boot() {
    fetch("/posts.json?v=" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var posts = (data.posts || []).slice().sort(byDate);
        renderInto(document.getElementById("post-list"), posts);
        tagChips(posts, document.getElementById("tag-cloud"));
        /* 归档页：按年份分组 */
        var arch = document.getElementById("archive-list");
        if (arch) {
          var years = {};
          posts.forEach(function (p) { var y = (p.date || "").slice(0, 4); (years[y] = years[y] || []).push(p); });
          arch.innerHTML = Object.keys(years).sort().reverse().map(function (y) {
            return "<h2>" + y + " <small class=\"meta\">(" + years[y].length + " 篇)</small></h2>" +
              "<ul class=\"post-list\">" + years[y].map(card).join("") + "</ul>";
          }).join("");
        }
        wireFilter();
        document.documentElement.setAttribute("data-loaded", "1");
      })
      .catch(function (e) {
        var el = document.getElementById("post-list");
        if (el) el.innerHTML = "<li class=\"empty\">文章列表加载失败：" + esc(e.message) + "（可以刷新重试，或直接看 <a href=\"/archive/\">归档</a>）</li>";
      });
  }

  window.FlowerieSite = { card: card, byDate: byDate };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();