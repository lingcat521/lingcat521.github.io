# 🌸 花璃 v2.4.0 更新公告

诶嘿w，这一版有点特别——**没有新玩法**，但花璃里里外外被翻修了一遍喵。

距离 v2.3.0 过去没几天。上一版把"插件平台"立了起来，东西一多，代码就开始长歪：几个类越滚越大、
有些代码写完从来没被调用过、消息主路径上还藏着几处会卡住整个程序的同步文件操作。

所以这一版的主题是**工程质量**：把结构拆顺、把隐患堵上、把热路径提速，
顺便修掉一批"功能其实没生效"的老 bug。

（全都是你平时感觉不到的改动，但它们每天都在真跑uwu 公告会比上次短一点点）

---

## 🧱 一、把最胖的几个类拆开了

花璃的 `PluginManager` 一度是个两千多行的"什么都管"的类。这一版把几块职责搬了出去：

- **WebUI 宿主** → `src/plugins/webui_host.py`（540 行）：插件页面、文件空间、静态资源、受控 context
- **定时任务** → `src/plugins/scheduler.py`（139 行）：注册 / 取消 / 循环 / 派发
- **上下文崩溃备份** → `src/core/context_backup.py`：`context_manager.py` 从 307 行瘦到 **154 行**
- **回复解析** → `src/services/reply_parser.py`；**隐私存档** → `src/services/privacy_archive.py`

拆的时候留了**同名委托**，所以插件、WebUI 路由、测试的调用方式一个都没变（这条是硬要求喵）。

顺手删掉了拆分前遗留的旧单体 `old_ai_tmp.py`（762 行）和一批零引用代码 —— 删之前逐条查过引用链，
不是"看着像没人用"就删。

（等价性也留了证据：比如引战关键词表外提时拿 557 个样本跑新旧两版实现做对照，差异 0）

---

## 🛡️ 二、旧插件通道补上了防护

这条**插件作者要留意**喵。

花璃有两条插件间通信通道：新的 `plugin.call / plugin.emit`（有权限判定、环保护、超时协商、统计）
和旧的 `plugin_call / plugin_event / plugin_service`（从早期版本就有的 SDK 方法）。
旧通道之前只有"不能调用自己"这一层防护，超时写死 3 秒：

- **环保护**：现在复用新通道**同一套** hop 机制（`MAX_HOP_COUNT=8`），
  A→B→A→B 这种回环会被拦下，不会一路递归到超时
- **超时可配置**：新增 `PLUGIN_LEGACY_CALL_TIMEOUT`（默认 **3**，和以前一样）、
  `PLUGIN_LEGACY_CALL_TIMEOUT_MAX`（默认 30），插件也能在 payload 里自己请求
- **可观测**：多了 `plugin_legacy_calls_total` 指标和 loop / timeout / error 日志（只记插件名和动作，不记内容）

旧 action 的名字、参数、返回结构都没动，权限表也没动 —— 只是把防护补上了。

---

## ⚡ 三、消息主路径快了几处（每条都有实测数字）

- **上下文备份不再卡住整个程序**：以前每 60 秒一次的全表重写是同步的，
  200 个群的规模要 **407.5 ms**，这段时间整个事件循环都在等它 → 现在挪到线程池，**阻塞 0 ms**
- **预算被拒的请求不再白干活**：以前被预算/限速拦下之前，已经查过一次上下文、一次表情包 →
  现在变成 **0 次**
- **人格解析一次请求只做一次**：以前一次对话里最多解析 2 轮、每轮最多 4 次数据库查询 → 现在 **1 轮**
- **HTTP 连接复用**：以前每次调 AI 都重新握手 → 现在连上就留着（20 次连续请求 412.8 ms → **125.5 ms**）
- 引战检测的关键词表、插件 manifest 的缓存命中路径也顺手去掉了重复计算（42.9 µs / 16.82 µs → 0）

（最后一项 keepalive 其实上一轮被我否掉过——因为第一次测出来"更慢"。
后来发现那次测的是"服务端没开 TCP_NODELAY"的特例，真实 API 服务基本都开着，重测才决定启用喵）

---

## 🩹 四、修好了几个"看起来有、其实没生效"的功能

这几个是**你会真实感觉到**的：

- **群特色昵称 / 群专属发言规则**：以前判断条件取错了参数，导致两处判断恒不成立 ——
  也就是说这两个功能**从来没生效过**，现在修好了
- **WebUI 四条断链**：`/panel/nicknames`、`/panel/knowledge/config` 两个表单提交一直 404，
  插件 DSL 的默认按钮指向了不存在的路由 —— 都补上了
