/* 铃樱の小站 —— 零依赖前端脚本（无框架、无 CDN） */
(function () {
  "use strict";
  var root = document.documentElement;

  /* ---------- 主题：跟随系统 / 浅色 / 深色 ---------- */
  var order = ["auto", "light", "dark"];
  var label = { auto: "🌗", light: "☀️", dark: "🌙" };
  var btn = document.getElementById("theme-toggle");
  function apply(t) {
    root.setAttribute("data-theme", t);
    if (btn) btn.textContent = label[t];
    try { localStorage.setItem("theme", t); } catch (e) {}
  }
  if (btn) {
    btn.textContent = label[root.getAttribute("data-theme") || "auto"] || "🌗";
    btn.addEventListener("click", function () {
      var cur = root.getAttribute("data-theme") || "auto";
      apply(order[(order.indexOf(cur) + 1) % order.length]);
    });
  }

  /* ---------- 首页打字机 ---------- */
  var typed = document.getElementById("typed");
  if (typed) {
    var lines = (typed.getAttribute("data-lines") || "").split("|").filter(Boolean);
    var li = 0, ci = 0, del = false;
    var textEl = document.createElement("span");
    var cursor = document.createElement("span");
    cursor.className = "cursor";
    cursor.textContent = "|";
    typed.textContent = "";
    typed.appendChild(textEl);
    typed.appendChild(cursor);
    (function tick() {
      var cur = lines[li] || "";
      ci += del ? -1 : 1;
      textEl.textContent = cur.slice(0, ci);
      var wait = del ? 40 : 110;
      if (!del && ci === cur.length) { wait = 1600; del = true; }
      else if (del && ci === 0) { del = false; li = (li + 1) % lines.length; wait = 320; }
      setTimeout(tick, wait);
    })();
  }

  /* ---------- 列表搜索 + 标签筛选 ---------- */
  var search = document.getElementById("search");
  var list = document.getElementById("post-list");
  var chips = document.querySelectorAll("[data-filter]");
  var activeTag = "";
  function applyFilter() {
    if (!list) return;
    var q = (search && search.value || "").trim().toLowerCase();
    var shown = 0;
    Array.prototype.forEach.call(list.children, function (item) {
      var hay = (item.getAttribute("data-search") || "").toLowerCase();
      var tags = (item.getAttribute("data-tags") || "").split(",");
      var okQ = !q || hay.indexOf(q) >= 0;
      var okT = !activeTag || tags.indexOf(activeTag) >= 0;
      var ok = okQ && okT;
      item.style.display = ok ? "" : "none";
      if (ok) shown++;
    });
    var empty = document.getElementById("empty");
    if (empty) empty.style.display = shown ? "none" : "";
  }
  if (search) search.addEventListener("input", applyFilter);
  Array.prototype.forEach.call(chips, function (c) {
    c.addEventListener("click", function (ev) {
      ev.preventDefault();
      var t = c.getAttribute("data-filter");
      activeTag = (activeTag === t) ? "" : t;
      Array.prototype.forEach.call(chips, function (x) { x.classList.remove("chip-on"); });
      if (activeTag) c.classList.add("chip-on");
      applyFilter();
    });
  });

  /* ---------- 阅读进度 + 回到顶部 ---------- */
  var bar = document.getElementById("progress");
  var top = document.getElementById("to-top");
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    if (bar) bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
    if (top) top.classList.toggle("show", h.scrollTop > 400);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (top) top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

  /* ---------- 自动目录 + 滚动高亮 ---------- */
  var content = document.querySelector(".content");
  var tocBox = document.getElementById("toc");
  if (content && tocBox) {
    var hs = content.querySelectorAll("h2");
    if (hs.length < 2) { tocBox.style.display = "none"; }
    else {
      var ol = document.createElement("ol");
      Array.prototype.forEach.call(hs, function (h, i) {
        if (!h.id) h.id = "h-" + i;
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "#" + h.id;
        a.textContent = h.textContent;
        li.appendChild(a);
        ol.appendChild(li);
      });
      tocBox.appendChild(ol);
      var links = tocBox.querySelectorAll("a");
      function spy() {
        var best = null;
        Array.prototype.forEach.call(links, function (a) {
          var t = document.getElementById(a.getAttribute("href").slice(1));
          if (t && t.getBoundingClientRect().top <= 120) best = a;
        });
        Array.prototype.forEach.call(links, function (a) { a.classList.toggle("active", a === best); });
      }
      window.addEventListener("scroll", spy, { passive: true });
      spy();
    }
  }

  /* ---------- 代码块复制按钮 ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".content pre"), function (pre) {
    var b = document.createElement("button");
    b.className = "copy-btn";
    b.type = "button";
    b.textContent = "复制";
    b.addEventListener("click", function () {
      var code = pre.querySelector("code");
      var text = code ? code.innerText : pre.innerText;
      var done = function () { b.textContent = "已复制"; setTimeout(function () { b.textContent = "复制"; }, 1200); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done);
      else done();
    });
    pre.appendChild(b);
  });
})();