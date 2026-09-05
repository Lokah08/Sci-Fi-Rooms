// Placement-only format. No GLB bytes, texture images or executable scripts.
export function validateScene(data,ids){
  const vector=(v,min,max)=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&n>=min&&n<=max);
  if(!data||data.format!=='aurelia-editor'||data.version!==1||!Array.isArray(data.objects))throw Error('AURELIAのシーン設定（version 1）ではありません。');
  if(data.objects.length!==ids.size)throw Error('シーンのオブジェクト数が一致しません。同じサンプルとアセットを使用してください。');
  if(!data.player||!vector(data.player.position,-220,220)||data.player.position[1]!==0||!Number.isFinite(data.player.yaw)||Math.abs(data.player.yaw)>Math.PI*2)throw Error('プレーヤー開始位置が不正です。');
  if(data.night!==0&&data.night!==1)throw Error('昼夜設定が不正です。');
  const seen=new Set();
  for(const o of data.objects){
    if(!o||!ids.has(o.id)||seen.has(o.id))throw Error('不明または重複したオブジェクトIDです。');seen.add(o.id);
    if(!vector(o.position,-1000,1000)||!vector(o.rotation,-Math.PI*2,Math.PI*2)||!vector(o.scale,.05,20)||typeof o.visible!=='boolean'||typeof o.solid!=='boolean')throw Error('オブジェクトの変換値が不正です。');
    if(o.intensity!==undefined&&(!Number.isFinite(o.intensity)||o.intensity<0||o.intensity>500))throw Error('照明の強さが不正です。');
  }
  return data;
}

export function movement(yaw,forward,side,dt,fast=false){
  const length=Math.hypot(forward,side);if(!length)return [0,0];
  const step=(fast?6:2.7)*Math.min(dt,.05)/length;
  return [(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*step,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*step];
}
export function isBlocked(x,z,bounds){return Math.abs(x)>220||Math.abs(z)>220||bounds.some(b=>x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ);}
