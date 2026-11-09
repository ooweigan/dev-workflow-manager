import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const cli = fileURLToPath(new URL('../bin/cli.mjs', import.meta.url));
async function sandbox(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'workflow-test-'));
  try { await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}
const run = (cwd, ...args) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding:'utf8', env:{...process.env, HOME:cwd, USERPROFILE:cwd} });
test('project installation, conflict refusal, backup and task preservation', () => sandbox(async dir => {
  const target = join(dir,'.agents','skills','dev-workflow-manager');
  assert.equal(run(dir,'install','--project').status,0);
  assert.match(await readFile(join(target,'SKILL.md'),'utf8'),/name: dev-workflow-manager/);
  await writeFile(join(target,'custom.txt'),'preserve');
  const weekly = join(dir,'docs','dev-workflow','weekly');
  await mkdir(weekly,{recursive:true});
  await writeFile(join(weekly,'2026-W46.md'),'real tasks');
  assert.equal(run(dir,'install','--project').status,1);
  assert.equal(await readFile(join(target,'custom.txt'),'utf8'),'preserve');
  assert.equal(run(dir,'install','--project','--force').status,0);
  const backup = (await readdir(join(dir,'.agents','skills'))).find(x=>x.startsWith('.dev-workflow-manager-backup-'));
  assert.ok(backup);
  assert.equal(await readFile(join(dir,'.agents','skills',backup,'dev-workflow-manager','custom.txt'),'utf8'),'preserve');
  assert.equal(await readFile(join(weekly,'2026-W46.md'),'utf8'),'real tasks');
}));
test('global installation uses user home', () => sandbox(async dir => {
  assert.equal(run(dir,'install','--global').status,0);
  assert.match(await readFile(join(dir,'.agents','skills','dev-workflow-manager','SKILL.md'),'utf8'),/name:/);
}));
test('ambiguous and unknown arguments do not install', () => sandbox(async dir => {
  for (const args of [['install'],['install','--global','--project'],['install','--unknown'],['install','--project','--project']]) assert.equal(run(dir,...args).status,1);
  assert.equal(run(dir,'--help').status,0);
  assert.deepEqual(await readdir(dir),[]);
}));
test('force does not follow an existing skill symlink', () => sandbox(async dir => {
  const root=join(dir,'.agents','skills'); await mkdir(root,{recursive:true});
  const external=join(dir,'existing'); await mkdir(external);
  await writeFile(join(external,'keep.txt'),'safe');
  await symlink(external,join(root,'dev-workflow-manager'),'dir');
  assert.equal(run(dir,'install','--project','--force').status,1);
  assert.equal(await readFile(join(external,'keep.txt'),'utf8'),'safe');
}));
