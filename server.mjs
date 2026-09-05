import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSceneStore} from './scene-store.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png'};
export function createApp(directory=root){
  const store=createSceneStore(path.join(directory,'scenes'));
  return http.createServer(async(req,res)=>{
    const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    try{
      const host=req.headers.host||'';
      if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host))return json(403,{error:'ローカル接続のみ使用できます。'});
      const url=decodeURIComponent(new URL(req.url,`http://${host}`).pathname);
      if(url.startsWith('/api/')){
        if(req.headers.origin&&req.headers.origin!==`http://${host}`)return json(403,{error:'別サイトからは操作できません。'});
        if(req.method==='GET'&&url==='/api/scenes')return json(200,await store.list());
        if(req.method==='GET'&&url.startsWith('/api/scenes/'))return json(200,await store.load(url.slice('/api/scenes/'.length)));
        if(req.method==='POST'&&url==='/api/scenes'){
          if(req.headers['content-type']?.split(';')[0]!=='application/json')return json(415,{error:'JSON形式で送信してください。'});
          const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2_000_000)return json(413,{error:'設定ファイルは2MB以下にしてください。'});chunks.push(chunk);}
          const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));return json(201,await store.save(body.name,body.scene));
        }
        return json(405,{error:'未対応の操作です。'});
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return json(405,{error:'未対応の操作です。'});
      const file=path.resolve(directory,'.'+(url==='/'?'/index.html':url));
      if(!file.startsWith(directory+path.sep)||path.relative(directory,file).split(path.sep).some(p=>p.startsWith('.')))return json(403,{error:'アクセスできません。'});
      const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:body);
    }catch(e){json(e.code==='ENOENT'?404:400,{error:e.code==='ENOENT'?'ファイルが見つかりません。':e.code==='EACCES'||e.code==='EPERM'?'scenes フォルダーへ書き込めません。サーバーの権限を確認してください。':e.message});}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))createApp().listen(4173,'127.0.0.1',()=>console.log('AURELIA ready: http://127.0.0.1:4173'));
