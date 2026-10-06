# 腾讯会议 CLI

这是腾讯官方 [tencentmeeting-cli](https://github.com/TencentCloud/tencentmeeting-cli) 的轻量 Skill 封装，不捆绑二进制、MCP 服务或腾讯会议凭证。

实际命令是 **`tmeet`**，npm 包名为 **`@tencentcloud/tmeet`**。插件名仍为 `tencent-meeting-cli`。

## 使用

- `/tencent-meeting-cli:setup`：检查安装和登录状态，按需完成 OAuth2 登录；优先复用已有环境。
- `/tencent-meeting-cli:cli`：按任务读取实时帮助，使用 `meeting`、`record`、`report` 等命令组处理会议、录制和参会报告。默认 JSON 输出，显式参数为 `--format json`。

安装会修改本机软件，登录会打开浏览器并在本地保存凭证，业务命令访问腾讯会议服务。插件不会索取或输出 Client Secret、Token。远程写操作及导出/分享数据前展示具体变更，缺少授权时请求确认；已有明确授权时继续执行。

完成报告区分 CLI 可执行、登录就绪和业务查询成功；只有实际请求成功才报告对应业务能力已验证。
