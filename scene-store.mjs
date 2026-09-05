import {mkdir,readdir,readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {validateScene} from './scene-format.js';
export function sceneName(value){
  const name=typeof value==='string'?value.trim():'';
  if(!/^[\p{L}\p{N}_ -]{1,64}$/u.test(name)||/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(name))throw Error('名前は64文字以内の文字・数字・空白・ハイフン・下線で入力してください。');
  return name;
}
const filePattern=/^([\p{L}\p{N}_ -]{1,64})\.(\d{3,})\.scene\.json$/u;
export function cleanScene(data){
  if(!Array.isArray(data?.objects)||data.objects.length>2000)throw Error('シーン設定が不正です。');
  validateScene(data,new Set(data.objects.map(o=>o?.id)));
  for(const o of data.objects)if(typeof o.id!=='string'||o.id.length>100)throw Error('オブジェクトIDが不正です。');
  return {format:data.format,version:data.version,night:data.night,player:{position:data.player.position,yaw:data.player.yaw},objects:data.objects.map(o=>({id:o.id,position:o.position,rotation:o.rotation,scale:o.scale,visible:o.visible,solid:o.solid,...(o.intensity===undefined?{}:{intensity:o.intensity})}))};
}
export function createSceneStore(directory){
  return {
    async list(){await mkdir(directory,{recursive:true});const names=(await readdir(directory)).filter(n=>filePattern.test(n));return (await Promise.all(names.map(async filename=>{const info=await stat(path.join(directory,filename));return {filename,name:filename.match(filePattern)[1],modified:info.mtime.toISOString(),bytes:info.size};}))).sort((a,b)=>b.modified.localeCompare(a.modified)||b.filename.localeCompare(a.filename,undefined,{numeric:true}));},
    async save(value,data){const name=sceneName(value),content=JSON.stringify(cleanScene(data),null,2)+'\n';await mkdir(directory,{recursive:true});const files=await readdir(directory);let number=files.reduce((max,file)=>{const match=file.match(filePattern);return match&&match[1].toLowerCase()===name.toLowerCase()?Math.max(max,Number(match[2])):max;},0)+1;
      for(let attempt=0;attempt<100;attempt++,number++){const filename=`${name}.${String(number).padStart(3,'0')}.scene.json`;try{await writeFile(path.join(directory,filename),content,{flag:'wx'});return {filename,path:`scenes/${filename}`};}catch(e){if(e.code!=='EEXIST')throw e;}}throw Error('同時保存が多いため保存できませんでした。もう一度お試しください。');},
    async load(filename){if(!filePattern.test(filename))throw Error('ファイル名が不正です。');return cleanScene(JSON.parse(await readFile(path.join(directory,filename),'utf8')));}
  };
}
