# 铃酱の小站

> 一些奇奇怪怪的项目和日常 · <https://lingcat521.github.io/>

## 特点

- **零依赖**：不引用任何 CDN / 字体 / 统计服务，断网也能打开
- **零构建**：没有 npm、没有生成器，改完 push 就上线
- **渐进增强**：JS 只负责主题切换、搜索、目录、进度条；关掉 JS 文章照样能读
- **站内后台**：在网页上直接写、发、改、删文章（浏览器直连 GitHub API，无需服务器）
- **文章配图**：编辑器里给当前文章传图（自动插到光标处）/ 从图片池插入 / 删图，删除前会列出还有哪些文章在引用

## 目录结构

```text
├── index.html              首页（文章列表 + 搜索 + 标签筛选）
├── archive/  tags/  about/ 归档 / 标签 / 关于
├── admin/                  ⭐ 站内管理后台
├── posts/<slug>/
│   ├── post.md             正文源文件（Markdown）—— 后台编辑的就是它
│   └── index.html          生成的文章页（不要手改，会被覆盖）
├── posts.json              文章元数据（列表/归档/RSS 都读它）
├── assets/                 style.css / app.js / site.js / md.js / admin.js …
├── tools/build.js          本地批量重建（node tools/build.js）
└── atom.xml                RSS
```

## 怎么发文章（推荐：站内后台）

打开 <https://lingcat521.github.io/admin/>，三步：

1. **填令牌**：点「保存并校验」。令牌只存在**你这台设备的浏览器**里（localStorage），
   页面直接请求 `api.github.com`，不经过任何第三方服务器。
2. **写文章**：标题 / 网址片段 / 日期 / 标签 / 摘要 / 正文（Markdown），右侧可预览。
3. **保存并发布**：一次 commit 同时写 `post.md`、`index.html`、`posts.json`、`atom.xml`，
   约 1 分钟后线上生效。列表里的 ✏️ 编辑、🗑️ 删除同理。

### 给文章配图（编辑器里的「🖼 本文图片」）

1. 在「② 文章列表」点开要配图的那篇（或「＋ 新建」）；
2. 在正文框正下方的「🖼 本文图片」里点「给本文传图…」选图（自动压缩，参数沿用 ⑤）——
   上传完成后**引用会自动插到正文光标处**；也可以从下面的**图片池**点「插入本文」；
3. 图片放好后点「保存并发布」，正文与图片在同一次提交里生效。

展开「本文引用」会列出当前正文用到的图片（从 Markdown 里自动识别），每张可以：

- **复制 Markdown**：粘到别处；
- **从本文移除**：只删正文里的那一行引用，图片文件还在池子里；
- **删除文件**：真删仓库里的图片 —— 删除前会列出**还有哪些文章在引用它**，避免误删变破图。

> 图片都存在 `assets/uploads/`，文件名形如 `20260925-120000-名字.jpg`（时间戳前缀防重名）。
> 仓库有 1GB 软上限，所以上传时自动压缩（默认最长边 1600px、质量 0.82，可在 ⑤ 里改）。

### 令牌怎么建（建议用 Fine-grained token）

GitHub → Settings → Developer settings → **Personal access tokens → Fine-grained tokens** → Generate new token：

- **Repository access**：`Only select repositories` → 只勾 `lingcat521.github.io`
- **Permissions → Repository permissions → Contents**：`Read and write`（只给这一项就够）
- **Expiration**：按需设置（建议 90 天，到期重新生成）

> ⚠️ 安全须知：
> - 令牌等价于「这个仓库的写权限」，**不要**发到聊天里、不要提交进仓库、不要在公共电脑上保存；
> - 后台页面本身是公开的，但没有令牌的人打开它什么也做不了；
> - 公共设备上用完后点「清除」按钮，或直接清浏览器数据；
> - 一旦怀疑泄露，立刻去 GitHub 撤销该令牌（`Revoke`）。

## 怎么发文章（备选：手动）

1. 新建 `posts/<slug>/post.md` 写正文（Markdown），
2. 在 `posts.json` 的 `posts` 数组里加一条元数据，
3. 跑 `node tools/build.js` 生成文章页和 RSS，然后提交推送。

## 本地预览

```bash
python3 -m http.server 8000
# 浏览器打开 http://127.0.0.1:8000
```

## 部署

仓库 Settings → Pages → Source 选 `Deploy from a branch`，分支 `main`、目录 `/ (root)`。
推送到 `main` 即自动发布，一般一两分钟生效。
