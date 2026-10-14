# 普通公告发布与部署

公告沿用客户端的 Marketing Touch 横幅、弹窗和资源显示。编辑 data/announcements.json，执行 pnpm content:check，再重启或重新构建服务发布；初始没有公告，不提供管理后台。

两个语言数组独立维护；每个展示位置选择未处理公告中 priority 最高的一条。同设备确认或关闭后不会再次收到相同 campaign_id，包括切换语言和服务重启。内容需要再次通知时使用新 campaign_id；不要为修改关闭规则清空数据库。

允许关闭、打开普通 HTTP(S) 链接、复制原始文本、打开普通设置或插件市场。套餐领取、升级、奖励和定位官方账号 Provider 在内容校验和客户端执行层均被拒绝。客户端轮询、弹窗遮挡、资源和失败恢复继续遵循上游。

## 接口

GET /api/v1/marketing/touch?seq=0 使用 X-Device-Mid UUID 与 X-Client-Language（zh-CN/en-US）；成功返回 code/data/server_time/language/deliveries。POST /api/v1/marketing/touch/action 使用同一设备头与 campaign_id/action_type（confirm 或 cancel）。回执重试幂等，未知公告返回明确错误；不会调用官方服务或创建账号。

## 图片、视频与交互包

本地资源放入 data/announcement-assets，内容 src 使用 /assets/announcements/ 下的相对路径并填写文件 SHA-256。部署地址由 PUBLIC_ORIGIN 生成，响应资源 URL 含内容哈希。服务器启动时检查真实路径、大小和哈希并加载缓冲，之后请求不读文件。外部资源使用普通 HTTP(S) URL；客户端继续实施其既有下载、HTTPS、哈希、ZIP 和沙箱限制。

服务端单资源上限 50 MB，整体本地快照上限 200 MB；客户端对 bundle 等仍有更小的上游限制。修改本地字节时同时更新哈希；不在内容文件内填部署凭据。正常发布使用 HTTPS，开发 HTTP 的许可范围沿用客户端上游规则。

## 数据库与验证

部署前执行 pnpm db:migrate。迁移只新增 announcement_receipts 和升级 schema-version 至 0.1.1，不修改账号、会话或现有内容。处理记录通过唯一 DatabaseService 管理，日志不输出设备标识、正文或鉴权。

执行 pnpm verify、pnpm test:database 与 pnpm test:compose，分别验证代码/契约、真实数据库和容器部署。手机远控 relay 后端不在此功能中。
