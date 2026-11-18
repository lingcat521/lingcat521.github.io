# 🌸 花璃 v2.5.0 更新公告

诶嘿w，这次是**功能版**——花璃终于学会"带钥匙敲门"了喵。

之前花璃连 MCP 服务器只会一种姿势：**没有认证的那种**。稍微正经一点的外部工具服务
（要 token、要 API Key、要 Basic 认证的）一律连不上。这一版把这条路补齐了：五种认证方式、
密钥全程不外露、五语言 SDK 同步跟上；另外顺手把两条"代码早就写好、就是一直没接上"的生产线路接上了。

（上一版是工程质量，这一版终于有新东西可以玩，公告会长一点点 uwu）

---

## 🔐 一、MCP 支持五种认证了

配置写在每个 server 的 `auth` 里，不写 = 和以前完全一样（老配置**零迁移**喵）：

```ini
MCP_SERVERS=[
  {"name":"search","url":"https://mcp.example.com/mcp","auth":{"type":"bearer","token":"sk-xxx"}},
  {"name":"local","url":"http://192.168.1.10:9000/mcp","auth":{"type":"api_key","header":"X-API-Key","token":"sk-xxx"}},
  {"name":"custom","url":"https://mcp.example.com/mcp","auth":{"type":"header","name":"X-Custom-Auth","value":"sk-xxx"}},
  {"name":"legacy","url":"https://mcp.example.com/mcp","auth":{"type":"basic","username":"u","password":"p"}},
  {"name":"open","url":"https://mcp.example.com/mcp"}
]
```

- `bearer` → `Authorization: Bearer <token>`
- `api_key` → 自定义头名（不填就是 `X-API-Key`）
- `header` → 名字和值都你自己定
- `basic` → `Authorization: Basic base64(user:pass)`
- **每个 server 各自独立**：A 用 Bearer、B 用 API Key、C 不用认证，互不影响

写错了也不会"默默当没认证"：未知 type、少字段、header 名不合法、值里塞换行（想搞 Header 注入）
—— 一律**启动就报错**，还会告诉你哪个 server 的哪个字段不对。

---

## 🧪 二、密钥自始至终不外露

这条是这版花心思最多的地方喵：

- **只出现在请求头**：不进 URL、不进日志、不进错误信息，也不进插件能看到的任何返回值；
- **WebUI 里不回显**：已有密钥显示成 `********`，编辑时**留空 = 保持原值**（想删就勾"清除认证"）；
- **改普通字段不误伤**：改 URL、超时、白名单，密钥原样保留；
- **插件拿不到**：插件只能看到认证**状态**（`none` / `configured` / `error`），永远看不到值。

（顺带一提：SSRF 防护和权限校验一个都没关——本地回环还是要 `MCP_ALLOWED_HOSTS` 白名单，
`mcp_*` 动作还是要 `http_request` 权限。测试里专门盯着这两条，谁也别想偷偷绕过去w）

---

## 🔌 三、插件侧：五语言同一套写法

Python / TypeScript / Go / Rust / Java 都新增了 MCP facade，语义完全一致：

| 语言 | 入口 |
| :--- | :--- |
| Python | `bot.mcp` |
| TypeScript | `ctx.mcp` |
| Go | `ctx.MCP()` |
| Rust | `ctx.mcp()` |
| Java | `ctx.mcp()` |

方法都是 `servers / tools / call / status / auth`。老方法（`bot.mcp_call` 之类）一个没动，
老插件照旧跑。

（为了让"五语言真能用"不是嘴上说说，验收测试是**真起五个插件进程**、真连一个假 MCP 服务器，
断言服务端**实际收到**的 `Authorization: Bearer test-token` —— 写的时候还因此抓出两个 SDK 的真 bug，
比如 TS 的 `ctx.mcp` 之前压根不存在喵）

---

## 🔧 四、顺手接上两条"一直没接上"的线

这两条属于"代码写好了、测试也过了、就是没人调用"：

- **花语记忆的 PostgreSQL 后端**：以前哪怕配了 `STORAGE_BACKEND=postgres`，花语记忆还是偷偷
  建了个 SQLite 文件（配置压根影响不到它）→ 现在真的走 PostgreSQL 了；连不上库会**明确启动失败**，
  不会假装没事退回 SQLite
