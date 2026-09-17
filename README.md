# 铃樱の小站

> 一些奇奇怪怪的项目和日常

个人博客，托管在 GitHub Pages：<https://lingcat521.github.io/>

## 特点

- **零依赖**：不引用任何 CDN / 字体 / 统计服务，断网也能打开
- **零构建**：没有 npm、没有生成器，改完 push 就上线
- **渐进增强**：JS 只负责主题切换、搜索、目录、进度条；关掉 JS 文章照样能读

## 目录结构

```text
├── index.html              首页（文章列表 + 搜索 + 标签筛选）
├── archive/index.html      归档
├── tags/index.html         标签
├── about/index.html        关于
├── posts/<slug>/index.html 每篇文章一个文件夹
├── assets/                 style.css / app.js / avatar.png / favicon.svg
├── atom.xml                RSS 订阅
└── 404.html
```

## 怎么加一篇新文章

1. 复制 `posts/hello-world/` 整个文件夹，重命名为新文章的 slug（英文，会成为网址的一部分）
2. 改里面的标题、日期、正文
3. 在 `index.html`、`archive/index.html`、`tags/index.html` 的文章列表里加一张卡片（复制一段 `<li class="post-card">` 改内容）
4. `git add . && git commit -m "post: 新文章" && git push`

## 本地预览

```bash
python3 -m http.server 8000
# 然后浏览器打开 http://127.0.0.1:8000
```

## 部署

仓库 Settings → Pages → Source 选 `Deploy from a branch`，分支 `main`、目录 `/ (root)`。
推送到 `main` 即自动发布，一般一两分钟生效。
