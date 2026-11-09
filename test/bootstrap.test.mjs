import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const source=fileURLToPath(new URL('../',import.meta.url));
test('download bootstrap installs an archive, handles versions, and leaves no target on download failure', async () => {
  const root=await mkdtemp(join(tmpdir(),'workflow-bootstrap-'));
  try {
    const fixture=join(root,'fixture'); const snapshot=join(fixture,'snapshot');
    await mkdir(snapshot,{recursive:true});
    await cp(join(source,'bin'),join(snapshot,'bin'),{recursive:true});
    await cp(join(source,'skills'),join(snapshot,'skills'),{recursive:true});
    const archive=join(root,'source.tar.gz');
    assert.equal(spawnSync('tar',['-czf',archive,'-C',fixture,'snapshot']).status,0);
    const tools=join(root,'tools'); await mkdir(tools);
    await writeFile(join(tools,'curl'),`#!/usr/bin/env node
const fs=require('node:fs');
if(process.env.FAIL_DOWNLOAD) process.exit(22);
const args=process.argv.slice(2);
if(!args.includes('https://codeload.github.com/ooweigan/dev-workflow-manager/tar.gz/v0.1.0')) process.exit(2);
fs.copyFileSync(process.env.FIXTURE_ARCHIVE,args[args.indexOf('--output')+1]);
`,{mode:0o755});
    const project=join(root,'project'); await mkdir(project);
    const env={...process.env, PATH:tools+':'+process.env.PATH,FIXTURE_ARCHIVE:archive};
    const run=(...args)=>spawnSync('sh',[join(source,'install.sh'),...args],{cwd:project,env,encoding:'utf8'});
    let result=run('--project','--ref','v0.1.0');
    assert.equal(result.status,0,result.stderr);
    assert.match(await readFile(join(project,'.agents','skills','dev-workflow-manager','SKILL.md'),'utf8'),/name: dev-workflow-manager/);
    assert.equal(run('--project','--ref','../bad').status,1);
    const clean=join(root,'clean'); await mkdir(clean);
    result=spawnSync('sh',[join(source,'install.sh'),'--project'],{cwd:clean,env:{...env,FAIL_DOWNLOAD:'1'},encoding:'utf8'});
    assert.notEqual(result.status,0);
    assert.deepEqual(await readdir(clean),[]);
  } finally {await rm(root,{recursive:true,force:true});}
});