- **多实例适配器装配层**：`InstanceRegistry` 早就在仓库里，只是生产启动路径从来没碰过它 →
  现在组合根持有注册表并管理生命周期，以后想挂第二个协议实例不用再动核心

另外补了一处**未来的坑**：传输层参考实现里写死了 `extra_headers`，而现在的 websockets
（14+，本机实测 17.1）只认 `additional_headers` —— 真用起来就是直接报错。现在两种参数都兼容。

---

## ⚙️ 五、新增 5 个配置项（不填 = 老行为）

- **`MCP_AUTH_TYPE`**：单 server 场景的认证方式（`none`/`bearer`/`api_key`/`header`/`basic`）
- **`MCP_AUTH_TOKEN`** / **`MCP_AUTH_HEADER`**：token 与自定义头名
- **`MCP_AUTH_USERNAME`** / **`MCP_AUTH_PASSWORD`**：Basic 认证用

（只在 `MCP_SERVERS` 为空、也就是老的单 server 写法下生效；两个都配就以 `MCP_SERVERS` 为准，不打架）

---

## 📚 六、文档和徽章也刷新了

- `docs/features/mcp.md` 多了「认证」整章（五种方式表 + 多 server 混合示例 + 安全规则）；
- 十份文档的"当前版本"从 2.4.0 更新到 2.5.0，README 的测试徽章换成 CI 的真实数字；
- 三份新报告：[MCP 认证最终报告](https://github.com/lingcat521/Flowerie_bot/blob/main/docs/reports/mcp-auth-final-report.md) ·
  [生产链路报告](https://github.com/lingcat521/Flowerie_bot/blob/main/docs/architecture/production-wiring-report.md) ·
  [接线审计](https://github.com/lingcat521/Flowerie_bot/blob/main/docs/architecture/production-wiring-audit.md)。

（这一版新增 130 条认证用例 + 14 条接线用例，本机全量 2353 passed，数字都写进报告里了）

---

## 📦 七、下载与升级

- 各平台资产（Windows / Linux / macOS，x64 与 arm64）在
  [Release 页面](https://github.com/lingcat521/Flowerie_bot/releases/tag/v2.5.0) 下载
- 安装说明：[Windows](https://github.com/lingcat521/Flowerie_bot/blob/main/docs/guides/install-release-windows.md) ·
  [Linux/macOS/Termux](https://github.com/lingcat521/Flowerie_bot/blob/main/docs/guides/install-release-guide.md) ·
  [Termux 专用](https://github.com/lingcat521/Flowerie_bot/blob/main/docs/guides/install-termux.md)
- 升级：替换程序文件即可，插件与数据目录（`plugins/`、`data/`）保持不动
- 完整变更：[CHANGELOG](https://github.com/lingcat521/Flowerie_bot/blob/main/CHANGELOG.md)

（升级前记得备份 `.env` 和 `data/` 哈）

---

## 🐛 八、已知问题（诚实版）

- **OAuth 还没做**：认证类型里没有它，写了会直接报错 —— 不做半成品，等真要用的时候再评估喵；
- **插件面的 `mcp_status` / `mcp_call` 不走 `McpClient`**：它直接读配置发请求（认证头照样带），
  所以没有 DNS 二次校验；URL 来自管理员配置，插件指定不了；
- **QQ / P2P 实机链路**：开发环境仍无真机，这部分依旧 **BLOCKED**（不是"通过"）；
- **Go / Rust / Java 只能在 CI 验**：本机没有这三套工具链，本地跑会 skip 并打印原因（绝不当作通过）。

---

## 🌸 最后总结

这一版的核心是**让花璃能连上正经的 MCP 服务**：

- 五种认证方式，每个 server 独立配置，老配置零迁移
- 密钥只在请求头出现，WebUI 掩码，日志与错误信息里都找不到它
- 五语言 SDK 同步跟上，插件只能看到"配没配"，看不到值
- 顺手接上两条生产断链（花语记忆的 PostgreSQL、多实例装配层）

QQ 机器人的部分照旧：人设对话、识图、记忆、人格、表情包、主动聊天都没动，
插件协议、权限语义、AI 预算与重试也都保持原样。

感谢一直在用花璃、写插件、提问题和看公告的大家！

花璃还在运行，项目也还在慢慢变好喵。

—— 花璃 v2.5.0 🌸
