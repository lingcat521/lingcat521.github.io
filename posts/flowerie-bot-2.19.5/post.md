# 🌸 花璃 v2.19.5 更新公告

承接 v2.19.4——这轮三件事：**探测模型**、**独立分析群消息**、**把正则换掉**。

顺带我被自己的架构门禁拦了一次，也漏提交了一次。都写在下面。

---

## 🔍 一、模型探测：哪个能用一个按钮看清

之前想知道「我配的那几个模型接口还活着吗」，只能去各自的页面点测试，
而且聊天、视觉、引战、向量、重排各点一遍。

现在有一个统一的探测：

```python
bot.ping_models(target="all")
```

它只发**固定的最小测试请求**——不带你的任何数据，不会把聊天记录发出去。返回每个端点的：

| 项 | 说明 |
| :--- | :--- |
| 可达性 | 能不能连上、认证过不过 |
| 耗时 | 这次探测花了多久 |
| 错误 | 失败时具体是哪一类（401 / 超时 / DNS） |

新权限叫 `ping_models`。为什么单独开一个权限——因为它**会真的调模型**，
按 token 计费，不能让插件随便刷。

---

## 🧠 二、群消息独立分析：引战和喜好，一次调用

之前引战检测（`TOXIC_*`）是一套，群友画像提炼是另一套，两条独立的模型调用。

这次改成**一次调用同时产出两样**：

- **引战判定**：这条消息是不是在挑事
- **喜好原话**：谁说了「我最近迷上了钓鱼」这种可以直接存进画像的话

用**独立模型**，不占主对话的额度。配置项拉了 14 个：

```
MESSAGE_ANALYSIS_API_URL / API_KEY / MODEL          # 共用一套
MESSAGE_ANALYSIS_PREFERENCE_*                        # 喜好链路单独覆盖
MESSAGE_ANALYSIS_TOXIC_*                             # 引战链路单独覆盖
MESSAGE_ANALYSIS_GROUP_IDS                           # 只分析这些群
MESSAGE_ANALYSIS_TIMEOUT                             # 3-30 秒
MESSAGE_ANALYSIS_DAILY_LIMIT                         # 全局日限额，默认 1000
MESSAGE_ANALYSIS_GROUP_DAILY_LIMIT                   # 单群日限额，默认 300
```

两条限额是重点。这个功能是**每条消息都可能触发一次模型调用**，没有闸就是无底洞。
所以默认值给得不激进：单群一天 300 次，够用，但烧不穿。

---

## 🧹 三、DDG 解析：正则换掉了

你说过一句「受不了再用正则表达式匹配了」，我完全同意。

DuckDuckGo 的结果卡片之前是这么抓的：一堆 `re.findall` 匹配 `class="result__a"` 之类。
问题很直接——**对方改一次 class 名，全部失效**，而且不报错，只是搜不到东西。

现在换成 `html.parser.HTMLParser` 的子类（`src/services/ddg_html.py`，57 行）：

```python
class DuckDuckGoResults(HTMLParser):
    def handle_starttag(self, tag, attrs): ...
    def handle_data(self, data): ...
```

代码多了一点，但它是**按 HTML 结构走**的，不是按字符串碰运气。

---

## 🏗️ 四、被自己的门禁拦了一次

新增的群消息分析读写，被塞进了 `config_service.py`。那个文件从 700 行涨到 **774 行**。

然后架构门禁报警了：

```
AssertionError: src/services/config_service.py 行数 774 超限 700（防上帝类回归）
```

这个 700 是**我自己设的**。设的时候就写了注释：「数据声明已拆到 config_schema.py」。
结果新代码又把它填回去了。

按职责拆开：

```
config_service.py                  774 → 671 行
message_analysis_service.py        99 行（新，群消息分析配置读写）
password.py                        47 行（新，scrypt 口令哈希）
```

密码那组为什么要拆——它是纯函数，无状态，本来就不该住在配置服务里。
顺手把 `verify_password` 的旧明文兼容也搬过去了，13 条密码测试全过。

---

## 🐛 五、我漏提交了一次

这个必须写下来。

合并时我用了白名单：

```bash
git add -A src/ tests/ docs/ CHANGELOG.md README.md pyproject.toml
#        ↑ 少了 plugin_sdk/ 和 sdk/
```

结果本地测试全过，CI 挂了：

```
AttributeError: 'FlowerieBot' object has no attribute 'message_analysis_update'
```

原因是测试会执行 `shutil.copytree(仓库/plugin_sdk/flowerie_sdk, 临时插件目录)`，
而仓库里的 SDK 还是旧版——1252 行，没有新方法。我本地是 1263 行。

**本地过、CI 挂**，就是这种最难受的差异。补提交 `9364b24` 后全绿。

教训：合并时先 `git status` 看一眼全量，别用白名单。

---

## 📋 六、SDK 五语言都同步了

| 语言 | 新方法 |
| :--- | :--- |
| Python | `bot.ping_models()` / `message_analysis_get()` / `update()` |
| Go | `Plugin.PingModels()` / `MessageAnalysisGet()` / `MessageAnalysisUpdate()` |
| Java | `plugin.pingModels()` / `messageAnalysisGet()` / `messageAnalysisUpdate()` |
| Rust | `plugin.ping_models()` / `message_analysis_get()` / `message_analysis_update()` |
| TypeScript | `plugin.pingModels()` / `messageAnalysisGet()` / `messageAnalysisUpdate()` |

协议还是 **v1**，旧插件一行不用改。

---

## 🧪 七、测试

```
2400+ passed / 0 failed
```

分批跑的——这台机器一次跑全量到 60% 会被系统杀掉，改成每批 40-50 个文件。

新增的：

- `test_model_ping.py`：3 条，探测请求形态、错误分类、不泄漏数据
- `test_message_analysis.py`：9 条，配置保存、密钥清除、热更新
- `test_message_analysis_api.py`：2 条，HTTP API + 真实 Python SDK 传输
- `test_chat_parsing_regressions.py`：8 条，DDG 解析换实现后的回归

架构门禁、密码、新功能四套加起来 44 条，全绿。

---

模型探测是为了少点几次页面，群消息分析是为了省一次模型调用，
换掉正则是因为它确实该换。

这轮没什么花活。

