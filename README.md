# dev-workflow-manager

管理 AI 开发任务：登记需求和 Issue、按周记录进展、记录验证、规范 Git Commit，并关联代码与任务。MIT 开源。无需在线任务平台或运行时 npm 依赖。

## 从 GitHub 安装（推荐，无需 npm 账号）

需要 Node.js 20+、curl 和 tar，适用于 macOS / Linux / WSL。

```bash
# 下载后执行，安装到个人技能目录
curl -fsSL https://raw.githubusercontent.com/ooweigan/dev-workflow-manager/main/install.sh -o /tmp/dev-workflow-install.sh
sh /tmp/dev-workflow-install.sh --global

# 或在项目根目录执行，安装到当前项目
sh /tmp/dev-workflow-install.sh --project
```

也支持一行安装：

```bash
curl -fsSL https://raw.githubusercontent.com/ooweigan/dev-workflow-manager/main/install.sh | sh -s -- --global
```

更新加 `--force`，先备份已有技能。默认下载 main；如需固定版本，在安装时使用 `--ref <版本标签或完整提交号>`。脚本与源文件应使用同一版本：固定版本安装时也将 raw URL 中的 main 替换为同一版本。项目的周记录不受影响。

已克隆本仓库时可以离线运行 `node bin/cli.mjs install --global`（无需再下载）。Python 3 只用于 Commit 校验脚本。

## 从 npm 安装（可选，将来发布后可用）

要求 Node.js 20 或更新版本。以下 npm registry 命令在包发布后可用：

```bash
# 所有项目可用
npx dev-workflow-manager@latest install --global

# 当前项目可用，请在项目根目录执行
npx dev-workflow-manager@latest install --project
```

也可以先全局安装 npm 命令，再显式安装技能：

```bash
npm install -g dev-workflow-manager
dev-workflow-manager install --global
```

npm 安装本身不会自动改写技能目录；无 postinstall。技能安装位置为 `~/.agents/skills/dev-workflow-manager/` 或当前目录 `.agents/skills/dev-workflow-manager/`。安装后输入 `$dev-workflow-manager`，未出现时重启 Codex。

目标已存在时停止。显式增加 `--force` 会先将旧技能备份到同级 `.dev-workflow-manager-backup-*` 目录，再安装新版。备份保留供手工恢复；目标为符号链接或普通文件时拒绝覆盖。不修改项目周记录，也不自动更新旧的 `~/.codex/skills` 安装；若已有同名旧技能，请手工保留一个有效安装，避免重复发现。

## 任务记录

默认目录 `docs/dev-workflow/weekly/`，每个 ISO 周一个 Markdown 文件，周一至周日，例如 `2026-W46.md`。使用用户时区与 ISO 周年。每周记录需求和 Issue 概览、详情、实际验证及 Commit。

跨周保留原编号和原始详情，新周用相对链接跟进。只有真实登记需求时创建任务，不编造任务或验证结果。项目另有指定目录时遵从项目设置。

## Commit 约定

标题为 `type(scope): summary`，正文区块顺序为 Description、Page-Path、Platforms、Issue、Verification，最后一行为 `AUTHOR:<author>;XQBH:<external-requirement>;NOTES:<summary>`。

正文默认建议中文，不做语言校验。无外部需求编号时 XQBH 为 NONE；内部任务编号放 Issue。仅明确请求提交才执行本地 Commit，不自动推送或发布。项目更具体的提交规则优先。完整协议在 `skills/dev-workflow-manager/references/commits.md`。

格式检查脚本另需 Python 3；不影响 Node.js 安装 CLI：

```bash
python3 /path/to/installed/skill/scripts/validate_commit.py /path/to/message.txt
```

## 本地开发与可选 npm 发布

```bash
npm test
npm pack --dry-run
npm pack
```

包发布前可用生成的 tgz 测试：

```bash
npx --yes --package ./dev-workflow-manager-0.1.0.tgz dev-workflow-manager --help
```

发布者需要自己的 npm 账号；GitHub SSH 公钥用于 GitHub 的 Git 访问，不能代替 npm 登录。

```bash
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
npm publish --access public
```

包名可在首次发布前改成自己的 `@用户名/dev-workflow-manager`；修改后相应替换以上 npm/npx 包名，bin 命令名保持不变。包名可用性以真正发布时为准。后续版本运行 `npm version patch` 再发布。

源码仓库：https://github.com/ooweigan/dev-workflow-manager

仅发布通用技能、安装器和合成测试，不包含业务仓库、项目任务记录、本机路径、SSH 密钥或 npm 凭证。GitHub SSH 仅用于维护者推送，使用者通过公开 HTTPS 地址下载，无需密钥。
