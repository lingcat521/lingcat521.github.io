/* 文章页模板：后台生成静态文章页时复用（保证和站点风格一致） */
(function () {
  "use strict";
  var SITE = { title: "铃樱の小站", author: "铃樱", gh: "https://github.com/lingcat521" };
  var V = "6f1b3bd9";   /* 资源版本号，后台/构建脚本会注入最新的 */

  function head(title, desc, opts) {
    opts = opts || {};
    var html = ["<!doctype html>",
      "<html lang=\"zh-CN\" data-theme=\"auto\"" + (opts.slug ? " data-post-slug=\"" + opts.slug + "\"" : "") + ">",
      "<head>",
      "<meta charset=\"utf-8\">",
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">",
      "<title>" + title + "</title>",
      "<meta name=\"description\" content=\"" + (desc || "") + "\">"];
    if (opts.noindex) html.push("<meta name=\"robots\" content=\"noindex,nofollow\">");
    html.push(
      "<meta property=\"og:title\" content=\"" + title + "\">",
      "<meta property=\"og:description\" content=\"" + (desc || "") + "\">",
      "<meta property=\"og:type\" content=\"article\">",
      "<link rel=\"icon\" href=\"/assets/favicon.svg\" type=\"image/svg+xml\">",
      "<link rel=\"stylesheet\" href=\"/assets/style.css?v=" + V + "\">",
      "<link rel=\"alternate\" type=\"application/atom+xml\" title=\"" + SITE.title + "\" href=\"/atom.xml\">",
      "<script>(function(){try{var t=localStorage.getItem(\"theme\")||\"auto\";document.documentElement.setAttribute(\"data-theme\",t);}catch(e){}})();</script>",
      "</head>");
    return html.join("\n");
  }

  function shell(main, extraScript) {
    return [
      "<body>",
      "<div id=\"progress\"></div>",
      "<header class=\"site-header\"><div class=\"wrap header-inner\">",
      "<a class=\"brand\" href=\"/\"><span class=\"brand-mark\">❀</span> " + SITE.title + "</a>",
      "<nav class=\"nav\"><a href=\"/\">首页</a><a href=\"/archive/\">归档</a><a href=\"/tags/\">标签</a><a href=\"/about/\">关于</a>",
      "<a href=\"" + SITE.gh + "\" target=\"_blank\" rel=\"noopener\">GitHub</a></nav>",
      "<button id=\"theme-toggle\" class=\"icon-btn\" type=\"button\" aria-label=\"切换主题\" title=\"切换主题\">🌗</button>",
      "</div></header>",
      "<main class=\"wrap fade-in\">",
      main,
      "</main>",
      "<footer class=\"site-footer\"><div class=\"wrap\"><div class=\"footer-stats\" id=\"footer-stats\"></div>© 2026 " + SITE.author + " · <a href=\"/atom.xml\">RSS</a> · ",
      "<a href=\"" + SITE.gh + "\" target=\"_blank\" rel=\"noopener\">GitHub</a> · 托管于 GitHub Pages · 手写 HTML/CSS/JS，零依赖</div></footer>",
      "<button id=\"to-top\" type=\"button\" aria-label=\"回到顶部\">↑</button>",
      "<script src=\"/assets/app.js?v=" + V + "\" defer></script>",
      "<script src=\"/assets/extras.js?v=" + V + "\" defer></script>",
      (extraScript || ""),
      "</body>",
      "</html>",
      ""
    ].join("\n");
  }

  /* meta: {title, slug, date, tags, read, summary, pinned, private} */
  function postPage(meta, bodyHtml, prev, next) {
    var tagHtml = (meta.tags || []).map(function (t) {
      return "<a class=\"tag\" href=\"/tags/?tag=" + encodeURIComponent(t) + "\">#" + t + "</a>";
    }).join("");
    var badges = "";
    if (meta.pinned) badges += "<span class=\"badge\">📌 置顶</span>";
    if (meta.private) badges += "<span class=\"badge badge-private\">🔒 私密</span>";
    var nav = [
      "<div class=\"post-nav\">",
      prev ? "<a href=\"/posts/" + prev.slug + "/\">← " + prev.title + "</a>" : "<span></span>",
      next ? "<a href=\"/posts/" + next.slug + "/\">" + next.title + " →</a>" : "<span></span>",
      "</div>"
    ].join("");
    var main = [
      "<article class=\"post\">",
      "<header>",
      badges,
      "<h1>" + meta.title + "</h1>",
      "<div class=\"meta\"><span>" + meta.date + "</span><span>·</span><span>约 " + (meta.read || 1) + " 分钟</span>",
      tagHtml,
      "</div>",
      "<div class=\"post-extras\" id=\"post-extras\"></div>",
      "</header>",
      "<div class=\"toc\" id=\"toc\"><strong>目录</strong></div>",
      "<div class=\"content\">",
      bodyHtml,
      "</div>",
      "</article>",
      "<div id=\"post-below\"></div>",
      nav
    ].join("\n");
    return head(meta.title + " · " + SITE.title, meta.summary || "", { slug: meta.slug, noindex: !!meta.private }) + "\n" + shell(main);
  }

  window.FloweriePost = { postPage: postPage, SITE: SITE };
})();