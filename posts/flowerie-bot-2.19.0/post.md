# 🌸 花璃 v2.19.x 更新公告

承接 v2.18.1——这轮跨度有点大，一口气三个小版本：**插件从「能说话」变成「能干活」**，
控制台也跟着换了一遍皮，最后还踩了两个 Android 专属的坑。

---

## 🧩 一、插件 WebUI SDK：插件不用写 HTML 了

以前插件想有自己的管理页，得自己拼 HTML + CSS，还要跟着控制台主题改。

现在只声明**内容**，宿主负责渲染、跟随主题、校验表单、显示字段错误：

```python
from flowerie_sdk import webui

def webui_render(page, context):
    return webui.page(
        webui.text("日报设置", "status"),
        form=webui.form("save", [
            webui.field("limit", "每日报告上限", "integer", required=True),
            webui.field("enabled", "启用日报", "boolean"),
        ]),
    )
```

五种语言同一套结构：

| SDK | 页面构造入口 |
| :--- | :--- |
| Python | `webui.page(*blocks, form=...)` |
| TypeScript | `webuiView.page(blocks, form)` |
| Go | `flowerie.WebUIPage(form, blocks...)` |
| Rust | `webui_view::page(blocks, Some(form))` |
| Java | `FloweriePlugin.WebUIView.page(blocks, form)` |

组件：文字 / 状态 / 日志 / 表格（1–12 列 × 500 行，分页 1–50）。
表单：每页 1 个，1–32 字段，类型 `text` / `textarea` / `integer` / `boolean` / `select`。

**所有展示值由宿主转义**——我拿 `<script>alert(1)</script><img src=x onerror=alert(2)>`
实测过，输出是 `&lt;script&gt;...`，属性引号也转了。页面照样零 JavaScript 能操作。

---

## 🔌 二、插件平台 API：25 个 action

插件以前只能收发消息，现在能调宿主能力了，**全部走权限闸门**（manifest 声明 + 管理员批准）：

| 类别 | action |
| :--- | :--- |
| 画像 | `profile_get` / `profile_set_section` / `profile_delete` |
| 搜索 | `web_search` |
| 知识 | `knowledge_list` |
| 人格/昵称 | `persona_resolve` / `nickname_resolve` |
| QQ空间 | `qzone_history` / `qzone_rights` / `qzone_publish` |
| 自动化 | `automation_status` / `schedule_register` / `schedule_list` / `schedule_cancel` |
| 私聊 | `send_private_message` / `user_history` |
| 群管理 | `get_group_members` / `group_ban` / `group_kick` / `group_admin` / `group_whole_ban` / `group_rename` / `group_card` / `group_title` / `group_shut_list` |
| 文档解析 | `file_parse` / `file_parse_local` / `file_parse_status` |

配套的底层也改了：自动化模块统一吐 `last_run`（供 `automation_status`）、
画像支持按群分页、MCP 客户端能读 `resources` / `prompts`（原来只有 `tools`）。

**协议还是 v1**，旧插件一行不用改。

---

## 🌙 三、夜间控制台

顶部一排文字页签全拆了，换成**桌面侧栏 + 手机底部折叠导航**：

- 面板页 HTML 从 1.7 KB 涨到 15 KB，多出来的是 34 个**内联 SVG 图标**
- 加了「跳到正文」无障碍链接
- 品牌区是花璃的花标（纯 `math` 算出来的，没引入任何图片）
- 侧栏按五组分：运行配置 / 对话与记忆 / QQ 与社群 / 工具与扩展 / 面板与诊断

仍是**零 JavaScript、零外部资源**——手机端折叠用的是原生 `<details>`。

---

## 🖼️ 四、背景图会自己算怎么裁（v2.19.2）

以前背景图只有 `cover` 和 `contain` 两种，一张竖图铺桌面必然裁掉脑袋。

现在桌面和手机分开配：

- **模式**：`auto`（按比例智能挑）/ `cover`（焦点铺满）/ `contain`（完整显示）/ `soft`（完整显示 + 柔化补边）
- **焦点**：center / top / bottom / left / right，也能填 `50,30` 这种自定义百分比
- **保护区**：框住不能被裁掉的主体，服务端按容器比例算最终裁切
- 外观页有「预览裁剪」，提交前能看实际效果

日志页也跟着改了：每条日志变成**可选中卡片**，底色跟随面板透明度（100% 实底，调低透出背景）。

---

## 📄 五、文件解析终于有开关了

之前这块**只有上限参数，没有开关**——任何群里发个 2MB 的 PDF 都会解析、烧 token。

现在：

| 键 | 作用 |
| :--- | :--- |
| `FILE_PARSE_ENABLED` | 总开关 |
| `FILE_PARSE_GROUP_UPLOAD_ENABLED` | 群文件自动解析单独开关 |
| `FILE_PARSE_FORMATS` | 格式白名单（默认 `txt,pdf,docx,xlsx,csv`） |

顺手修了个 `KeyError`：`pending_files.pop(key)` 改成 `pop(key, None)`——
键不存在时以前会直接抛异常。

---

## 🤖 六、两个 Android 专属的坑（v2.19.1）

这俩在 Linux CI 上永远不会出现，在 Android 上必现。

### 1. `#!/usr/bin/env ruby` 解析不了

Android 没有 `/usr/bin/env`，内核看到这种 shebang 直接失败。表现是**插件启动等到 30 秒超时**，
不是报错，很难查。

现在 runtime 会先看 shebang：如果是 `env` 形式且那个 `env` 不存在，就改成
「解释器绝对路径 + 脚本」调用。Linux 上行为完全不变。

### 2. Perl 连 `use strict` 都失败

`@INC` 是**编译进 perl 二进制**的，前缀一变就全指向旧路径。改 `Config.pm` 没用——那是「报告」不是「来源」。

唯一能覆盖它的是 `PERL5LIB`。现在 runtime 会自动探测同前缀的 `lib/perl5` 并注入，
用户自己设了就不覆盖。

---

## 🧪 七、测试

```
2589 passed / 149 skipped / 0 failed
```

新增的：`test_background_crop.py`（背景裁剪的 12 条）、平台动作、WebUI 视图、
文件解析面（`test_file_parse_surface.py`）。

修的：6 个旧测试还在测已经被删掉的 `_render_cat_nav` 和 `.cats-summary` 系列类，
按新结构重写了断言。

---

## 🔧 八、顺手修的

- **默认打开面板看不到任何配置项**：`cat` 为空字符串时被当成未知分类，直接退回索引页。
  现在空分类归一化为 `all`
- **CI 的 Node 20**：TypeScript 插件构建要 Node ≥ 22.6，升到 22
- **`qzone_auto` 导入顺序**：`asyncio/time/json` → `asyncio/json/time`（ruff I001）
- **`ruff` 编译 SIGABRT**：`-C lto=fat` 在 Android 链接阶段 OOM，关掉 LTO 才编得过

---

插件生态这块算是补完一轮了：能画页面、能调能力、权限收得住。下一轮想回头收拾一下
记忆那块——现在群知识、群友画像、长期记忆三套东西各管各的，有点散。
