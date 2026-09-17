/* 极简 Markdown 渲染（零依赖）——够用就好：标题/列表/引用/代码块/链接/粗斜体/分割线 */
(function () {
  "use strict";

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function inline(s) {
    var out = esc(s);
    out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (m, alt, src) {
      return "<img src=\"" + src + "\" alt=\"" + alt + "\" loading=\"lazy\">";
    });
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (m, text, href) {
      var ext = /^https?:/.test(href) ? " target=\"_blank\" rel=\"noopener\"" : "";
      return "<a href=\"" + href + "\"" + ext + ">" + text + "</a>";
    });
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    return out;
  }

  function slugId(t) {
    return String(t).replace(/[^\w\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "") || "h";
  }

  function render(src) {
    var lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
    var html = [];
    var i = 0;
    var list = null;   /* "ul" | "ol" | null */
    var para = [];

    function flushPara() {
      if (para.length) { html.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; }
    }
    function closeList() {
      if (list) { html.push("</" + list + ">"); list = null; }
    }

    while (i < lines.length) {
      var line = lines[i];
      var t = line.trim();

      /* 代码块 */
      if (t.indexOf("```") === 0) {
        flushPara(); closeList();
        var buf = [];
        i++;
        while (i < lines.length && lines[i].trim().indexOf("```") !== 0) { buf.push(lines[i]); i++; }
        i++;
        html.push("<pre><code>" + esc(buf.join("\n")) + "</code></pre>");
        continue;
      }

      /* 空行 */
      if (!t) { flushPara(); closeList(); i++; continue; }

      /* 分割线 */
      if (t === "---" || t === "***") { flushPara(); closeList(); html.push("<hr>"); i++; continue; }

      /* 标题 */
      var h = /^(#{1,6})\s+(.*)$/.exec(t);
      if (h) {
        flushPara(); closeList();
        var lvl = h[1].length;
        var text = h[2];
        if (lvl === 1) { html.push("<h2 id=\"" + slugId(text) + "\">" + inline(text) + "</h2>"); }
        else if (lvl === 2) { html.push("<h2 id=\"" + slugId(text) + "\">" + inline(text) + "</h2>"); }
        else { html.push("<h3 id=\"" + slugId(text) + "\">" + inline(text) + "</h3>"); }
        i++; continue;
      }

      /* 引用 */
      if (t.indexOf("> ") === 0) {
        flushPara(); closeList();
        var q = [];
        while (i < lines.length && lines[i].trim().indexOf("> ") === 0) { q.push(lines[i].trim().slice(2)); i++; }
        html.push("<blockquote><p>" + inline(q.join(" ")) + "</p></blockquote>");
        continue;
      }

      /* 无序列表 */
      if (/^[-*]\s+/.test(t)) {
        flushPara();
        if (list !== "ul") { closeList(); html.push("<ul>"); list = "ul"; }
        html.push("<li>" + inline(t.replace(/^[-*]\s+/, "")) + "</li>");
        i++; continue;
      }

      /* 有序列表 */
      if (/^\d+[.)]\s+/.test(t)) {
        flushPara();
        if (list !== "ol") { closeList(); html.push("<ol>"); list = "ol"; }
        html.push("<li>" + inline(t.replace(/^\d+[.)]\s+/, "")) + "</li>");
        i++; continue;
      }

      /* 普通段落 */
      closeList();
      para.push(t);
      i++;
    }
    flushPara(); closeList();
    return html.join("\n");
  }

  function plain(src) {
    return String(src || "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[#>*`_\-]/g, " ")
      .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  function readMinutes(src) {
    var text = plain(src);
    var cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    var words = text.replace(/[\u4e00-\u9fa5]/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(cjk / 350 + words / 200));
  }

  window.FlowerieMD = { render: render, plain: plain, readMinutes: readMinutes };
})();