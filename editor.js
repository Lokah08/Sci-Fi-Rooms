import {OrbitControls} from './vendor/OrbitControls.js';
import {TransformControls} from './vendor/TransformControls.js';
import {validateScene,movement,isBlocked} from './scene-format.js';

export function createEditor({THREE,scene,camera,canvas,records,staticColliders,terrainHeight,getNight,setNight,failures}){
  const $=id=>document.getElementById(id);
  let playing=false,selected=null,bounds=[],savedView=null,playNight=0,coffee=false,complete=false,doorOpen=true;
  let yaw=.52,pitch=-.045,drag=false,dragStart=null,toastUntil=0,dirty=false;
  const keys=new Set(),undo=[],redo=[];
  const player={position:[4.9,0,4.1],yaw:.52};
  camera.position.set(6,2.8,5.2);
  const orbit=new OrbitControls(camera,canvas);orbit.target.set(-1,1.2,-3);orbit.enableDamping=true;orbit.dampingFactor=.12;orbit.maxDistance=180;orbit.minDistance=.5;orbit.update();
  const gizmo=new TransformControls(camera,canvas);gizmo.setSize(.75);scene.add(gizmo.getHelper());
  const outline=new THREE.BoxHelper(undefined,0xf0d3a9);outline.visible=false;scene.add(outline);
  const spawn=new THREE.Group();spawn.name='プレーヤー開始位置';
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.23,.95,4,10),new THREE.MeshBasicMaterial({color:'#8ee3d3',wireframe:true}));body.position.y=.95;spawn.add(body);
  const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(0,.1,0),1.1,0x8ee3d3);spawn.add(arrow);scene.add(spawn);
  const markerRecord={id:'player',name:'プレーヤー開始位置',object:spawn,category:'player',solid:false};
  const door=new THREE.Mesh(new THREE.BoxGeometry(.2,3.4,2.7),new THREE.MeshStandardMaterial({color:'#466268',metalness:.5,roughness:.5}));door.position.set(8,1.7,-.2);door.visible=false;scene.add(door);
  const terminal=records.find(r=>r.name==='coffee_machine_001');
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),center=new THREE.Vector3(),direction=new THREE.Vector3();
  records.sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
  const recordMap=new Map(records.map(r=>[r.id,r]));
  const initial=snapshot();
  function notify(message){$('editor-message').textContent=message;toastUntil=performance.now()+5000;}
  function syncSpawn(){spawn.position.fromArray(player.position);spawn.rotation.set(0,player.yaw,0);spawn.scale.setScalar(1);}
  function snapshot(){return {format:'aurelia-editor',version:1,night:getNight(),player:{position:[...player.position],yaw:player.yaw},objects:records.map(r=>({id:r.id,position:r.object.position.toArray(),rotation:[r.object.rotation.x,r.object.rotation.y,r.object.rotation.z],scale:r.object.scale.toArray(),visible:r.object.visible,solid:r.solid,...(r.object.isLight?{intensity:r.object.intensity}:{})}))};}
  function apply(data){
    validateScene(data,new Set(recordMap.keys()));
    for(const v of data.objects){const r=recordMap.get(v.id);r.object.position.fromArray(v.position);r.object.rotation.set(...v.rotation);r.object.scale.fromArray(v.scale);r.object.visible=v.visible;r.solid=v.solid;if(r.object.isLight&&v.intensity!==undefined)r.object.intensity=v.intensity;}
    player.position=[...data.player.position];player.yaw=data.player.yaw;setNight(data.night);syncSpawn();refreshInspector();rebuildBounds();
  }
  function remember(){undo.push(snapshot());if(undo.length>40)undo.shift();redo.length=0;dirty=true;}
  function rebuildBounds(){
    scene.updateMatrixWorld(true);bounds=[...staticColliders];
    for(const r of records){if(!r.solid||!r.object.visible||r.object.isLight)continue;const b=new THREE.Box3().setFromObject(r.object);if(b.max.y<.15||b.min.y>1.7)continue;bounds.push({minX:b.min.x-.24,maxX:b.max.x+.24,minZ:b.min.z-.24,maxZ:b.max.z+.24});}
    if(!doorOpen)bounds.push({minX:7.66,maxX:8.34,minZ:-1.79,maxZ:1.39});
  }
  function list(){
    const filter=$('object-filter').value;const entries=[markerRecord,...records.filter(r=>filter==='all'||r.category===filter)];
    $('object-list').replaceChildren(...entries.map(r=>{const option=document.createElement('option');option.value=r.id;option.textContent=r.name;return option;}));
    if(selected&&entries.includes(selected))$('object-list').value=selected.id;else $('object-list').selectedIndex=-1;
    $('object-count').textContent=`${records.length} OBJECTS`;
  }
  function select(r){selected=r;outline.visible=!!r&&r.category!=='light';gizmo.detach();if(r){gizmo.attach(r.object);if(r===markerRecord)gizmo.setMode('translate');if(outline.visible)outline.setFromObject(r.object);}list();refreshInspector();}
  function refreshInspector(){
    $('selection-name').textContent=selected?.name||'オブジェクトを選択';$('inspector-fields').disabled=!selected;
    if(!selected)return;const o=selected.object;
    for(const [type,values] of Object.entries({position:o.position.toArray(),rotation:[o.rotation.x,o.rotation.y,o.rotation.z].map(THREE.MathUtils.radToDeg),scale:o.scale.toArray()}))values.forEach((v,i)=>{const input=$(`${type}-${i}`);input.value=v.toFixed(3);input.disabled=selected===markerRecord&&(type==='scale'||(type==='position'&&i===1)||(type==='rotation'&&i!==1));});
    $('solid').checked=selected.solid;$('solid').disabled=selected===markerRecord||o.isLight;
    $('object-visible').checked=o.visible;$('object-visible').disabled=selected===markerRecord;
    $('light-strength').disabled=!o.isLight;$('light-strength').value=o.isLight?o.intensity:0;
    $('player-yaw').value=THREE.MathUtils.radToDeg(player.yaw).toFixed(1);
  }
  function sanitize(){if(!selected)return;const o=selected.object;for(const a of ['x','y','z']){o.scale[a]=THREE.MathUtils.clamp(o.scale[a],.05,20);o.rotation[a]=THREE.MathUtils.euclideanModulo(o.rotation[a]+Math.PI,Math.PI*2)-Math.PI;o.position[a]=THREE.MathUtils.clamp(o.position[a],-1000,1000);}if(selected===markerRecord){o.position.x=THREE.MathUtils.clamp(o.position.x,-220,220);o.position.z=THREE.MathUtils.clamp(o.position.z,-220,220);o.position.y=0;player.position=o.position.toArray();player.yaw=o.rotation.y;syncSpawn();}refreshInspector();}
  function focus(){if(!selected)return;const b=new THREE.Box3().setFromObject(selected.object);const c=selected.object.isLight?selected.object.position.clone():b.getCenter(new THREE.Vector3());const distance=selected.object.isLight?3:Math.max(2,b.getSize(new THREE.Vector3()).length()*1.3);camera.position.copy(c).add(new THREE.Vector3(1,.65,1).normalize().multiplyScalar(distance));orbit.target.copy(c);orbit.update();}
  gizmo.addEventListener('dragging-changed',e=>{orbit.enabled=!e.value&&!playing;if(e.value)remember();else sanitize();});
  gizmo.addEventListener('objectChange',()=>{if(selected){sanitize();if(outline.visible)outline.setFromObject(selected.object);}});
  $('object-filter').onchange=list;$('object-list').onchange=()=>select($('object-list').value==='player'?markerRecord:recordMap.get($('object-list').value));
  document.querySelectorAll('[data-transform]').forEach(b=>b.onclick=()=>{if(selected===markerRecord&&b.dataset.transform==='scale')return;gizmo.setMode(b.dataset.transform);document.querySelectorAll('[data-transform]').forEach(x=>x.classList.toggle('active',x===b));});
  for(const type of ['position','rotation','scale'])for(let i=0;i<3;i++)$(`${type}-${i}`).onchange=e=>{if(!selected)return;const value=Number(e.target.value);if(!Number.isFinite(value)){refreshInspector();return;}remember();selected.object[type][['x','y','z'][i]]=type==='rotation'?THREE.MathUtils.degToRad(value):value;sanitize();};
  $('solid').onchange=()=>{if(selected){remember();selected.solid=$('solid').checked;}};
  $('object-visible').onchange=()=>{if(selected){remember();selected.object.visible=$('object-visible').checked;}};
  $('light-strength').onchange=()=>{if(selected?.object.isLight){remember();selected.object.intensity=THREE.MathUtils.clamp(Number($('light-strength').value)||0,0,500);refreshInspector();}};
  $('focus-object').onclick=focus;
  $('toggle-panel').onclick=()=>document.body.classList.toggle('panel-closed');
  $('apply-transform').onclick=()=>{if(!selected)return;const values={};for(const type of ['position','rotation','scale']){values[type]=[0,1,2].map(i=>Number($(`${type}-${i}`).value));if(values[type].some(v=>!Number.isFinite(v))){notify('数値を入力してください。');return;}}remember();selected.object.position.fromArray(values.position);selected.object.rotation.set(...values.rotation.map(THREE.MathUtils.degToRad));selected.object.scale.fromArray(values.scale);sanitize();notify('変換値を適用しました');};
  $('select-player').onclick=()=>select(markerRecord);
  $('player-yaw').onchange=()=>{remember();player.yaw=THREE.MathUtils.degToRad(THREE.MathUtils.clamp(Number($('player-yaw').value)||0,-180,180));syncSpawn();refreshInspector();};
  $('undo').onclick=()=>{if(playing||!undo.length)return;redo.push(snapshot());apply(undo.pop());dirty=true;notify('編集を元に戻しました');};
  $('redo').onclick=()=>{if(playing||!redo.length)return;undo.push(snapshot());apply(redo.pop());dirty=true;notify('編集をやり直しました');};
  let dialogMode='save',savedFiles=[];
  async function requestScenes(url,options){const response=await fetch(url,options);let result;try{result=await response.json();}catch{throw Error('保存用サーバーを起動し直してください（Start.bat）。');}if(!response.ok)throw Error(result.error||'保存用サーバーに接続できません。');return result;}
  async function refreshFiles(){const selectedFile=$('saved-scenes').value;savedFiles=await requestScenes('/api/scenes');$('saved-scenes').replaceChildren(...savedFiles.map(file=>{const option=document.createElement('option');option.value=file.filename;option.textContent=`${file.filename}  /  ${new Date(file.modified).toLocaleString('ja-JP')}`;return option;}));if(savedFiles.some(f=>f.filename===selectedFile))$('saved-scenes').value=selectedFile;else $('saved-scenes').selectedIndex=savedFiles.length?0:-1;}
  async function openSceneDialog(mode){dialogMode=mode;$('scene-dialog-title').textContent=mode==='save'?'名前を付けてシーンを保存':'バックアップから開く';$('save-name-label').hidden=mode!=='save';$('save-explanation').hidden=mode!=='save';$('scene-confirm').textContent=mode==='save'?'連番で保存':'選択した設定を開く';$('scene-dialog-status').textContent='一覧を読み込んでいます…';$('scene-dialog').showModal();try{await refreshFiles();$('scene-dialog-status').textContent=savedFiles.length?'GLB本体は保存ファイルに含まれません。':'保存済みのバックアップはまだありません。';}catch(e){$('scene-dialog-status').textContent=e.message;}}
  $('save-scene').onclick=()=>openSceneDialog('save');$('load-scene').onclick=()=>openSceneDialog('open');
  $('scene-cancel').onclick=()=>$('scene-dialog').close();
  $('scene-refresh').onclick=async()=>{try{await refreshFiles();$('scene-dialog-status').textContent='一覧を更新しました';}catch(e){$('scene-dialog-status').textContent=e.message;}};
  $('saved-scenes').onchange=()=>{const file=savedFiles.find(f=>f.filename===$('saved-scenes').value);if(file)$('scene-name').value=file.name;};
  $('scene-import').onclick=()=>{$('scene-dialog').close();$('scene-file').click();};
  $('scene-confirm').onclick=async()=>{
    $('scene-confirm').disabled=true;
    try{
      if(dialogMode==='save'){
        const data=snapshot();validateScene(data,new Set(recordMap.keys()));$('scene-dialog-status').textContent='保存しています…';
        const result=await requestScenes('/api/scenes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('scene-name').value,scene:data})});
        if(JSON.stringify(snapshot())===JSON.stringify(data))dirty=false;
        $('saved-path').textContent=`保存済み：${result.path}`;$('scene-dialog').close();notify(`${result.path} に保存しました`);
      }else{
        const filename=$('saved-scenes').value;if(!filename)throw Error('バックアップを選択してください。');
        const data=validateScene(await requestScenes(`/api/scenes/${encodeURIComponent(filename)}`),new Set(recordMap.keys()));
        if(playing)throw Error('編集モードで読み込んでください。');remember();apply(data);dirty=false;
        const file=savedFiles.find(f=>f.filename===filename);if(file)$('scene-name').value=file.name;
        $('saved-path').textContent=`読み込み元：scenes/${filename}`;$('scene-dialog').close();notify(`${filename} を読み込みました（元に戻す操作も可能です）`);
      }
    }catch(e){$('scene-dialog-status').textContent=`処理できません：${e.message}`;}finally{$('scene-confirm').disabled=false;}
  };
  $('scene-file').onchange=async()=>{const file=$('scene-file').files[0];if(!file)return;try{if(file.size>2_000_000)throw Error('設定ファイルは2MB以下にしてください。');const data=validateScene(JSON.parse(await file.text()),new Set(recordMap.keys()));if(playing)return;remember();apply(data);notify('シーン設定を読み込みました');}catch(e){notify(`読み込みできません：${e.message}`);}finally{$('scene-file').value='';}};
  $('reset-scene').onclick=()=>{remember();apply(initial);notify('サンプル配置に戻しました（元に戻す操作も可能です）');};

  function spawnPlayer(){rebuildBounds();const [x,,z]=player.position;if(isBlocked(x,z,bounds)){notify('開始位置が壁や家具に重なっています。プレーヤーを移動してください。');return false;}camera.position.set(x,1.68,z);yaw=player.yaw;pitch=-.045;camera.rotation.set(pitch,yaw,0);return true;}
  function play(){if(playing)return;savedView={position:camera.position.clone(),quaternion:camera.quaternion.clone(),target:orbit.target.clone()};if(!spawnPlayer())return;playNight=getNight();playing=true;coffee=false;complete=false;doorOpen=true;door.visible=false;keys.clear();orbit.enabled=false;gizmo.detach();gizmo.enabled=false;outline.visible=false;spawn.visible=false;document.body.classList.add('playing');$('play').hidden=true;$('stop').hidden=false;$('mission').hidden=false;$('hint').textContent='ドラッグで見回す · WASDで移動 · Eで調べる';notify('プレイ開始：コーヒーを用意して、基地の外へ出よう。');}
  function stop(){if(!playing)return;playing=false;keys.clear();drag=false;document.exitPointerLock?.();doorOpen=true;door.visible=false;setNight(playNight);camera.position.copy(savedView.position);camera.quaternion.copy(savedView.quaternion);orbit.target.copy(savedView.target);orbit.enabled=true;orbit.update();gizmo.enabled=true;spawn.visible=true;document.body.classList.remove('playing');$('play').hidden=false;$('stop').hidden=true;$('mission').hidden=true;$('interaction').hidden=true;select(selected);notify('編集に戻りました。プレイ中の状態はリセットしました。');}
  $('play').onclick=play;$('stop').onclick=stop;
  $('home').onclick=()=>{if(playing)spawnPlayer();else{camera.position.set(6,2.8,5.2);orbit.target.set(-1,1.2,-3);orbit.update();}};
  $('walk').onclick=()=>{if(!playing)play();if(playing)canvas.requestPointerLock?.()?.catch(()=>notify('マウス固定に未対応です。ドラッグで見回せます。'));};
  function interaction(){
    camera.getWorldDirection(direction);
    const candidates=[{id:'door',position:new THREE.Vector3(8,1.5,-.2),label:doorOpen?'E · エアロックを閉める':'E · エアロックを開ける'}];
    if(terminal?.object.visible)candidates.push({id:'coffee',position:new THREE.Box3().setFromObject(terminal.object).getCenter(new THREE.Vector3()),label:coffee?'E · コーヒーを調べる':'E · コーヒーを淹れる'});
    return candidates.filter(c=>{const delta=c.position.clone().sub(camera.position);const distance=delta.length();if(distance>2.6||direction.dot(delta.normalize())<.35)return false;ray.set(camera.position,delta);ray.far=Math.max(0,distance-.3);const obstacles=records.filter(r=>r.solid&&r.object.visible&&r!==terminal).map(r=>r.object);return ray.intersectObjects(obstacles,true).length===0;}).sort((a,b)=>a.position.distanceToSquared(camera.position)-b.position.distanceToSquared(camera.position))[0];
  }
  function interact(){const target=interaction();if(!target)return;if(target.id==='coffee'){coffee=true;notify('温かいコーヒーを受け取りました。外の星空を見に行こう。');}else{if(doorOpen&&Math.abs(camera.position.x-8)<.6&&Math.abs(camera.position.z+.2)<1.8){notify('出入口から少し離れてから閉めてください。');return;}doorOpen=!doorOpen;door.visible=!doorOpen;rebuildBounds();notify(doorOpen?'エアロックを開けました':'エアロックを閉めました');}}
  document.addEventListener('pointerlockchange',()=>{document.body.classList.toggle('locked',document.pointerLockElement===canvas);keys.clear();});
  canvas.addEventListener('pointerdown',e=>{dragStart=[e.clientX,e.clientY];if(playing&&e.button===0){drag=true;canvas.setPointerCapture(e.pointerId);}});
  canvas.addEventListener('pointerup',e=>{drag=false;if(!playing&&dragStart&&!gizmo.axis&&Math.hypot(e.clientX-dragStart[0],e.clientY-dragStart[1])<4){const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);ray.far=300;const hit=ray.intersectObjects(records.filter(r=>r.object.visible&&!r.object.isLight).map(r=>r.object),true)[0];if(hit){let object=hit.object;while(object&&object.parent!==scene)object=object.parent;select(records.find(r=>r.object===object));}}dragStart=null;});
  canvas.addEventListener('lostpointercapture',()=>drag=false);
  document.addEventListener('pointermove',e=>{if(playing&&(drag||document.pointerLockElement===canvas)){yaw-=e.movementX*.0022;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.0022,-1.35,1.35);}});
  document.addEventListener('keydown',e=>{if(e.target instanceof HTMLElement&&e.target.closest('input,select,textarea'))return;if(playing){if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}if(e.code==='KeyE'&&!e.repeat)interact();if(e.code==='KeyN'&&!e.repeat)setNight(1-getNight());}else if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){e.preventDefault();(e.shiftKey?$('redo'):$('undo')).click();}else if(e.code==='KeyF')focus();});
  document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();drag=false;});
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  syncSpawn();list();rebuildBounds();$('editor-shell').hidden=false;$('play').disabled=false;
  if(failures.length)notify('一部のGLBがありません。READMEの手順で配置してください。');
  return {setNight(v){if(!playing)remember();setNight(v);},update(dt){
    if(!playing){orbit.update();if(selected&&outline.visible)outline.setFromObject(selected.object);return;}
    const f=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),s=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    const [dx,dz]=movement(yaw,f,s,dt,keys.has('ShiftLeft')||keys.has('ShiftRight'));
    if(!isBlocked(camera.position.x+dx,camera.position.z,bounds))camera.position.x+=dx;if(!isBlocked(camera.position.x,camera.position.z+dz,bounds))camera.position.z+=dz;
    const inside=Math.abs(camera.position.x)<8.3&&Math.abs(camera.position.z)<6.7;
    const walkway=camera.position.x>=8&&camera.position.x<=11.6&&Math.abs(camera.position.z+.2)<1.5;
    camera.position.y=1.68+(inside||walkway?0:terrainHeight(camera.position.x,camera.position.z));camera.rotation.set(pitch,yaw,0);
    $('location').textContent=inside?'01 / 居住ラウンジ':'02 / 惑星の砂丘';
    if(coffee&&!inside&&!complete){complete=true;notify('ミッション完了。コーヒーと一緒に、星空でひと息。');}
    $('mission').textContent=complete?'✓ ミッション完了 — 星の下でひと息':coffee?'02 / エアロックから基地の外へ出る':'01 / コーヒーマシンを探して E で調べる';
    const target=interaction();$('interaction').hidden=!target;$('interaction').textContent=target?.label||'';
    if(performance.now()>toastUntil)$('editor-message').textContent='';
  }};
}