- **两个面板接口没有鉴权**：没登录也能提交表单，现在会拦下（顺手修的）
- **监控指标丢维度**：`received_messages_total` 被重复注册，`post_type` 标签一直被静默丢掉
- **关闭时的 `Task was destroyed but it is pending!`** 警告：插件关停时的任务现在会被登记并回收
- 花语记忆的"每日计数"以前只增不减（群数 × 天数），现在跨天会清

---

## ⚙️ 五、新增了三个配置项（默认值 = 老行为）

- **`AUDIT_LOG_MAX_MB`**（默认 `0`）：审计日志轮转上限；**0 = 不轮转**（跟以前完全一样），设成正数才会 `audit.log → .1 → .2` 滚动
- **`PLUGIN_LEGACY_CALL_TIMEOUT`**（默认 `3`）：旧插件通道单次投递超时（秒）
- **`PLUGIN_LEGACY_CALL_TIMEOUT_MAX`**（默认 `30`）：上面那个的上限

不填就是老样子，配置面板里能直接改。

---

## 📚 六、文档搬家了

`docs/` 根目录以前堆着 47 个 md（协议、SDK、安装、报告混在一起），现在按主题分了目录：

- `guides/` 上手与运维 · `reference/` 协议与接口 · `plugins/` 插件开发
- `features/` 子系统说明 · `reports/` 验收报告 · `architecture/` 架构审计 · `archive/` 历史

所有文档之间的相对链接（264 处）、代码里引用的文档路径（44 个文件）都一起改了，坏链 0。
搬完之后 WebUI 的文档渲染器一时找不到文件，也一起修好了（受控语义没变，路径穿越照样不行喵）。

---

## 📦 七、下载与升级

- 各平台资产（Windows / Linux / macOS，x64 与 arm64）在
  [Release 页面](https://github.com/lingcat521/Flowerie_bot/releases/tag/v2.4.0) 下载
- 安装说明：[Windows](https://github.com/lingcat521/Flowerie_bot/blob/main/docs/guides/install-release-windows.md) ·
  [Linux/macOS/Termux](https://github.com/lingcat521/Flowerie_bot/blob/main/docs/guides/install-release-guide.md) ·
  [Termux 专用](https://github.com/lingcat521/Flowerie_bot/blob/main/docs/guides/install-termux.md)
- 升级：替换程序文件即可，插件与数据目录（`plugins/`、`data/`）保持不动
- 完整变更：[CHANGELOG](https://github.com/lingcat521/Flowerie_bot/blob/main/CHANGELOG.md)；
  两份技术报告在 [重构报告](https://github.com/lingcat521/Flowerie_bot/blob/main/docs/architecture/refactor-final-report.md)
  与 [加固报告](https://github.com/lingcat521/Flowerie_bot/blob/main/docs/architecture/hardening-performance-report.md)

（升级前记得备份 `.env` 和 `data/` 哈）

---

## 🐛 八、已知问题（诚实版）

- **QQ / P2P 实机链路**：开发环境一直没有真机，这部分仍然 **BLOCKED**（不是"通过"），
  实机用例在 CI 里 skip 并打印缺失条件
- **连接复用取决于服务端**：如果哪天 AI 接口那边把 TCP_NODELAY 关了，
  keepalive 反而会慢一点点 —— 真遇到的话把 `HTTP_KEEPALIVE_CONNECTIONS` 改回 0 就行（单行）
- **旧插件通道的权限粒度还没收敛**：它现在用的是粗粒度的 `plugin_admin`，
  不像新通道能细到 `plugin.call.<目标>.<方法>`。这一版只补了防护，没动权限模型
  （动它会让已授权插件的能力发生变化，得单独评估喵）
- **`message_router.py` 顶到 650 行了**：这个文件有硬性行数上限（防止再长出上帝类），
  现在正好压线，之后的改动得先腾地方

（都写进文档了，不藏着）

---

## 🌸 最后总结

这一版没有新功能，但花璃变得更结实了一点：

- 最胖的几个类拆开了，且调用方式一个没变
- 旧插件通道补上了环保护、可配超时和指标
- 消息主路径的几处阻塞与白干活被清掉（备份 407.5 ms → 0）
- 几个"其实一直没生效"的功能真的生效了
- 文档按主题分了目录，找东西不用再翻 47 个文件

QQ 机器人的部分照旧：人设对话、识图、记忆、人格、表情包、MCP、主动聊天都没动，
插件协议、权限语义、AI 预算与重试也都保持原样。

感谢一直在用花璃、写插件、提问题和看公告的大家！

花璃还在运行，项目也还在慢慢变好喵。

—— 花璃 v2.4.0 🌸

