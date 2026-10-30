# 🌸 花璃 v2.10.0 更新公告

这次花璃学会了**管群**和**发说说**。

以前的 Web UI 只能改配置，群管理全靠管理员自己敲 OneBot 接口；QQ空间更是
只有命令行。这次把两件事都搬进了「零 JS」的管理后台——点一点就生效，
和改配置是同一套热更新。

---

## 🛡️ 一、群管理控制台（12 个操作）

Web UI 新增「群管理」页签：

- 设为/取消管理员、禁言/解禁、踢人（可选拒绝再加群）
- 改群名片、改群名称、设专属头衔
- 全员禁言开关、禁言列表、退群（群主可解散）

服务层是新的 `GroupAdminService`——统一参数校验、错误收敛，
面板不写一行 JavaScript。SDK 侧同步开放 `set_group_admin` 等 10 个 Bot 方法，
插件也能调（走权限批准）。

> 边界：操作都经过 Bot 自身权限自检——花璃没有管理权限的群，
> 操作会被明确拒绝并说明原因，不会瞎点。

---

## 🌸 二、QQ空间（发说说 + 图片 + 发布历史）

- 发说说：正文 + 最多 9 张图，权限 1/4/16/64/128（16/128 需权限对象）
- 图片来源三种都认：`file://` / `http(s)://` / `base64://`
- 按 tid 删除说说；本机发布历史原子落盘（`data/qzone_history.json`）

底层是 NapCat 的 `send_qzone_msg` / `delete_qzone_msg` 扩展动作，
SDK 开放 `qzone_publish` / `qzone_delete`。

---

## 🔌 三、SDK 同步扩展

- `Bot.set_group_admin` / `kick_with_reject` / `get_group_shut_list` /
  `leave_group` … 共 10 个群管方法
- QQ空间动作对插件开放（权限批准制）

> 兼容性：老配置零迁移；新能力对插件只做加法。

---

## 🧪 四、测试

- CI 三档 + ruff 全绿；新增面板渲染/参数校验/历史落盘测试
- NapCat 动作实测记录见 `docs/reference/napcat-admin-qzone.md`
