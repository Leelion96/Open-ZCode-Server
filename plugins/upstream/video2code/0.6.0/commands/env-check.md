---
description: 体检本机环境并装齐缺失依赖 — Python 视频包/ffmpeg/Node/registry 连通性；浏览器录制由 ZCode 内置 Browser Use 提供
argument-hint: "[--fix]"
skills: env-setup
---

按 `env-setup` skill 跑一遍环境体检。

- 附加参数 (可选): `$1` — 传 `--fix` 表示体检后直接把**可自动装**的项装上（pip 包、node_modules 预热）；不传则只体检 + 列出要装什么。

要求:

1. 先跑 `env_doctor.py`（Bash timeout ≥120s，会真实 ping registry），不要凭记忆预判缺什么。
2. 按打印顺序处理; 标 `[未探测]` 的项不要照着装, 先修它的前置再重跑体检。
3. **系统级软件 (ffmpeg / Node.js) 不要替用户装**: 报出"要什么"+ 脚本给的本平台示例命令, 让用户自己执行 —— 各人机器上的装法和权限都不同。
4. 标 `·` 的是本平台不适用, 不是缺口, 不用管也不要汇报成问题。
5. 网络类失败先当代理/镜像源配置问题处理, 不要原样重试。
6. 收尾报告说**能力**而非包名: 哪些工具现在可用、哪些不可用、用户还需要做什么。
7. 不安装 Playwright/Chromium；URL 交互与录制检查 ZCode `iab` / Browser Use API。

只做环境, 不要顺手开始复刻任务。
