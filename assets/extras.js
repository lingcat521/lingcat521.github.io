/* 文章页扩展：阅读量 / 设备 / 转发 / 点赞 / 评论（全部由 site.json 配置驱动，未配置则自动隐藏） */
(function () {
  "use strict";
  var DEFAULTS = {
    appearance: { cardAlpha: 0.5, bgImageOpacity: 0.5, cardBlur: "12px" },
    views: { provider: "none", endpoint: "" },
    comments: { provider: "none" },
    features: { device: true, share: true, like: true }
  };
  var cfg = DEFAULTS;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function localGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function localSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---------- 外观变量（后台可调）---------- */
  function applyAppearance() {
    var a = cfg.appearance || {};
    var r = document.documentElement.style;
    if (typeof a.cardAlpha === "number") r.setProperty("--card-alpha", String(a.cardAlpha));
    if (typeof a.bgImageOpacity === "number") r.setProperty("--bg-image-opacity-set", String(a.bgImageOpacity));
    if (a.cardBlur) r.setProperty("--card-blur", a.cardBlur);
  }

  /* ---------- 设备识别 ---------- */
  function detectDevice() {
    var ua = navigator.userAgent || "";
    var os = "未知系统";
    if (/Android/i.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/i.test(ua)) os = /iPad/i.test(ua) ? "iPadOS" : "iOS";
    else if (/Windows/i.test(ua)) os = "Windows";
    else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
    else if (/Linux/i.test(ua)) os = "Linux";
    var br = "浏览器";
    if (/Edg\//i.test(ua)) br = "Edge";
    else if (/OPR\/|Opera/i.test(ua)) br = "Opera";
    else if (/Firefox\//i.test(ua)) br = "Firefox";
    else if (/Chrome\//i.test(ua)) br = "Chrome";
    else if (/Safari\//i.test(ua)) br = "Safari";
    var kind = /Mobi|Android|iPhone/i.test(ua) ? "手机" : (/iPad|Tablet/i.test(ua) ? "平板" : "桌面设备");
    return { os: os, browser: br, kind: kind };
  }

  function mountDevice(box) {
    var d = detectDevice();
    var chip = el("span", "chip chip-plain", "🖥️ 你正在用 " + d.os + " · " + d.browser + "（" + d.kind + "）阅读");
    box.appendChild(chip);
  }

  /* ---------- 阅读量 ---------- */
  function mountViews(box, slug) {
    var v = cfg.views || {};
    var wrap = el("span", "chip chip-plain");
    wrap.appendChild(document.createTextNode("👀 阅读 "));
    var num = el("span", null, "…");
    wrap.appendChild(num);
    box.appendChild(wrap);
    if (v.provider === "busuanzi") {
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js";
      s.onerror = function () { wrap.style.display = "none"; };
      document.body.appendChild(s);
      var tries = 0;
      var t = setInterval(function () {
        tries++;
        var raw = (window.busuanzi && window.busuanzi.page_pv) || null;
        if (!raw) {
          var probe = document.getElementById("busuanzi_value_page_pv");
          if (probe && probe.textContent) raw = probe.textContent;
        }
        if (raw) { num.textContent = String(raw); clearInterval(t); }
        else if (tries > 20) { wrap.style.display = "none"; clearInterval(t); }
      }, 400);
      var hidden = el("span", null, " ");
      hidden.id = "busuanzi_container_page_pv";
      hidden.style.display = "none";
      var inner = el("span", null, "");
      inner.id = "busuanzi_value_page_pv";
      hidden.appendChild(inner);
      document.body.appendChild(hidden);
    } else if (v.provider === "custom" && v.endpoint) {
      var key = "views:" + (slug || location.pathname);
      fetch(v.endpoint + (v.endpoint.indexOf("?") >= 0 ? "&" : "?") + "path=" + encodeURIComponent(location.pathname), { method: "POST" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { num.textContent = d && (d.count != null) ? String(d.count) : "–"; })
        .catch(function () { wrap.style.display = "none"; });
      void key;
    } else {
      wrap.style.display = "none";
    }
  }

  /* ---------- 转发 ---------- */
  function mountShare(box, meta) {
    var url = location.href;
    var title = meta.title || document.title;
    var group = el("div", "share-row");
    group.appendChild(el("span", "share-label", "分享："));
    function btn(text, href, cls) {
      var a = href ? el("a", "chip" + (cls ? " " + cls : ""), text) : el("button", "chip" + (cls ? " " + cls : ""), text);
      if (href) { a.href = href; a.target = "_blank"; a.rel = "noopener"; }
      else a.type = "button";
      group.appendChild(a);
      return a;
    }
    var copy = btn("复制链接");
    copy.addEventListener("click", function () {
      var done = function () { copy.textContent = "已复制 ✓"; setTimeout(function () { copy.textContent = "复制链接"; }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done);
      else { window.prompt("复制这个链接：", url); }
    });
    btn("QQ", "https://connect.qq.com/widget/shareqq/index.html?url=" + encodeURIComponent(url) + "&title=" + encodeURIComponent(title));
    btn("微博", "https://service.weibo.com/share/share.php?url=" + encodeURIComponent(url) + "&title=" + encodeURIComponent(title));
    btn("X", "https://twitter.com/intent/tweet?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(title));
    if (navigator.share) {
      var sys = btn("系统分享");
      sys.addEventListener("click", function () { navigator.share({ title: title, url: url }).catch(function () {}); });
    }
    box.appendChild(group);
  }

  /* ---------- 点赞（giscus 未配置时退化为「本机点赞」）---------- */
  function mountLike(box, slug) {
    var c = cfg.comments || {};
    if (c.provider === "giscus") return;   /* 有 giscus 时，点赞用讨论区 reaction */
    var key = "liked:" + slug;
    var countKey = "likecount:" + slug;
    var n = parseInt(localGet(countKey) || "0", 10);
    var liked = localGet(key) === "1";
    var b = el("button", "chip like-btn" + (liked ? " liked" : ""), "❤️ " + n);
    b.type = "button";
    b.title = "未配置评论服务，点赞只记录在本机浏览器";
    b.addEventListener("click", function () {
      liked = !liked;
      n += liked ? 1 : -1;
      if (n < 0) n = 0;
      localSet(key, liked ? "1" : "0");
      localSet(countKey, String(n));
      b.textContent = "❤️ " + n;
      b.classList.toggle("liked", liked);
    });
    box.appendChild(b);
  }

  /* ---------- 评论（giscus，基于 GitHub Discussions）---------- */
  function mountComments(box) {
    var c = cfg.comments || {};
    if (c.provider !== "giscus" || !c.repo || !c.repoId) return;
    var host = el("section", "comments");
    host.appendChild(el("h2", null, "评论"));
    var hint = el("p", "hint", "评论由 GitHub Discussions 提供：用 GitHub 账号登录后即可评论、回复、点赞（❤️ 就是点赞），作者可删任意评论，评论者本人可删自己的。");
    host.appendChild(hint);
    var mount = el("div", "giscus-host");
    host.appendChild(mount);
    box.appendChild(host);
    var s = document.createElement("script");
    s.src = "https://giscus.app/client.js";
    s.async = true;
    s.crossOrigin = "anonymous";
    var attrs = {
      "data-repo": c.repo,
      "data-repo-id": c.repoId,
      "data-category": c.category || "Announcements",
      "data-category-id": c.categoryId || "",
      "data-mapping": c.mapping || "pathname",
      "data-strict": "0",
      "data-reactions-enabled": c.reactions === false ? "0" : "1",
      "data-emit-metadata": "0",
      "data-input-position": c.inputPosition || "top",
      "data-theme": document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light",
      "data-lang": "zh-CN",
      "data-loading": "lazy"
    };
    Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); });
    mount.appendChild(s);
  }

  function boot() {
    var slug = document.documentElement.getAttribute("data-post-slug") || "";
    var meta = { title: (document.querySelector("article.post h1") || {}).textContent || document.title };
    fetch("/site.json?v=" + Date.now())
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (d) {
        if (d) {
          cfg = {
            appearance: d.appearance || DEFAULTS.appearance,
            views: d.views || DEFAULTS.views,
            comments: d.comments || DEFAULTS.comments,
            features: d.features || DEFAULTS.features
          };
        }
        applyAppearance();
        var box = $("post-extras");
        if (box) {
          var f = cfg.features || {};
          if (f.device !== false) mountDevice(box);
          mountViews(box, slug);
          if (f.like !== false) mountLike(box, slug);
          if (f.share !== false) mountShare(box, meta);
        }
        var cbox = $("post-below");
        if (cbox) mountComments(cbox);
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();