import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createApp} from './server.mjs';
import {createSceneStore,sceneName} from './scene-store.mjs';
const data={format:'aurelia-editor',version:1,night:0,player:{position:[0,0,0],yaw:0},objects:[{id:'test',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],visible:true,solid:false}]};
async function temporary(t){const prefix=path.join(os.tmpdir(),'aurelia-store-');const folder=await mkdtemp(prefix);t.after(async()=>{assert.ok(path.resolve(folder).startsWith(path.resolve(prefix)));await rm(folder,{recursive:true,force:true});});return folder;}
test('numbered backups preserve previous content, survive restart, and support Japanese names',async t=>{const dir=await temporary(t),store=createSceneStore(dir);const a=await store.save('宇宙基地',data);const b=await store.save('宇宙基地',{...data,night:1});assert.equal(a.filename,'宇宙基地.001.scene.json');assert.equal(b.filename,'宇宙基地.002.scene.json');assert.equal((await store.load(a.filename)).night,0);assert.equal((await store.load(b.filename)).night,1);assert.equal((await createSceneStore(dir).save('宇宙基地',data)).filename,'宇宙基地.003.scene.json');assert.equal((await store.list()).length,3);});
test('concurrent saves allocate different files and strip unknown binary payloads',async t=>{const dir=await temporary(t),store=createSceneStore(dir);const results=await Promise.all(Array.from({length:8},()=>store.save('backup',{...data,binary:'data:secret'})));assert.equal(new Set(results.map(r=>r.filename)).size,8);assert.equal((await readFile(path.join(dir,results[0].filename),'utf8')).includes('secret'),false);});
test('invalid names and payloads cannot write outside scenes',async t=>{const dir=await temporary(t),store=createSceneStore(dir);for(const name of ['../bad','C:\\bad','a/b','CON','', 'a'.repeat(65)])assert.throws(()=>sceneName(name));await assert.rejects(store.save('bad',{}));await assert.rejects(store.load('../bad.json'));assert.equal((await store.list()).length,0);});
test('HTTP save, list and load round trip; reject cross-origin writes',async t=>{const dir=await temporary(t),server=createApp(dir);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));const base=`http://127.0.0.1:${server.address().port}`;
 const send=(origin=base)=>fetch(`${base}/api/scenes`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({name:'sample',scene:data})});
 assert.equal((await send('https://other.example')).status,403);const response=await send();assert.equal(response.status,201);const saved=await response.json();const list=await (await fetch(`${base}/api/scenes`)).json();assert.equal(list.length,1);assert.deepEqual(await (await fetch(`${base}/api/scenes/${saved.filename}`)).json(),data);
});
