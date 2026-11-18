/* 极简 Markdown 渲染（零依赖）——标题/列表/引用/代码块/链接/粗斜体/分割线/表格 */
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

  /* 把 |a|b| 拆成单元格（支持转义 \|） */
  function splitCells(row) {
    var s = row.trim();
    if (s.charAt(0) === "|") s = s.slice(1);
    if (s.slice(-1) === "|") s = s.slice(0, -1);
    var cells = [], buf = "", esc = false;
    for (var k = 0; k < s.length; k++) {
      var ch = s.charAt(k);
      if (esc) { buf += ch; esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === "|") { cells.push(buf.trim()); buf = ""; continue; }
      buf += ch;
    }
    cells.push(buf.trim());
    return cells;
  }

  /* 表格渲染：第一行表头，第二行对齐标记，其余为数据行 */
  function renderTable(rows) {
    if (rows.length < 2) return "";
    var header = splitCells(rows[0]);
    var aligns = splitCells(rows[1]).map(function (c) {
      var l = c.charAt(0) === ":", r = c.charAt(c.length - 1) === ":";
      if (l && r) return "center";
      if (r) return "right";
      return "left";
    });
    var body = rows.slice(2);
    var ncol = header.length;

    function cell(tag, text, idx) {
      var al = aligns[idx] || "left";
      var style = al !== "left" ? ' style="text-align:' + al + '"' : "";
      return "<" + tag + style + ">" + inline(text) + "</" + tag + ">";
    }

    var h = "<div class=\"table-wrap\"><table><thead><tr>";
    for (var c = 0; c < ncol; c++) h += cell("th", header[c] || "", c);
    h += "</tr></thead><tbody>";
    for (var r = 0; r < body.length; r++) {
      var cells = splitCells(body[r]);
      h += "<tr>";
      for (var c2 = 0; c2 < ncol; c2++) h += cell("td", cells[c2] || "", c2);
      h += "</tr>";
    }
    h += "</tbody></table></div>";
    return h;
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

      /* 表格：行首 | 且下一行是分隔行（| :--- | ---: |） */
      if (t.charAt(0) === "|" && i + 1 < lines.length &&
          /^\|?[\s:-]*-[\s:-]*\|/.test(lines[i + 1].trim()) &&
          lines[i + 1].trim().indexOf("-") !== -1) {
        flushPara(); closeList();
        var tbl = [];
        while (i < lines.length && lines[i].trim().charAt(0) === "|") {
          tbl.push(lines[i].trim()); i++;
        }
        html.push(renderTable(tbl));
        continue;
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

  /* 阅读时长：中文 300 字/分钟、英文 180 词/分钟，向上取整（1.1 分钟记作 2 分钟） */
  function readMinutes(src) {
    var text = plain(src);
    var cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    var words = text.replace(/[\u4e00-\u9fa5]/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(cjk / 300 + words / 180));
  }

  /* 正文字数（去掉 Markdown 记号后的字符数），用于在时长旁标注 */
  function charCount(src) {
    return plain(src).replace(/\s+/g, "").length;
  }

  window.FlowerieMD = { render: render, plain: plain, readMinutes: readMinutes, charCount: charCount };
})();