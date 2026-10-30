# 🌸 花璃 v2.16.0 更新公告

一个「收拾屋子」的版本。

v2.12.0 以来 AI 工具层的开关散落在三个配置分类里：
`Qzone` 分类塞着 AI 空间开关和配图池参数，`Admin` 塞着群管开关，
`AI` 塞着记忆开关——想开「让 AI 自己发说说」要在三个页面之间跳。

这次全部收进新页签「**自动化**」。

---

## 🗂️ 一、新页签「自动化」（抽屉内独立 tab）

15 个配置集中管理：

- **AI 工具层**：`AI_QZONE_*` / `AI_ADMIN_ENABLED` / `AI_MEMORY_ENABLED` /
  `AI_TOOL_PROMPT`
- **QQ空间配套**：`QZONE_IMAGE_*` / `QZONE_ENABLED` /
  `QZONE_DEFAULT_UGC_RIGHT` / `QZONE_HISTORY_*`

单表单保存，复用 ConfigService 的 `.env`（原子）+ `settings.db` 双写与热更新。

---

## ✂️ 二、配置页同步瘦身

- `Qzone` 分类整体迁出（12 键并入「自动化」），配置页分类导航少一项
- `Admin` 分类只剩群管控制台三键
- 自动化页按声明顺序排序，保存走`update_many` 校验

---

## 🧪 三、测试

- `test_automation_panel.py`：键集合精确匹配、旧分类已清空、
  渲染过滤（非本页键不展示）、全部键在 SCHEMA
- 配置页测试同步断言旧键已迁出
