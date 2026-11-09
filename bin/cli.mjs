#!/usr/bin/env node
import { cp, mkdir, mkdtemp, lstat, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const name = 'dev-workflow-manager';
const args = process.argv.slice(2);
const help = `开发流程管理 Skill 安装器

用法：
  dev-workflow-manager install --global [--force]
  dev-workflow-manager install --project [--force]

--global   安装到 ~/.agents/skills/dev-workflow-manager
--project  安装到当前目录 .agents/skills/dev-workflow-manager
--force    已有技能先备份，再安装新版；不会修改项目任务记录

安装后使用 $dev-workflow-manager。Commit 校验脚本另需 Python 3。`;

async function exists(path) {
  try { return await lstat(path); } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
async function main() {
  if (!args.length || (args.length === 1 && ['--help', '-h'].includes(args[0]))) {
    console.log(help); return;
  }
  const flags = args.slice(1);
  if (args[0] !== 'install' || flags.some(x => !['--global', '--project', '--force'].includes(x)) ||
      new Set(flags).size !== flags.length ||
      Number(flags.includes('--global')) + Number(flags.includes('--project')) !== 1) {
    throw new Error(`参数错误。\n${help}`);
  }
  const root = resolve(flags.includes('--global') ? homedir() : process.cwd(), '.agents', 'skills');
  const target = join(root, name);
  const current = await exists(target);
  if (current && (!flags.includes('--force') || current.isSymbolicLink() || !current.isDirectory())) {
    throw new Error(`目标已存在，未修改：${target}。普通目录可用 --force 备份后更新；符号链接或文件需手动处理。`);
  }
  const source = fileURLToPath(new URL('../skills/dev-workflow-manager/', import.meta.url));
  await mkdir(root, { recursive: true });
  const stage = await mkdtemp(join(root, '.dev-workflow-manager-install-'));
  const payload = join(stage, name);
  let backup;
  try {
    await cp(source, payload, { recursive: true, errorOnExist: true, force: false });
    if (current) {
      // Backup directory is uniquely reserved and retained for the user.
      backup = await mkdtemp(join(root, '.dev-workflow-manager-backup-'));
      await rename(target, join(backup, name));
    }
    // Do not merge into a target another process created while copying.
    if (await exists(target)) throw new Error('安装期间目标发生变化，已停止；请检查目标和备份。');
    try { await rename(payload, target); }
    catch (error) {
      if (backup && !(await exists(target))) await rename(join(backup, name), target);
      throw error;
    }
    console.log(`已安装：${target}`);
    if (backup) console.log(`旧版备份：${backup}`);
    console.log('使用 $dev-workflow-manager；未显示时重启 Codex。');
  } finally { await rm(stage, { recursive: true, force: true }); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
